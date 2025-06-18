package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/knoxai/gait/internal/git"
	"github.com/knoxai/gait/internal/web"
	"github.com/knoxai/gait/pkg/types"
)

// Handler manages API endpoints
type Handler struct {
	gitService    *git.Service
	repositories  []types.Repository
	webServer     *web.Server
}

// NewHandler creates a new API handler
func NewHandler(gitService *git.Service, repositories []types.Repository, webServer *web.Server) *Handler {
	return &Handler{
		gitService:   gitService,
		repositories: repositories,
		webServer:    webServer,
	}
}

// SetGitService updates the git service (for repository switching)
func (h *Handler) SetGitService(service *git.Service) {
	h.gitService = service
}

// SetWebServer updates the web server reference
func (h *Handler) SetWebServer(webServer *web.Server) {
	h.webServer = webServer
}

// writeJSONResponse writes a JSON response
func (h *Handler) writeJSONResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// writeErrorResponse writes an error response
func (h *Handler) writeErrorResponse(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// GetRepositories handles GET /api/repositories
func (h *Handler) GetRepositories(w http.ResponseWriter, r *http.Request) {
	h.writeJSONResponse(w, h.repositories)
}

// SwitchRepository handles POST /api/repository/switch
func (h *Handler) SwitchRepository(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Validate repository path
	if _, err := os.Stat(filepath.Join(req.Path, ".git")); os.IsNotExist(err) {
		h.writeErrorResponse(w, "Not a Git repository", http.StatusBadRequest)
		return
	}

	h.gitService = git.NewService(req.Path)
	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// GetCommitsHTML handles GET /api/commits/html - Server-side rendered commits for better performance
func (h *Handler) GetCommitsHTML(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil {
			offset = parsed
		}
	}

	branch := r.URL.Query().Get("branch")
	showAll := r.URL.Query().Get("all") == "true"

	commits, err := h.gitService.GetCommitsWithOffset(limit, offset, branch, showAll)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check if there are more commits
	hasMore := len(commits) == limit

	// Use server-side rendering for better performance
	if h.webServer != nil {
		h.webServer.ServeCommitList(w, r, commits, hasMore, offset+len(commits))
	} else {
		h.writeErrorResponse(w, "Web server not available", http.StatusInternalServerError)
	}
}

// GetCommits handles GET /api/commits
func (h *Handler) GetCommits(w http.ResponseWriter, r *http.Request) {
	if h.gitService == nil {
		h.writeJSONResponse(w, []types.Commit{})
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil {
			offset = parsed
		}
	}

	branch := r.URL.Query().Get("branch")
	showAll := r.URL.Query().Get("all") == "true"

	commits, err := h.gitService.GetCommitsWithOffset(limit, offset, branch, showAll)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, commits)
}

// GetAllData handles GET /api/all - Optimized endpoint to get all data in one request
func (h *Handler) GetAllData(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	// If no git service is available, return empty data
	if h.gitService == nil {
		response := map[string]interface{}{
			"commits":            []types.Commit{},
			"branches":           []types.Branch{},
			"tags":               []types.Tag{},
			"stashes":            []types.Stash{},
			"remotes":            []types.Remote{},
			"uncommittedChanges": []types.FileChange{},
			"hasMore":            false,
			"offset":             0,
		}
		h.writeJSONResponse(w, response)
		return
	}

	// Use goroutines to fetch data concurrently for better performance
	type result struct {
		commits            []types.Commit
		branches           []types.Branch
		tags               []types.Tag
		stashes            []types.Stash
		remotes            []types.Remote
		uncommittedChanges []types.FileChange
		err                error
	}

	resultChan := make(chan result, 1)

	go func() {
		var res result
		
		// Fetch all data concurrently
		commitsChan := make(chan []types.Commit, 1)
		branchesChan := make(chan []types.Branch, 1)
		tagsChan := make(chan []types.Tag, 1)
		stashesChan := make(chan []types.Stash, 1)
		remotesChan := make(chan []types.Remote, 1)
		uncommittedChan := make(chan []types.FileChange, 1)
		errorChan := make(chan error, 6)

		// Launch concurrent fetches
		go func() {
			commits, err := h.gitService.GetCommitsWithOffset(limit, 0, "", false)
			if err != nil {
				errorChan <- err
				return
			}
			commitsChan <- commits
		}()

		go func() {
			branches, err := h.gitService.GetBranches()
			if err != nil {
				errorChan <- err
				return
			}
			branchesChan <- branches
		}()

		go func() {
			tags, err := h.gitService.GetTags()
			if err != nil {
				errorChan <- err
				return
			}
			tagsChan <- tags
		}()

		go func() {
			stashes, err := h.gitService.GetStashes()
			if err != nil {
				errorChan <- err
				return
			}
			stashesChan <- stashes
		}()

		go func() {
			remotes, err := h.gitService.GetRemotes()
			if err != nil {
				errorChan <- err
				return
			}
			remotesChan <- remotes
		}()

		go func() {
			uncommittedChanges, err := h.gitService.GetUncommittedChanges()
			if err != nil {
				errorChan <- err
				return
			}
			uncommittedChan <- uncommittedChanges
		}()

		// Collect results
		completed := 0
		for completed < 6 {
			select {
			case commits := <-commitsChan:
				res.commits = commits
				completed++
			case branches := <-branchesChan:
				res.branches = branches
				completed++
			case tags := <-tagsChan:
				res.tags = tags
				completed++
			case stashes := <-stashesChan:
				res.stashes = stashes
				completed++
			case remotes := <-remotesChan:
				res.remotes = remotes
				completed++
			case uncommittedChanges := <-uncommittedChan:
				res.uncommittedChanges = uncommittedChanges
				completed++
			case err := <-errorChan:
				res.err = err
				resultChan <- res
				return
			}
		}

		resultChan <- res
	}()

	res := <-resultChan
	if res.err != nil {
		h.writeErrorResponse(w, res.err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"commits":            res.commits,
		"branches":           res.branches,
		"tags":               res.tags,
		"stashes":            res.stashes,
		"remotes":            res.remotes,
		"uncommittedChanges": res.uncommittedChanges,
		"hasMore":            len(res.commits) == limit,
		"offset":             len(res.commits),
	}

	h.writeJSONResponse(w, response)
}

// GetBranches handles GET /api/branches
func (h *Handler) GetBranches(w http.ResponseWriter, r *http.Request) {
	if h.gitService == nil {
		h.writeJSONResponse(w, []types.Branch{})
		return
	}

	branches, err := h.gitService.GetBranches()
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, branches)
}

// GetTags handles GET /api/tags
func (h *Handler) GetTags(w http.ResponseWriter, r *http.Request) {
	if h.gitService == nil {
		h.writeJSONResponse(w, []types.Tag{})
		return
	}

	tags, err := h.gitService.GetTags()
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, tags)
}

// GetStashes handles GET /api/stashes
func (h *Handler) GetStashes(w http.ResponseWriter, r *http.Request) {
	if h.gitService == nil {
		h.writeJSONResponse(w, []types.Stash{})
		return
	}

	stashes, err := h.gitService.GetStashes()
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, stashes)
}

// GetRemotes handles GET /api/remotes
func (h *Handler) GetRemotes(w http.ResponseWriter, r *http.Request) {
	if h.gitService == nil {
		h.writeJSONResponse(w, []types.Remote{})
		return
	}

	remotes, err := h.gitService.GetRemotes()
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, remotes)
}

// CheckoutBranch handles POST /api/checkout
func (h *Handler) CheckoutBranch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Branch string `json:"branch"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := h.gitService.CheckoutBranch(req.Branch); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// CreateBranch handles POST /api/branch/create
func (h *Handler) CreateBranch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BranchName string `json:"branchName"`
		StartPoint string `json:"startPoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.BranchName == "" {
		h.writeErrorResponse(w, "Branch name is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.CreateBranch(req.BranchName, req.StartPoint); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success", "message": "Branch created and checked out"})
}

// DeleteBranch handles POST /api/branch/delete
func (h *Handler) DeleteBranch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BranchName string `json:"branchName"`
		Force      bool   `json:"force"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.BranchName == "" {
		h.writeErrorResponse(w, "Branch name is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.DeleteBranch(req.BranchName, req.Force); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success", "message": "Branch deleted"})
}

// MergeBranch handles POST /api/branch/merge
func (h *Handler) MergeBranch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BranchName     string `json:"branchName"`
		NoFastForward  bool   `json:"noFastForward"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.BranchName == "" {
		h.writeErrorResponse(w, "Branch name is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.MergeBranch(req.BranchName, req.NoFastForward); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success", "message": "Branch merged"})
}

// Fetch handles POST /api/fetch
func (h *Handler) Fetch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Remote string `json:"remote"`
		Prune  bool   `json:"prune"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if err := h.gitService.Fetch(req.Remote, req.Prune); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// GetGait handles GET /api/gait
func (h *Handler) GetGait(w http.ResponseWriter, r *http.Request) {
	// Simple gait generation for now
	commits, err := h.gitService.GetCommits(50, "", false)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	gait := h.generateSimpleGait(commits)
	h.writeJSONResponse(w, gait)
}

// generateSimpleGait creates a simple linear gait
func (h *Handler) generateSimpleGait(commits []types.Commit) types.CommitGait {
	points := make([]types.GaitPoint, len(commits))
	lines := make([]types.GaitLine, 0, len(commits)-1)
	colors := []string{"#007acc", "#bc3fbc", "#00bc00", "#bc7c00", "#bc0000", "#00bcbc"}

	for i, _ := range commits {
		points[i] = types.GaitPoint{X: 0, Y: i}
		
		if i > 0 {
			lines = append(lines, types.GaitLine{
				From:  types.GaitPoint{X: 0, Y: i - 1},
				To:    types.GaitPoint{X: 0, Y: i},
				Color: colors[i%len(colors)],
			})
		}
	}

	return types.CommitGait{
		Points: points,
		Lines:  lines,
		Width:  1,
		Height: len(commits),
	}
}

// GetSettings handles GET /api/settings
func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings := types.RepoSettings{
		ShowAllBranches:    false,
		MaxCommits:         50,
		DateFormat:         "2006-01-02 15:04:05",
		GaitColors:        []string{"#007acc", "#bc3fbc", "#00bc00", "#bc7c00", "#bc0000", "#00bcbc"},
		ShowUncommitted:    true,
		ShowRemoteBranches: true,
	}

	h.writeJSONResponse(w, settings)
}

// Search handles POST /api/search
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req types.SearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	results := h.performSearch(req)
	h.writeJSONResponse(w, results)
}

// performSearch performs a simple search in commit messages
func (h *Handler) performSearch(req types.SearchRequest) []types.SearchResult {
	commits, err := h.gitService.GetCommits(100, "", true)
	if err != nil {
		return []types.SearchResult{} // Return empty array on error
	}

	results := make([]types.SearchResult, 0)
	query := strings.ToLower(req.Query)

	for _, commit := range commits {
		if req.Type == "message" || req.Type == "" {
			if strings.Contains(strings.ToLower(commit.Message), query) {
				results = append(results, types.SearchResult{
					CommitHash: commit.Hash,
					Type:       "message",
					Match:      commit.Message,
					Context:    commit.Message,
				})
			}
		}

		if req.Type == "author" || req.Type == "" {
			if strings.Contains(strings.ToLower(commit.Author.Name), query) {
				results = append(results, types.SearchResult{
					CommitHash: commit.Hash,
					Type:       "author",
					Match:      commit.Author.Name,
					Context:    fmt.Sprintf("%s: %s", commit.Author.Name, commit.Message),
				})
			}
		}

		if len(results) >= req.MaxResults && req.MaxResults > 0 {
			break
		}
	}

	return results
}

// GetCommitDetails handles GET /api/commit/{hash}
func (h *Handler) GetCommitDetails(w http.ResponseWriter, r *http.Request) {
	// Extract hash from URL path using gorilla/mux
	vars := mux.Vars(r)
	hash := vars["hash"]
	if hash == "" {
		h.writeErrorResponse(w, "Commit hash required", http.StatusBadRequest)
		return
	}

	commit, err := h.gitService.GetCommitDetails(hash)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusNotFound)
		return
	}

	h.writeJSONResponse(w, commit)
}

// GetFileDiff handles GET /api/diff
func (h *Handler) GetFileDiff(w http.ResponseWriter, r *http.Request) {
	hash := r.URL.Query().Get("hash")
	filePath := r.URL.Query().Get("file")

	if hash == "" || filePath == "" {
		h.writeErrorResponse(w, "Hash and file parameters required", http.StatusBadRequest)
		return
	}

	diff, err := h.gitService.GetFileDiff(hash, filePath)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, diff)
}

// GetFileContent handles GET /api/file-content
func (h *Handler) GetFileContent(w http.ResponseWriter, r *http.Request) {
	hash := r.URL.Query().Get("hash")
	filePath := r.URL.Query().Get("file")

	if hash == "" || filePath == "" {
		h.writeErrorResponse(w, "Hash and file parameters required", http.StatusBadRequest)
		return
	}

	content, err := h.gitService.GetFileContent(hash, filePath)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"path":    filePath,
		"hash":    hash,
		"content": content,
	}

	h.writeJSONResponse(w, response)
}

// SaveFileContent handles POST /api/file-content/save
func (h *Handler) SaveFileContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		FilePath string   `json:"filePath"`
		Content  []string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.FilePath == "" {
		h.writeErrorResponse(w, "File path is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.SaveFileContent(req.FilePath, req.Content); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// GetCommitsByTag handles GET /api/commits/tag/{tag}
func (h *Handler) GetCommitsByTag(w http.ResponseWriter, r *http.Request) {
	// Extract tag name from URL path using gorilla/mux
	vars := mux.Vars(r)
	tag := vars["tag"]
	if tag == "" {
		h.writeErrorResponse(w, "Tag name required", http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil {
			offset = parsed
		}
	}

	commits, err := h.gitService.GetCommitsByTagWithOffset(tag, limit, offset)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, commits)
}

// GetCommitsByTagHTML handles GET /api/commits/tag/{tag}/html - Server-side rendered commits for tags
func (h *Handler) GetCommitsByTagHTML(w http.ResponseWriter, r *http.Request) {
	// Extract tag name from URL path using gorilla/mux
	vars := mux.Vars(r)
	tag := vars["tag"]
	if tag == "" {
		h.writeErrorResponse(w, "Tag name required", http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil {
			offset = parsed
		}
	}

	commits, err := h.gitService.GetCommitsByTagWithOffset(tag, limit, offset)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check if there are more commits
	hasMore := len(commits) == limit

	// Use server-side rendering for better performance
	if h.webServer != nil {
		h.webServer.ServeCommitList(w, r, commits, hasMore, offset+len(commits))
	} else {
		h.writeErrorResponse(w, "Web server not available", http.StatusInternalServerError)
	}
}

// ApplyStash handles POST /api/stash/apply
func (h *Handler) ApplyStash(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Index int `json:"index"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := h.gitService.ApplyStash(req.Index); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// PopStash handles POST /api/stash/pop
func (h *Handler) PopStash(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Index int `json:"index"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := h.gitService.PopStash(req.Index); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// DropStash handles POST /api/stash/drop
func (h *Handler) DropStash(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Index int `json:"index"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := h.gitService.DropStash(req.Index); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// ShowStash handles GET /api/stash/{stash}
func (h *Handler) ShowStash(w http.ResponseWriter, r *http.Request) {
	// Extract stash index from URL path using gorilla/mux
	vars := mux.Vars(r)
	stashStr := vars["stash"]
	if stashStr == "" {
		h.writeErrorResponse(w, "Stash index required", http.StatusBadRequest)
		return
	}

	index, err := strconv.Atoi(stashStr)
	if err != nil {
		h.writeErrorResponse(w, "Invalid stash index", http.StatusBadRequest)
		return
	}

	stash, err := h.gitService.ShowStash(index)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusNotFound)
		return
	}

	h.writeJSONResponse(w, stash)
}

// PullFromRemote handles POST /api/remote/pull
func (h *Handler) PullFromRemote(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Remote string `json:"remote"`
		Branch string `json:"branch"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if err := h.gitService.PullFromRemote(req.Remote, req.Branch); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// PushToRemote handles POST /api/remote/push
func (h *Handler) PushToRemote(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Remote string `json:"remote"`
		Branch string `json:"branch"`
		Force  bool   `json:"force"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if err := h.gitService.PushToRemote(req.Remote, req.Branch, req.Force); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// GetRemoteInfo handles GET /api/remote/{name}/info
func (h *Handler) GetRemoteInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract remote name from URL path using gorilla/mux
	vars := mux.Vars(r)
	remoteName := vars["remote"]
	if remoteName == "" {
		h.writeErrorResponse(w, "Remote name required", http.StatusBadRequest)
		return
	}
	remote, err := h.gitService.GetRemoteInfo(remoteName)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, remote)
}

// RenameBranch handles POST /api/branch/rename
func (h *Handler) RenameBranch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		OldName string `json:"oldName"`
		NewName string `json:"newName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.OldName == "" || req.NewName == "" {
		h.writeErrorResponse(w, "Both oldName and newName are required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.RenameBranch(req.OldName, req.NewName); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// CherryPickCommit handles POST /api/commit/cherry-pick
func (h *Handler) CherryPickCommit(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		CommitHash string `json:"commitHash"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.CommitHash == "" {
		h.writeErrorResponse(w, "Commit hash is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.CherryPickCommit(req.CommitHash); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// RevertCommit handles POST /api/commit/revert
func (h *Handler) RevertCommit(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		CommitHash string `json:"commitHash"`
		NoCommit   bool   `json:"noCommit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.CommitHash == "" {
		h.writeErrorResponse(w, "Commit hash is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.RevertCommit(req.CommitHash, req.NoCommit); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// ResetBranch handles POST /api/branch/reset
func (h *Handler) ResetBranch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		CommitHash string `json:"commitHash"`
		ResetType  string `json:"resetType"` // soft, mixed, hard
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.CommitHash == "" {
		h.writeErrorResponse(w, "Commit hash is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.ResetBranch(req.CommitHash, req.ResetType); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// RebaseBranch handles POST /api/branch/rebase
func (h *Handler) RebaseBranch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TargetBranch string `json:"targetBranch"`
		Interactive  bool   `json:"interactive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.TargetBranch == "" {
		h.writeErrorResponse(w, "Target branch is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.RebaseBranch(req.TargetBranch, req.Interactive); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// CreateTag handles POST /api/tag/create
func (h *Handler) CreateTag(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TagName    string `json:"tagName"`
		CommitHash string `json:"commitHash"`
		Message    string `json:"message"`
		Annotated  bool   `json:"annotated"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.TagName == "" {
		h.writeErrorResponse(w, "Tag name is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.CreateTag(req.TagName, req.CommitHash, req.Message, req.Annotated); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// DeleteTag handles DELETE /api/tag/{name}
func (h *Handler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract tag name from URL path using gorilla/mux
	vars := mux.Vars(r)
	tagName := vars["tag"]
	if tagName == "" {
		h.writeErrorResponse(w, "Tag name is required", http.StatusBadRequest)
		return
	}
	if err := h.gitService.DeleteTag(tagName); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// PushTag handles POST /api/tag/push
func (h *Handler) PushTag(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TagName string `json:"tagName"`
		Remote  string `json:"remote"`
		All     bool   `json:"all"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Remote == "" {
		req.Remote = "origin" // default to origin
	}

	var err error
	if req.All {
		err = h.gitService.PushAllTags(req.Remote)
	} else {
		if req.TagName == "" {
			h.writeErrorResponse(w, "Tag name is required when not pushing all tags", http.StatusBadRequest)
			return
		}
		err = h.gitService.PushTag(req.Remote, req.TagName)
	}

	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// GetTagDetails handles GET /api/tag/{name}/details
func (h *Handler) GetTagDetails(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract tag name from URL path using gorilla/mux
	vars := mux.Vars(r)
	tagName := vars["tag"]
	if tagName == "" {
		h.writeErrorResponse(w, "Tag name is required", http.StatusBadRequest)
		return
	}
	tag, err := h.gitService.GetAnnotatedTagDetails(tagName)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, tag)
}

// CreateStash handles POST /api/stash/create
func (h *Handler) CreateStash(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Message          string `json:"message"`
		IncludeUntracked bool   `json:"includeUntracked"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := h.gitService.CreateStash(req.Message, req.IncludeUntracked); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// CreateBranchFromStash handles POST /api/stash/branch
func (h *Handler) CreateBranchFromStash(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BranchName string `json:"branchName"`
		StashIndex int    `json:"stashIndex"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.BranchName == "" {
		h.writeErrorResponse(w, "Branch name is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.CreateBranchFromStash(req.BranchName, req.StashIndex); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// CleanWorkingDirectory handles POST /api/clean
func (h *Handler) CleanWorkingDirectory(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		DryRun              bool `json:"dryRun"`
		IncludeDirectories  bool `json:"includeDirectories"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	output, err := h.gitService.CleanWorkingDirectory(req.DryRun, req.IncludeDirectories)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{
		"status": "success",
		"output": output,
	})
}

// GetUncommittedChanges handles GET /api/uncommitted
func (h *Handler) GetUncommittedChanges(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if h.gitService == nil {
		h.writeJSONResponse(w, []types.FileChange{})
		return
	}

	changes, err := h.gitService.GetUncommittedChanges()
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, changes)
}

// StageFile handles POST /api/stage
func (h *Handler) StageFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		FilePath string `json:"filePath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.FilePath == "" {
		h.writeErrorResponse(w, "File path is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.StageFile(req.FilePath); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// UnstageFile handles POST /api/unstage
func (h *Handler) UnstageFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		FilePath string `json:"filePath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.FilePath == "" {
		h.writeErrorResponse(w, "File path is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.UnstageFile(req.FilePath); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// DiscardFileChanges handles POST /api/discard
func (h *Handler) DiscardFileChanges(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		FilePath string `json:"filePath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.FilePath == "" {
		h.writeErrorResponse(w, "File path is required", http.StatusBadRequest)
		return
	}

	if err := h.gitService.DiscardFileChanges(req.FilePath); err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{"status": "success"})
}

// CreateCommit handles POST /api/commit/create
func (h *Handler) CreateCommit(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		h.writeErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Message string `json:"message"`
		Amend   bool   `json:"amend"`
		Signoff bool   `json:"signoff"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErrorResponse(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		h.writeErrorResponse(w, "Commit message is required", http.StatusBadRequest)
		return
	}

	commitHash, err := h.gitService.CreateCommit(req.Message)
	if err != nil {
		h.writeErrorResponse(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.writeJSONResponse(w, map[string]string{
		"status":     "success",
		"commitHash": commitHash,
	})
} 