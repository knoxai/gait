package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/knoxai/gait/internal/git"
	"github.com/knoxai/gait/pkg/types"
)

// RepositoryManager handles multiple repository operations
type RepositoryManager struct {
	repositories    []types.Repository
	currentRepo     *git.Service
	configPath      string
	workspacePath   string
}

// NewRepositoryManager creates a new repository manager
func NewRepositoryManager(workspacePath string) *RepositoryManager {
	configPath := filepath.Join(workspacePath, ".gait", "repositories.json")
	return &RepositoryManager{
		repositories:  []types.Repository{},
		configPath:    configPath,
		workspacePath: workspacePath,
	}
}

// LoadRepositories loads saved repositories from config
func (rm *RepositoryManager) LoadRepositories() error {
	if _, err := os.Stat(rm.configPath); os.IsNotExist(err) {
		return nil // No config file yet, that's fine
	}

	data, err := os.ReadFile(rm.configPath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &rm.repositories)
}

// SaveRepositories saves repositories to config
func (rm *RepositoryManager) SaveRepositories() error {
	// Ensure .gait directory exists
	if err := os.MkdirAll(filepath.Dir(rm.configPath), 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(rm.repositories, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(rm.configPath, data, 0644)
}

// AddRepository adds a local repository to the managed list
func (rm *RepositoryManager) AddRepository(path string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("invalid path: %v", err)
	}

	// Check if it's a valid Git repository
	if _, err := os.Stat(filepath.Join(absPath, ".git")); os.IsNotExist(err) {
		return fmt.Errorf("not a Git repository: %s", absPath)
	}

	// Check if already exists
	for _, repo := range rm.repositories {
		if repo.Path == absPath {
			return fmt.Errorf("repository already exists: %s", absPath)
		}
	}

	repo := types.Repository{
		Name: filepath.Base(absPath),
		Path: absPath,
	}

	rm.repositories = append(rm.repositories, repo)
	return rm.SaveRepositories()
}

// CloneRepository clones a remote repository
func (rm *RepositoryManager) CloneRepository(url, name string) error {
	if name == "" {
		// Extract name from URL
		parts := strings.Split(strings.TrimSuffix(url, ".git"), "/")
		name = parts[len(parts)-1]
	}

	clonePath := filepath.Join(rm.workspacePath, name)

	// Check if directory already exists
	if _, err := os.Stat(clonePath); !os.IsNotExist(err) {
		return fmt.Errorf("directory already exists: %s", clonePath)
	}

	// Clone the repository
	cmd := exec.Command("git", "clone", url, clonePath)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to clone repository: %v", err)
	}

	// Add to managed repositories
	return rm.AddRepository(clonePath)
}

// RemoveRepository removes a repository from the managed list
func (rm *RepositoryManager) RemoveRepository(path string) error {
	for i, repo := range rm.repositories {
		if repo.Path == path {
			rm.repositories = append(rm.repositories[:i], rm.repositories[i+1:]...)
			return rm.SaveRepositories()
		}
	}
	return fmt.Errorf("repository not found: %s", path)
}

// GetRepositories returns all managed repositories
func (rm *RepositoryManager) GetRepositories() []types.Repository {
	return rm.repositories
}

// SwitchRepository switches to a different repository
func (rm *RepositoryManager) SwitchRepository(path string) (*git.Service, error) {
	// Validate repository exists and is managed
	found := false
	for _, repo := range rm.repositories {
		if repo.Path == path {
			found = true
			break
		}
	}

	if !found {
		return nil, fmt.Errorf("repository not found in managed list: %s", path)
	}

	// Check if it's still a valid Git repository
	if _, err := os.Stat(filepath.Join(path, ".git")); os.IsNotExist(err) {
		return nil, fmt.Errorf("not a Git repository: %s", path)
	}

	rm.currentRepo = git.NewService(path)
	return rm.currentRepo, nil
}

// DiscoverRepositories discovers repositories in the workspace
func (rm *RepositoryManager) DiscoverRepositories(maxDepth int) error {
	tempService := git.NewService(rm.workspacePath)
	discovered, err := tempService.DiscoverRepositories(rm.workspacePath, maxDepth)
	if err != nil {
		return err
	}

	// Add discovered repositories that aren't already managed
	for _, repo := range discovered {
		exists := false
		for _, existing := range rm.repositories {
			if existing.Path == repo.Path {
				exists = true
				break
			}
		}
		if !exists {
			rm.repositories = append(rm.repositories, repo)
		}
	}

	return rm.SaveRepositories()
}

// Repository management HTTP handlers

// HandleGetRepositories handles GET /api/repositories
func (rm *RepositoryManager) HandleGetRepositories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rm.repositories)
}

// HandleAddRepository handles POST /api/repositories/add
func (rm *RepositoryManager) HandleAddRepository(w http.ResponseWriter, r *http.Request) {
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

	if err := rm.AddRepository(req.Path); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleCloneRepository handles POST /api/repositories/clone
func (rm *RepositoryManager) HandleCloneRepository(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		URL  string `json:"url"`
		Name string `json:"name,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	if err := rm.CloneRepository(req.URL, req.Name); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleRemoveRepository handles DELETE /api/repositories/remove
func (rm *RepositoryManager) HandleRemoveRepository(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
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

	if err := rm.RemoveRepository(req.Path); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleSwitchRepository handles POST /api/repositories/switch
func (rm *RepositoryManager) HandleSwitchRepository(w http.ResponseWriter, r *http.Request) {
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

	if _, err := rm.SwitchRepository(req.Path); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleDiscoverRepositories handles POST /api/repositories/discover
func (rm *RepositoryManager) HandleDiscoverRepositories(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		MaxDepth int `json:"maxDepth"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.MaxDepth = 3 // default
	}

	if req.MaxDepth <= 0 {
		req.MaxDepth = 3
	}

	if err := rm.DiscoverRepositories(req.MaxDepth); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "success",
		"repositories": rm.repositories,
	})
} 