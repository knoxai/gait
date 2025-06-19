package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/knoxai/gait/internal/ades"
	"github.com/knoxai/gait/internal/ades/mcp"
	"github.com/knoxai/gait/internal/api"
	"github.com/knoxai/gait/internal/git"
	"github.com/knoxai/gait/internal/web"
	"github.com/knoxai/gait/internal/webhooks"
	// "github.com/knoxai/gait/internal/graphql"  // Temporarily disabled due to network issues
	"github.com/knoxai/gait/internal/docs"
	"github.com/knoxai/gait/internal/ai"
	"github.com/knoxai/gait/pkg/types"
	"github.com/knoxai/gait/internal/ades/config"
	"github.com/gorilla/mux"
)

func main() {
	var (
		port      = flag.String("port", "8080", "Port to run the server on")
		repo      = flag.String("repo", "", "Path to the Git repository (optional, will discover repos if not provided)")
		workspace = flag.String("workspace", ".", "Workspace path to discover repositories")
		demoSprint2 = flag.Bool("demo-sprint2", false, "Run ADES Sprint 2 demo")
	)
	flag.Parse()

	// Check if demo is requested
	if *demoSprint2 {
		ades.RunSprint2Demo()
		return
	}

	var gitService *git.Service
	var repositories []types.Repository

	// Initialize repository manager
	workspacePath, err := filepath.Abs(*workspace)
	if err != nil {
		log.Fatalf("Invalid workspace path: %v", err)
	}
	
	repoManager := api.NewRepositoryManager(workspacePath)
	if err := repoManager.LoadRepositories(); err != nil {
		log.Printf("Warning: Failed to load saved repositories: %v", err)
	}

	if *repo != "" {
		// Single repository mode - add to manager if not already present
		repoPath, err := filepath.Abs(*repo)
		if err != nil {
			log.Fatalf("Invalid repository path: %v", err)
		}

		// Check if it's a valid Git repository
		if _, err := os.Stat(filepath.Join(repoPath, ".git")); os.IsNotExist(err) {
			log.Fatalf("Not a Git repository: %s", repoPath)
		}

		// Add to repository manager
		if err := repoManager.AddRepository(repoPath); err != nil {
			log.Printf("Warning: Failed to add repository to manager: %v", err)
		}

		gitService = git.NewService(repoPath)
		repositories = []types.Repository{{Name: filepath.Base(repoPath), Path: repoPath}}
	} else {
		// Multi-repository mode - only use explicitly managed repositories
		repositories = repoManager.GetRepositories()
		if len(repositories) == 0 {
			log.Printf("No managed repositories found. Use the web interface to add repositories.")
			// Don't create any git service - let the frontend handle the empty state
			gitService = nil
		} else {
			// Default to first repository and set it as current in the manager
			firstRepoPath := repositories[0].Path
			var err error
			gitService, err = repoManager.SwitchRepository(firstRepoPath)
			if err != nil {
				log.Printf("Warning: Failed to set default repository: %v", err)
				gitService = nil
			} else {
				// Update repositories list to get the current marking
				repositories = repoManager.GetRepositories()
				log.Printf("Found %d managed repositories, defaulting to: %s", len(repositories), repositories[0].Name)
			}
		}
	}

	// Initialize ADES service if enabled
	var adesService *ades.Service
	var adesHandler *api.ADESHandler
	var mcpServer *mcp.MCPServer
	
	// Load ADES configuration
	adesConfig, err := config.LoadConfig(config.GetConfigPath())
	if err != nil {
		log.Printf("Warning: Failed to load ADES config, using defaults: %v", err)
		adesConfig = config.DefaultConfig()
	}
	
	// Validate configuration
	if err := adesConfig.Validate(); err != nil {
		log.Printf("Warning: ADES configuration is invalid: %v", err)
	}
	
	if gitService != nil {
		log.Println("Initializing ADES service...")
		adesService, err = ades.NewService(gitService, adesConfig)
		if err != nil {
			log.Printf("Warning: Failed to initialize ADES service: %v", err)
		} else {
			adesHandler = api.NewADESHandler(adesService)
			log.Println("ADES service initialized successfully")
			
			// Initialize MCP server for Sprint 3
			log.Println("Initializing MCP server...")
			mcpServer = mcp.NewMCPServer(adesService)
			log.Println("MCP server initialized successfully")
		}
	}

	// Create web server and handlers with optimized architecture
	var repoName string
	if gitService != nil {
		repoName = filepath.Base(gitService.GetRepoPath())
	} else {
		repoName = "No Repository Selected"
	}
	webServer := web.NewServer(repoName)
	apiHandler := api.NewHandler(gitService, repositories, webServer)
	
	// Initialize WebSocket hub for real-time dashboard updates
	var dashboardHub *web.DashboardHub
	if adesService != nil {
		dashboardHub = web.NewDashboardHub(adesService)
		go dashboardHub.Run()
		log.Println("Dashboard WebSocket hub initialized")
	}
	
	// Initialize webhook handler for Sprint 7 integration
	var webhookHandler *webhooks.WebhookHandler
	if adesService != nil {
		webhookSecret := os.Getenv("ADES_WEBHOOK_SECRET")
		webhookHandler = webhooks.NewWebhookHandler(adesService, webhookSecret)
		log.Println("Webhook handler initialized")
	}
	
	// Initialize GraphQL API for Sprint 7 integration (temporarily disabled)
	// var graphqlHandler *graphql.GraphQLHandler
	// if adesService != nil {
	// 	graphqlService, err := graphql.NewGraphQLService(adesService)
	// 	if err != nil {
	// 		log.Printf("Failed to initialize GraphQL service: %v", err)
	// 	} else {
	// 		graphqlHandler = graphql.NewGraphQLHandler(graphqlService)
	// 		log.Println("GraphQL API initialized")
	// 	}
	// }
	
	// Initialize API documentation portal for Sprint 7
	baseURL := fmt.Sprintf("http://localhost:%s", *port)
	docsHandler := docs.NewAPIDocsHandler(baseURL)
	log.Println("API documentation portal initialized")
	
	// Initialize AI Service for Sprint 8
	aiService := ai.NewAIService()
	var aiHandlers *api.AIHandlers
	if aiService.IsEnabled() {
		aiHandlers = api.NewAIHandlers(aiService)
		log.Println("AI Service initialized with advanced capabilities")
	} else {
		log.Println("AI Service disabled - configure OPENAI_API_KEY to enable")
	}
	
	// Create router for better route management
	router := mux.NewRouter()
	
	// Repository management endpoints
	router.HandleFunc("/api/repositories", repoManager.HandleGetRepositories).Methods("GET")
	router.HandleFunc("/api/repositories/add", repoManager.HandleAddRepository).Methods("POST")
	router.HandleFunc("/api/repositories/clone", repoManager.HandleCloneRepository).Methods("POST")
	router.HandleFunc("/api/repositories/remove", repoManager.HandleRemoveRepository).Methods("DELETE")
	router.HandleFunc("/api/repositories/discover", repoManager.HandleDiscoverRepositories).Methods("POST")
	
	// Enhanced repository switching with manager integration
	router.HandleFunc("/api/repository/switch", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Path string `json:"path"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		// Use repository manager to switch
		newGitService, err := repoManager.SwitchRepository(req.Path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Update the main git service and handlers
		gitService = newGitService
		apiHandler.SetGitService(gitService)
		webServer.UpdateRepoName(gitService.GetRepoPath())

		// Update repositories list
		repositories = repoManager.GetRepositories()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}).Methods("POST")

	// Clear current repository selection
	router.HandleFunc("/api/repository/clear", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Clear the current git service
		gitService = nil
		apiHandler.SetGitService(nil)
		webServer.UpdateRepoName("No Repository Selected")
		
		// Clear current repository in manager
		repoManager.ClearCurrentRepository()
		
		// Update repositories list
		repositories = repoManager.GetRepositories()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}).Methods("POST")
	
	// API endpoints
	router.HandleFunc("/api/all", apiHandler.GetAllData)
	router.HandleFunc("/api/commits", apiHandler.GetCommits)
	router.HandleFunc("/api/commits/html", apiHandler.GetCommitsHTML)
	router.HandleFunc("/api/branches", apiHandler.GetBranches)
	router.HandleFunc("/api/tags", apiHandler.GetTags)
	router.HandleFunc("/api/commits/tag/{tag}", apiHandler.GetCommitsByTag)
	router.HandleFunc("/api/commits/tag/{tag}/html", apiHandler.GetCommitsByTagHTML)
	router.HandleFunc("/api/stashes", apiHandler.GetStashes)
	router.HandleFunc("/api/remotes", apiHandler.GetRemotes)
	router.HandleFunc("/api/commit/create", apiHandler.CreateCommit).Methods("POST")
	router.HandleFunc("/api/commit/{hash}", apiHandler.GetCommitDetails)
	router.HandleFunc("/api/diff", apiHandler.GetFileDiff)
	router.HandleFunc("/api/file-content", apiHandler.GetFileContent)
	router.HandleFunc("/api/file-content/save", apiHandler.SaveFileContent)
	
	// Branch operations
	router.HandleFunc("/api/branch/checkout", apiHandler.CheckoutBranch)
	router.HandleFunc("/api/branch/create", apiHandler.CreateBranch)
	router.HandleFunc("/api/branch/delete", apiHandler.DeleteBranch)
	router.HandleFunc("/api/branch/merge", apiHandler.MergeBranch)
	router.HandleFunc("/api/branch/rename", apiHandler.RenameBranch)
	router.HandleFunc("/api/branch/reset", apiHandler.ResetBranch)
	router.HandleFunc("/api/branch/rebase", apiHandler.RebaseBranch)
	
	// Tag operations
	router.HandleFunc("/api/tag/create", apiHandler.CreateTag)
	router.HandleFunc("/api/tag/push", apiHandler.PushTag)
	router.HandleFunc("/api/tag/{tag}", apiHandler.DeleteTag).Methods("DELETE")
	router.HandleFunc("/api/tag/{tag}/details", apiHandler.GetTagDetails)
	
	router.HandleFunc("/api/fetch", apiHandler.Fetch)
	
	// Stash operations
	router.HandleFunc("/api/stash/create", apiHandler.CreateStash)
	router.HandleFunc("/api/stash/branch", apiHandler.CreateBranchFromStash)
	router.HandleFunc("/api/stash/apply", apiHandler.ApplyStash)
	router.HandleFunc("/api/stash/pop", apiHandler.PopStash)
	router.HandleFunc("/api/stash/drop", apiHandler.DropStash)
	router.HandleFunc("/api/stash/{stash}", apiHandler.ShowStash)
	
	// Working directory operations
	router.HandleFunc("/api/uncommitted", apiHandler.GetUncommittedChanges)
	router.HandleFunc("/api/stage", apiHandler.StageFile)
	router.HandleFunc("/api/unstage", apiHandler.UnstageFile)
	router.HandleFunc("/api/discard", apiHandler.DiscardFileChanges)
	router.HandleFunc("/api/clean", apiHandler.CleanWorkingDirectory)
	
	// Remote operations
	router.HandleFunc("/api/remote/pull", apiHandler.PullFromRemote)
	router.HandleFunc("/api/remote/push", apiHandler.PushToRemote)
	router.HandleFunc("/api/remote/{remote}/info", apiHandler.GetRemoteInfo)
	
	router.HandleFunc("/api/gait", apiHandler.GetGait)
	router.HandleFunc("/api/settings", apiHandler.GetSettings)
	router.HandleFunc("/api/search", apiHandler.Search)
	
	// ADES API endpoints
	if adesHandler != nil {
		router.HandleFunc("/api/ades/analyze", adesHandler.AnalyzeRepository)
		router.HandleFunc("/api/ades/insights", adesHandler.GetDevelopmentInsights)
		router.HandleFunc("/api/ades/patterns", adesHandler.ExtractReusablePatterns)
		router.HandleFunc("/api/ades/search", adesHandler.SearchExperiences)
		router.HandleFunc("/api/ades/analytics", adesHandler.GetAnalytics)
		router.HandleFunc("/api/ades/metrics", adesHandler.GetRepositoryMetrics)
		router.HandleFunc("/api/ades/dashboard", adesHandler.GetDashboardData)
		router.HandleFunc("/api/ades/similar", adesHandler.GetSimilarImplementations)
		router.HandleFunc("/api/ades/semantic/analyze", adesHandler.AnalyzeCommitSemantics)
		router.HandleFunc("/api/ades/knowledge/query", adesHandler.QueryKnowledgeGraph)
		router.HandleFunc("/api/ades/knowledge/export", adesHandler.ExportKnowledgeGraph)
		
		// MCP endpoints for Sprint 3
		if mcpServer != nil {
			mcpServer.RegisterRoutes(router)
		}
		
		// WebSocket endpoint for real-time dashboard updates
		if dashboardHub != nil {
			router.HandleFunc("/ws/dashboard", dashboardHub.HandleWebSocket)
		}
		
		// Webhook endpoints for Sprint 7 integration
		if webhookHandler != nil {
			router.HandleFunc("/webhooks/github", webhookHandler.HandleGitHubWebhook)
			router.HandleFunc("/webhooks/generic", webhookHandler.HandleGenericWebhook)
		}
		
		// GraphQL endpoint for Sprint 7 integration (temporarily disabled)
		// if graphqlHandler != nil {
		// 	router.HandleFunc("/graphql", graphqlHandler.HandleGraphQL)
		// 	router.HandleFunc("/graphiql", graphqlHandler.HandleGraphiQL)
		// }
	}
	
	// API documentation endpoints for Sprint 7
	router.HandleFunc("/docs", docsHandler.ServeAPIDocs)
	router.HandleFunc("/docs/swagger", docsHandler.ServeSwaggerUI)
	router.HandleFunc("/docs/openapi.json", docsHandler.ServeOpenAPI)
	
	// Sprint 8: AI API endpoints
	if aiHandlers != nil {
		router.HandleFunc("/api/ai/chat", aiHandlers.HandleChat)
		router.HandleFunc("/api/ai/embeddings", aiHandlers.HandleGenerateEmbeddings)
		router.HandleFunc("/api/ai/search", aiHandlers.HandleSemanticSearch)
		router.HandleFunc("/api/ai/predict/debt", aiHandlers.HandlePredictTechnicalDebt)
		router.HandleFunc("/api/ai/predict/bugs", aiHandlers.HandlePredictBugs)
		router.HandleFunc("/api/ai/predict/productivity", aiHandlers.HandleForecastProductivity)
		router.HandleFunc("/api/ai/analyze/commit", aiHandlers.HandleAnalyzeCommitSemantics)
		router.HandleFunc("/api/ai/capabilities", aiHandlers.HandleGetCapabilities)
		router.HandleFunc("/api/ai/metrics", aiHandlers.HandleGetAIMetrics)
		router.HandleFunc("/api/ai/status", aiHandlers.HandleAIStatus)
		router.HandleFunc("/api/ai/conversation/history", aiHandlers.HandleGetConversationHistory)
		router.HandleFunc("/api/ai/conversation/clear", aiHandlers.HandleClearConversationHistory)
		router.HandleFunc("/api/ai/help", aiHandlers.HandleAIHelp)
	}

	// Static files and main page
	router.PathPrefix("/static/").HandlerFunc(webServer.ServeStatic)
	router.HandleFunc("/dashboard", webServer.ServeDashboard)
	router.HandleFunc("/", webServer.ServeIndex)

	// Start server
	fmt.Printf("🌳 GAIT Server Starting (Enhanced + Multi-Repository Support)\n")
	fmt.Printf("Port: %s\n", *port)
	if len(repositories) > 0 {
		fmt.Printf("Repositories: %d managed\n", len(repositories))
		fmt.Printf("Current: %s\n", filepath.Base(gitService.GetRepoPath()))
	} else {
		fmt.Printf("No repositories found - you can add them through the web interface\n")
	}
	fmt.Printf("Performance Features:\n")
	fmt.Printf("  ✓ Server-side rendering for commits\n")
	fmt.Printf("  ✓ Batch API endpoints\n")
	fmt.Printf("  ✓ Concurrent data fetching\n")
	fmt.Printf("  ✓ Multi-repository management\n")
	fmt.Printf("  ✓ Repository cloning support\n")
	fmt.Printf("  ✓ Automatic repository discovery\n")
	fmt.Printf("Advanced Features:\n")
	fmt.Printf("  ✓ ADES AI Development Experience System\n")
	fmt.Printf("  ✓ MCP (Model Context Protocol) Support\n")
	fmt.Printf("  ✓ Real-time Dashboard with WebSocket\n")
	fmt.Printf("  ✓ Webhook Integration\n")
	fmt.Printf("  ✓ API Documentation Portal\n")
	if aiHandlers != nil {
		fmt.Printf("  ✓ AI-Powered Code Analysis\n")
	}
	fmt.Printf("\n🌐 Open http://localhost:%s in your browser\n", *port)
	fmt.Printf("📊 Dashboard: http://localhost:%s/dashboard\n", *port)
	fmt.Printf("📚 API Docs: http://localhost:%s/docs\n", *port)

	log.Fatal(http.ListenAndServe(":"+*port, router))
} 