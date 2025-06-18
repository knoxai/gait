package graphql

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/graphql-go/graphql"
)

// GraphQLHandler handles GraphQL HTTP requests
type GraphQLHandler struct {
	service *GraphQLService
}

// NewGraphQLHandler creates a new GraphQL HTTP handler
func NewGraphQLHandler(service *GraphQLService) *GraphQLHandler {
	return &GraphQLHandler{
		service: service,
	}
}

// GraphQLRequest represents a GraphQL HTTP request
type GraphQLRequest struct {
	Query         string                 `json:"query"`
	Variables     map[string]interface{} `json:"variables"`
	OperationName string                 `json:"operationName"`
}

// GraphQLResponse represents a GraphQL HTTP response
type GraphQLResponse struct {
	Data   interface{}            `json:"data,omitempty"`
	Errors []GraphQLError         `json:"errors,omitempty"`
	Extensions map[string]interface{} `json:"extensions,omitempty"`
}

// GraphQLError represents a GraphQL error
type GraphQLError struct {
	Message    string                 `json:"message"`
	Locations  []GraphQLLocation      `json:"locations,omitempty"`
	Path       []interface{}          `json:"path,omitempty"`
	Extensions map[string]interface{} `json:"extensions,omitempty"`
}

// GraphQLLocation represents a location in a GraphQL query
type GraphQLLocation struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

// ServeHTTP handles GraphQL HTTP requests
func (h *GraphQLHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle preflight requests
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow POST and GET methods
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GraphQLRequest

	if r.Method == http.MethodPost {
		// Parse JSON request body
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.sendErrorResponse(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
	} else {
		// Parse query parameters for GET requests
		req.Query = r.URL.Query().Get("query")
		req.OperationName = r.URL.Query().Get("operationName")
		
		// Parse variables if provided
		if variablesParam := r.URL.Query().Get("variables"); variablesParam != "" {
			if err := json.Unmarshal([]byte(variablesParam), &req.Variables); err != nil {
				h.sendErrorResponse(w, "Invalid variables parameter", http.StatusBadRequest)
				return
			}
		}
	}

	// Validate query
	if req.Query == "" {
		h.sendErrorResponse(w, "Query is required", http.StatusBadRequest)
		return
	}

	// Execute GraphQL query
	result := graphql.Do(graphql.Params{
		Schema:         h.service.GetSchema(),
		RequestString:  req.Query,
		VariableValues: req.Variables,
		OperationName:  req.OperationName,
		Context:        r.Context(),
	})

	// Convert GraphQL result to our response format
	response := GraphQLResponse{
		Data: result.Data,
	}

	// Convert errors
	if len(result.Errors) > 0 {
		response.Errors = make([]GraphQLError, len(result.Errors))
		for i, err := range result.Errors {
			response.Errors[i] = GraphQLError{
				Message: err.Message,
			}
			
			// Convert locations
			if len(err.Locations) > 0 {
				response.Errors[i].Locations = make([]GraphQLLocation, len(err.Locations))
				for j, loc := range err.Locations {
					response.Errors[i].Locations[j] = GraphQLLocation{
						Line:   loc.Line,
						Column: loc.Column,
					}
				}
			}
			
			// Convert path
			if len(err.Path) > 0 {
				response.Errors[i].Path = err.Path
			}
		}
	}

	// Add extensions if available
	if result.Extensions != nil {
		response.Extensions = result.Extensions
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	
	// Set status code based on errors
	statusCode := http.StatusOK
	if len(response.Errors) > 0 && response.Data == nil {
		statusCode = http.StatusBadRequest
	}
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// ServeGraphiQL serves the GraphiQL interface
func (h *GraphQLHandler) ServeGraphiQL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	graphiqlHTML := `
<!DOCTYPE html>
<html>
<head>
    <title>ADES GraphQL API - GraphiQL</title>
    <style>
        body {
            height: 100%;
            margin: 0;
            width: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #graphiql {
            height: 100vh;
        }
        .graphiql-container .title {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
    </style>
    <script crossorigin src="https://unpkg.com/react@17/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
</head>
<body>
    <div id="graphiql">Loading...</div>
    <script src="https://unpkg.com/graphiql/graphiql.min.js"></script>
    <script>
        const graphQLFetcher = graphQLParams =>
            fetch('/graphql', {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(graphQLParams),
            })
            .then(response => response.json())
            .catch(() => response.text());

        const defaultQuery = ` + "`" + `# Welcome to ADES GraphQL API
# 
# ADES (AI Development Experience System) provides intelligent insights
# about your development process through a powerful GraphQL API.
#
# Try some example queries:

# Get recent commits
query GetCommits {
  commits(limit: 5) {
    hash
    message
    author
    date
    files
  }
}

# Get repository statistics
query GetStats {
  repositoryStats {
    totalCommits
    activeDevelopers
    languages
    codeQualityScore
  }
}

# Search commits semantically
query SearchCommits {
  searchCommits(query: "authentication bug fix", limit: 3) {
    hash
    message
    author
    date
  }
}

# Get development insights
query GetInsights {
  insights {
    title
    description
    priority
    category
  }
}

# Get reusable patterns
query GetPatterns {
  patterns(minOccurrences: 2) {
    name
    description
    occurrences
    reusability
  }
}
` + "`" + `;

        ReactDOM.render(
            React.createElement(GraphiQL, {
                fetcher: graphQLFetcher,
                defaultQuery: defaultQuery,
                headerEditorEnabled: true,
                shouldPersistHeaders: true,
            }),
            document.getElementById('graphiql'),
        );
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(graphiqlHTML))
}

// ServeSchema serves the GraphQL schema in SDL format
func (h *GraphQLHandler) ServeSchema(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get schema SDL
	schema := h.service.GetSchema()
	
	// For now, return a simple schema description
	// In a full implementation, you'd use graphql-go's introspection
	schemaSDL := `
# ADES GraphQL Schema
# AI Development Experience System API

scalar DateTime

type Commit {
  hash: String!
  message: String!
  author: String!
  date: DateTime!
  files: [String!]!
}

type SemanticAnalysis {
  commitHash: String!
  intent: String!
  confidence: Float!
  topics: [String!]!
  complexity: String!
}

type Pattern {
  id: String!
  name: String!
  description: String!
  occurrences: Int!
  reusability: Float!
}

type Insight {
  title: String!
  description: String!
  priority: String!
  category: String!
}

type KnowledgeNode {
  id: String!
  type: String!
  label: String!
  properties: String!
}

type KnowledgeEdge {
  source: String!
  target: String!
  type: String!
  weight: Float!
}

type KnowledgeGraph {
  nodes: [KnowledgeNode!]!
  edges: [KnowledgeEdge!]!
}

type RepositoryStats {
  totalCommits: Int!
  totalFiles: Int!
  activeDevelopers: Int!
  languages: [String!]!
  codeQualityScore: Float!
}

input TimeRangeInput {
  start: DateTime
  end: DateTime
}

input SearchFiltersInput {
  authors: [String!]
  fileTypes: [String!]
  intent: [String!]
  dateRange: TimeRangeInput
}

type Query {
  commits(limit: Int = 10, offset: Int = 0): [Commit!]!
  commit(hash: String!): Commit
  semanticAnalysis(commitHash: String, limit: Int = 10): [SemanticAnalysis!]!
  patterns(minOccurrences: Int = 1, limit: Int = 10): [Pattern!]!
  insights(timeRange: TimeRangeInput): [Insight!]!
  knowledgeGraph: KnowledgeGraph!
  repositoryStats: RepositoryStats!
  searchCommits(query: String!, filters: SearchFiltersInput, limit: Int = 10): [Commit!]!
}

type Mutation {
  analyzeRepository: Boolean!
  analyzeCommit(hash: String!): Boolean!
}
`

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(schemaSDL))
}

// sendErrorResponse sends an error response
func (h *GraphQLHandler) sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	response := GraphQLResponse{
		Errors: []GraphQLError{
			{
				Message: message,
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
} 