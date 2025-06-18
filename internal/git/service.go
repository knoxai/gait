package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/knoxai/gait/pkg/types"
)

// Service handles Git operations
type Service struct {
	repoPath string
	cache    *serviceCache
}

// serviceCache provides simple caching for frequently accessed data
type serviceCache struct {
	mu       sync.RWMutex
	branches []types.Branch
	tags     []types.Tag
	remotes  []types.Remote
	
	branchesExpiry time.Time
	tagsExpiry     time.Time
	remotesExpiry  time.Time
	
	cacheDuration time.Duration
}

// NewService creates a new Git service
func NewService(repoPath string) *Service {
	return &Service{
		repoPath: repoPath,
		cache: &serviceCache{
			cacheDuration: 30 * time.Second, // Cache for 30 seconds
		},
	}
}

// GetRepoPath returns the repository path
func (s *Service) GetRepoPath() string {
	return s.repoPath
}

// runGitCommand executes a git command in the repository
func (s *Service) runGitCommand(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = s.repoPath
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git command failed: %v, output: %s", err, string(output))
	}
	return strings.TrimSpace(string(output)), nil
}

// runGitCommandWithTimeout executes a git command with timeout for better performance
func (s *Service) runGitCommandWithTimeout(timeout time.Duration, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = s.repoPath
	
	// Set a reasonable timeout to prevent hanging
	done := make(chan error, 1)
	var output []byte
	var err error
	
	go func() {
		output, err = cmd.Output()
		done <- err
	}()
	
	select {
	case err := <-done:
		if err != nil {
			return "", fmt.Errorf("git command failed: %v", err)
		}
		return strings.TrimSpace(string(output)), nil
	case <-time.After(timeout):
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		return "", fmt.Errorf("git command timed out after %v", timeout)
	}
}

// GetCommits retrieves commit history
func (s *Service) GetCommits(limit int, branch string, showAll bool) ([]types.Commit, error) {
	return s.GetCommitsWithOffset(limit, 0, branch, showAll)
}

// GetCommitsWithOffset retrieves commit history with pagination support and optimizations
func (s *Service) GetCommitsWithOffset(limit int, offset int, branch string, showAll bool) ([]types.Commit, error) {
	args := []string{"log", "--pretty=format:%H|%h|%s|%an|%ae|%ad|%cd|%P", "--date=iso"}
	
	// Add skip parameter for offset
	if offset > 0 {
		args = append(args, fmt.Sprintf("--skip=%d", offset))
	}
	
	if limit > 0 {
		args = append(args, fmt.Sprintf("-%d", limit))
	}
	
	if !showAll && branch != "" {
		args = append(args, branch)
	} else if showAll {
		args = append(args, "--all")
	}

	// Use timeout for better performance
	output, err := s.runGitCommandWithTimeout(10*time.Second, args...)
	if err != nil {
		return []types.Commit{}, nil // Return empty array instead of nil
	}

	lines := strings.Split(output, "\n")
	commits := make([]types.Commit, 0, len(lines)) // Initialize with capacity

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) < 7 {
			continue
		}

		// Parse dates
		date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[5])
		commitDate, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[6])

		// Parse parents
		var parents []string
		if parts[7] != "" {
			parents = strings.Split(parts[7], " ")
		} else {
			parents = []string{} // Empty array instead of nil
		}

		// Get refs for this commit (with caching consideration)
		refs, _ := s.getCommitRefs(parts[0])

		commit := types.Commit{
			Hash:       parts[0],
			ShortHash:  parts[1],
			Message:    parts[2],
			Author:     types.Author{Name: parts[3], Email: parts[4]},
			Committer:  types.Author{Name: parts[3], Email: parts[4]},
			Date:       date,
			CommitDate: commitDate,
			Parents:    parents,
			Refs:       refs,
			Stats:      types.CommitStats{}, // Initialize with zero values
		}

		commits = append(commits, commit)
	}

	return commits, nil
}

// GetBranches retrieves all branches with caching
func (s *Service) GetBranches() ([]types.Branch, error) {
	s.cache.mu.RLock()
	if time.Now().Before(s.cache.branchesExpiry) && len(s.cache.branches) > 0 {
		branches := make([]types.Branch, len(s.cache.branches))
		copy(branches, s.cache.branches)
		s.cache.mu.RUnlock()
		return branches, nil
	}
	s.cache.mu.RUnlock()

	// Get local branches
	output, err := s.runGitCommandWithTimeout(5*time.Second, "branch", "-v")
	if err != nil {
		return []types.Branch{}, nil // Return empty array instead of nil
	}

	branches := make([]types.Branch, 0)

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}

		line = strings.TrimSpace(line)
		isCurrent := strings.HasPrefix(line, "*")
		if isCurrent {
			line = strings.TrimSpace(line[1:]) // Remove the *
		}

		parts := strings.Fields(line)
		if len(parts) >= 2 {
			name := parts[0]
			hash := parts[1]

			branch := types.Branch{
				Name:      name,
				Hash:      hash,
				IsRemote:  false,
				IsCurrent: isCurrent,
			}

			branches = append(branches, branch)
		}
	}

	// Cache the result
	s.cache.mu.Lock()
	s.cache.branches = make([]types.Branch, len(branches))
	copy(s.cache.branches, branches)
	s.cache.branchesExpiry = time.Now().Add(s.cache.cacheDuration)
	s.cache.mu.Unlock()

	return branches, nil
}

// invalidateBranchesCache clears the branches cache to force a refresh
func (s *Service) invalidateBranchesCache() {
	s.cache.mu.Lock()
	s.cache.branchesExpiry = time.Time{} // Set to zero time to force refresh
	s.cache.mu.Unlock()
}

// GetTags retrieves all tags with caching
func (s *Service) GetTags() ([]types.Tag, error) {
	s.cache.mu.RLock()
	if time.Now().Before(s.cache.tagsExpiry) && len(s.cache.tags) > 0 {
		tags := make([]types.Tag, len(s.cache.tags))
		copy(tags, s.cache.tags)
		s.cache.mu.RUnlock()
		return tags, nil
	}
	s.cache.mu.RUnlock()

	output, err := s.runGitCommandWithTimeout(5*time.Second, "tag", "-l", "--format=%(refname:short)|%(objectname:short)|%(objecttype)|%(subject)|%(taggername)|%(taggeremail)|%(taggerdate:iso)")
	if err != nil {
		return []types.Tag{}, nil // Return empty array instead of nil
	}

	if strings.TrimSpace(output) == "" {
		return []types.Tag{}, nil // Return empty array for no tags
	}

	lines := strings.Split(output, "\n")
	tags := make([]types.Tag, 0, len(lines))

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) < 3 {
			continue
		}

		name := strings.TrimSpace(parts[0])
		hash := strings.TrimSpace(parts[1])
		tagType := strings.TrimSpace(parts[2])

		tag := types.Tag{
			Name: name,
			Hash: hash,
			Type: tagType,
		}

		if len(parts) > 3 && parts[3] != "" {
			tag.Message = parts[3]
		}

		if len(parts) > 4 && parts[4] != "" && parts[5] != "" {
			tag.Tagger = types.Author{
				Name:  parts[4],
				Email: parts[5],
			}
		}

		if len(parts) > 6 && parts[6] != "" {
			if date, err := time.Parse("2006-01-02 15:04:05 -0700", parts[6]); err == nil {
				tag.Date = date
			}
		}

		tags = append(tags, tag)
	}

	// Cache the result
	s.cache.mu.Lock()
	s.cache.tags = make([]types.Tag, len(tags))
	copy(s.cache.tags, tags)
	s.cache.tagsExpiry = time.Now().Add(s.cache.cacheDuration)
	s.cache.mu.Unlock()

	return tags, nil
}

// GetStashes retrieves all stashes
func (s *Service) GetStashes() ([]types.Stash, error) {
	output, err := s.runGitCommand("stash", "list", "--format=%gd|%gs|%gD|%gt")
	if err != nil {
		return []types.Stash{}, nil // Return empty array instead of nil
	}

	if strings.TrimSpace(output) == "" {
		return []types.Stash{}, nil // Return empty array for no stashes
	}

	lines := strings.Split(output, "\n")
	stashes := make([]types.Stash, 0, len(lines))

	for i, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) < 2 {
			continue
		}

		// Extract branch from message
		message := parts[1]
		branch := "main" // default
		if strings.Contains(message, "On ") {
			re := regexp.MustCompile(`On ([^:]+):`)
			if matches := re.FindStringSubmatch(message); len(matches) > 1 {
				branch = matches[1]
			}
		}

		stash := types.Stash{
			Index:   i,
			Message: message,
			Branch:  branch,
			Hash:    fmt.Sprintf("stash@{%d}", i),
			Date:    time.Now(), // Git stash doesn't provide exact dates easily
		}

		stashes = append(stashes, stash)
	}

	return stashes, nil
}

// GetRemotes retrieves all remotes with caching
func (s *Service) GetRemotes() ([]types.Remote, error) {
	s.cache.mu.RLock()
	if time.Now().Before(s.cache.remotesExpiry) && len(s.cache.remotes) > 0 {
		remotes := make([]types.Remote, len(s.cache.remotes))
		copy(remotes, s.cache.remotes)
		s.cache.mu.RUnlock()
		return remotes, nil
	}
	s.cache.mu.RUnlock()

	output, err := s.runGitCommandWithTimeout(5*time.Second, "remote", "-v")
	if err != nil {
		return []types.Remote{}, nil // Return empty array instead of nil
	}

	if strings.TrimSpace(output) == "" {
		return []types.Remote{}, nil // Return empty array for no remotes
	}

	lines := strings.Split(output, "\n")
	remoteMap := make(map[string]*types.Remote)

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 3 {
			name := parts[0]
			url := parts[1]
			typ := strings.Trim(parts[2], "()")

			if remoteMap[name] == nil {
				remoteMap[name] = &types.Remote{Name: name}
			}

			if typ == "fetch" {
				remoteMap[name].FetchURL = url
			} else if typ == "push" {
				remoteMap[name].PushURL = url
			}
		}
	}

	remotes := make([]types.Remote, 0, len(remoteMap))
	for _, remote := range remoteMap {
		remotes = append(remotes, *remote)
	}

	// Cache the result
	s.cache.mu.Lock()
	s.cache.remotes = make([]types.Remote, len(remotes))
	copy(s.cache.remotes, remotes)
	s.cache.remotesExpiry = time.Now().Add(s.cache.cacheDuration)
	s.cache.mu.Unlock()

	return remotes, nil
}

// getCommitRefs gets the refs (branches/tags) for a commit
func (s *Service) getCommitRefs(hash string) ([]string, error) {
	output, err := s.runGitCommand("log", "--decorate=short", "--format=%D", "-1", hash)
	if err != nil || output == "" {
		return []string{}, nil // Return empty array instead of nil
	}

	refs := strings.Split(output, ", ")
	result := make([]string, 0, len(refs))
	
	for _, ref := range refs {
		ref = strings.TrimSpace(ref)
		if ref != "" {
			result = append(result, ref)
		}
	}

	return result, nil
}

// CheckoutBranch switches to a different branch
func (s *Service) CheckoutBranch(branch string) error {
	_, err := s.runGitCommand("checkout", branch)
	if err == nil {
		// Invalidate branches cache after successful checkout
		s.invalidateBranchesCache()
	}
	return err
}

// CreateBranch creates a new branch
func (s *Service) CreateBranch(branchName string, startPoint string) error {
	args := []string{"checkout", "-b", branchName}
	if startPoint != "" {
		args = append(args, startPoint)
	}
	_, err := s.runGitCommand(args...)
	if err == nil {
		// Invalidate branches cache after successful branch creation
		s.invalidateBranchesCache()
	}
	return err
}

// DeleteBranch deletes a branch
func (s *Service) DeleteBranch(branchName string, force bool) error {
	flag := "-d"
	if force {
		flag = "-D"
	}
	_, err := s.runGitCommand("branch", flag, branchName)
	if err == nil {
		// Invalidate branches cache after successful branch deletion
		s.invalidateBranchesCache()
	}
	return err
}

// MergeBranch merges a branch into the current branch
func (s *Service) MergeBranch(branchName string, noFastForward bool) error {
	args := []string{"merge"}
	if noFastForward {
		args = append(args, "--no-ff")
	}
	args = append(args, branchName)
	_, err := s.runGitCommand(args...)
	return err
}

// Fetch fetches from remote
func (s *Service) Fetch(remote string, prune bool) error {
	args := []string{"fetch"}
	if remote != "" {
		args = append(args, remote)
	} else {
		args = append(args, "--all")
	}
	if prune {
		args = append(args, "--prune")
	}
	_, err := s.runGitCommand(args...)
	return err
}

// DiscoverRepositories finds Git repositories in a directory
func (s *Service) DiscoverRepositories(rootPath string, maxDepth int) ([]types.Repository, error) {
	var repos []types.Repository

	err := filepath.WalkDir(rootPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil // Continue walking
		}

		// Check depth
		relPath, _ := filepath.Rel(rootPath, path)
		depth := strings.Count(relPath, string(filepath.Separator))
		if depth > maxDepth {
			return filepath.SkipDir
		}

		// Check if this is a .git directory
		if d.IsDir() && d.Name() == ".git" {
			repoPath := filepath.Dir(path)
			repoName := filepath.Base(repoPath)

			repos = append(repos, types.Repository{
				Name: repoName,
				Path: repoPath,
			})

			return filepath.SkipDir
		}

		return nil
	})

	return repos, err
}

// GetCommitDetails retrieves detailed information about a specific commit
func (s *Service) GetCommitDetails(hash string) (*types.Commit, error) {
	// Get basic commit info
	output, err := s.runGitCommand("log", "--pretty=format:%H|%h|%s|%an|%ae|%ad|%cd|%P", "--date=iso", "-1", hash)
	if err != nil {
		return nil, err
	}

	parts := strings.Split(output, "|")
	if len(parts) < 7 {
		return nil, fmt.Errorf("invalid commit format")
	}

	// Parse dates
	date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[5])
	commitDate, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[6])

	// Parse parents
	var parents []string
	if parts[7] != "" {
		parents = strings.Split(parts[7], " ")
	} else {
		parents = []string{}
	}

	// Get refs for this commit
	refs, _ := s.getCommitRefs(parts[0])

	commit := &types.Commit{
		Hash:       parts[0],
		ShortHash:  parts[1],
		Message:    parts[2],
		Author:     types.Author{Name: parts[3], Email: parts[4]},
		Committer:  types.Author{Name: parts[3], Email: parts[4]},
		Date:       date,
		CommitDate: commitDate,
		Parents:    parents,
		Refs:       refs,
		Stats:      types.CommitStats{},
	}

	// Get file changes
	fileChanges, err := s.getCommitFileChanges(hash)
	if err == nil {
		commit.FileChanges = fileChanges
	}

	return commit, nil
}

// getCommitFileChanges gets the file changes for a commit
func (s *Service) getCommitFileChanges(hash string) ([]types.FileChange, error) {
	// Get file status and stats
	output, err := s.runGitCommand("show", "--numstat", "--format=", hash)
	if err != nil {
		return []types.FileChange{}, nil
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")
	changes := make([]types.FileChange, 0, len(lines))

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 3 {
			additionsStr := parts[0]
			deletionsStr := parts[1]
			path := parts[2]

			// Parse additions and deletions
			additions := 0
			deletions := 0
			
			if additionsStr != "-" {
				if val, err := strconv.Atoi(additionsStr); err == nil {
					additions = val
				}
			}
			
			if deletionsStr != "-" {
				if val, err := strconv.Atoi(deletionsStr); err == nil {
					deletions = val
				}
			}

			// Determine status based on additions/deletions
			status := "M" // Modified by default
			if additions > 0 && deletions == 0 {
				// Check if this is a new file by trying to get it from parent
				if _, err := s.runGitCommand("show", hash+"^:"+path); err != nil {
					status = "A" // Added
				}
			} else if additions == 0 && deletions > 0 {
				// Check if file was deleted by trying to get it from current commit
				if _, err := s.runGitCommand("show", hash+":"+path); err != nil {
					status = "D" // Deleted
				}
			}

			change := types.FileChange{
				Path:      path,
				Status:    status,
				Additions: additions,
				Deletions: deletions,
			}

			changes = append(changes, change)
		}
	}

	// If no changes found with numstat, fall back to name-status for renames/copies
	if len(changes) == 0 {
		statusOutput, err := s.runGitCommand("show", "--name-status", "--format=", hash)
		if err != nil {
			return []types.FileChange{}, nil
		}

		statusLines := strings.Split(strings.TrimSpace(statusOutput), "\n")
		for _, line := range statusLines {
			if line == "" {
				continue
			}

			parts := strings.Fields(line)
			if len(parts) >= 2 {
				status := parts[0]
				path := parts[1]

				change := types.FileChange{
					Path:   path,
					Status: status,
				}

				// Handle renames
				if strings.HasPrefix(status, "R") && len(parts) >= 3 {
					change.OldPath = path
					change.Path = parts[2]
				}

				changes = append(changes, change)
			}
		}
	}

	return changes, nil
}

// GetFileDiff gets the diff for a specific file in a commit
func (s *Service) GetFileDiff(hash, filePath string) (*types.FileDiff, error) {
	var output string
	var err error
	
	if hash == "uncommitted" {
		// For uncommitted changes, get the diff between HEAD and working directory
		// This will show both staged and unstaged changes
		output, err = s.runGitCommand("diff", "HEAD", "--", filePath)
		if err != nil {
			return nil, err
		}
		
		// If no diff found, the file might be untracked
		if strings.TrimSpace(output) == "" {
			// Check if file is untracked
			statusOutput, statusErr := s.runGitCommand("status", "--porcelain", "--", filePath)
			if statusErr == nil && strings.HasPrefix(strings.TrimSpace(statusOutput), "??") {
				// File is untracked, show it as all additions
				content, contentErr := s.GetFileContent("uncommitted", filePath)
				if contentErr == nil {
					// Create a synthetic diff for untracked files
					output = fmt.Sprintf("diff --git a/%s b/%s\nnew file mode 100644\nindex 0000000..1234567\n--- /dev/null\n+++ b/%s\n@@ -0,0 +1,%d @@\n", 
						filePath, filePath, filePath, len(content))
					for _, line := range content {
						output += "+" + line + "\n"
					}
				}
			}
		}
	} else {
		// For committed changes, get the diff between the commit and its parent
		output, err = s.runGitCommand("diff", hash+"^", hash, "--", filePath)
		if err != nil {
			// If the commit has no parent (initial commit), compare with empty tree
			output, err = s.runGitCommand("diff", "4b825dc642cb6eb9a060e54bf8d69288fbee4904", hash, "--", filePath)
			if err != nil {
				return nil, err
			}
		}
	}
	
	return s.parseFileDiff(output, filePath, hash)
}

// GetFileContent gets the content of a file at a specific commit
func (s *Service) GetFileContent(hash, filePath string) ([]string, error) {
	var args []string
	if hash == "uncommitted" {
		// For uncommitted changes, get the working directory version
		content, err := os.ReadFile(filepath.Join(s.repoPath, filePath))
		if err != nil {
			return nil, err
		}
		lines := strings.Split(string(content), "\n")
		// Remove the last empty line if it exists
		if len(lines) > 0 && lines[len(lines)-1] == "" {
			lines = lines[:len(lines)-1]
		}
		return lines, nil
	} else {
		args = []string{"show", hash + ":" + filePath}
	}

	output, err := s.runGitCommand(args...)
	if err != nil {
		return nil, err
	}

	lines := strings.Split(output, "\n")
	// Remove the last empty line if it exists
	if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}
	return lines, nil
}

// SaveFileContent saves content to a file in the working directory
func (s *Service) SaveFileContent(filePath string, content []string) error {
	fullPath := filepath.Join(s.repoPath, filePath)
	
	// Ensure the directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %v", err)
	}
	
	// Join content lines with newlines and add a final newline
	fileContent := strings.Join(content, "\n")
	if len(content) > 0 {
		fileContent += "\n"
	}
	
	// Write the file
	if err := os.WriteFile(fullPath, []byte(fileContent), 0644); err != nil {
		return fmt.Errorf("failed to write file: %v", err)
	}
	
	return nil
}

// parseFileDiff parses git diff output into structured data
func (s *Service) parseFileDiff(diffOutput, filePath, hash string) (*types.FileDiff, error) {
	lines := strings.Split(diffOutput, "\n")
	
	fileDiff := &types.FileDiff{
		Path:  filePath,
		Hunks: []types.DiffHunk{},
	}

	// Get the old and new file content for split view
	var oldContent, newContent []string

	// Get parent commit hash
	parentHash := hash + "^"
	if hash == "uncommitted" {
		parentHash = "HEAD"
		newContent, _ = s.GetFileContent("uncommitted", filePath)
		oldContent, _ = s.GetFileContent("HEAD", filePath)
	} else {
		newContent, _ = s.GetFileContent(hash, filePath)
		oldContent, _ = s.GetFileContent(parentHash, filePath)
	}

	fileDiff.OldContent = oldContent
	fileDiff.NewContent = newContent

	var currentHunk *types.DiffHunk
	oldLineNum := 0
	newLineNum := 0

	for _, line := range lines {
		if strings.HasPrefix(line, "@@") {
			// Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
			if currentHunk != nil {
				fileDiff.Hunks = append(fileDiff.Hunks, *currentHunk)
			}
			
			re := regexp.MustCompile(`@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) >= 5 {
				oldStart, _ := strconv.Atoi(matches[1])
				newStart, _ := strconv.Atoi(matches[3])
				oldLines, _ := strconv.Atoi(matches[2])
				newLines, _ := strconv.Atoi(matches[4])
				
				if oldLines == 0 {
					oldLines = 1
				}
				if newLines == 0 {
					newLines = 1
				}
				
				currentHunk = &types.DiffHunk{
					OldStart: oldStart,
					OldLines: oldLines,
					NewStart: newStart,
					NewLines: newLines,
					Header:   line,
					Lines:    []types.DiffLine{},
				}
				
				oldLineNum = oldStart
				newLineNum = newStart
			}
		} else if currentHunk != nil && !strings.HasPrefix(line, "diff") && !strings.HasPrefix(line, "index") && !strings.HasPrefix(line, "+++") && !strings.HasPrefix(line, "---") {
			diffLine := types.DiffLine{Content: line}

			if strings.HasPrefix(line, "-") {
				diffLine.Type = "deletion"
				diffLine.OldNum = oldLineNum
				oldLineNum++
			} else if strings.HasPrefix(line, "+") {
				diffLine.Type = "addition"
				diffLine.NewNum = newLineNum
				newLineNum++
			} else if strings.HasPrefix(line, " ") || line == "" {
				diffLine.Type = "context"
				diffLine.OldNum = oldLineNum
				diffLine.NewNum = newLineNum
				oldLineNum++
				newLineNum++
			}

			if diffLine.Type != "" {
				currentHunk.Lines = append(currentHunk.Lines, diffLine)
			}
		}
	}

	if currentHunk != nil {
		fileDiff.Hunks = append(fileDiff.Hunks, *currentHunk)
	}
	
	return fileDiff, nil
}

// GetCommitsByTag retrieves commits for a specific tag
func (s *Service) GetCommitsByTag(tagName string, limit int) ([]types.Commit, error) {
	return s.GetCommitsByTagWithOffset(tagName, limit, 0)
}

// GetCommitsByTagWithOffset retrieves commits for a specific tag with pagination support
func (s *Service) GetCommitsByTagWithOffset(tagName string, limit int, offset int) ([]types.Commit, error) {
	args := []string{"log", "--pretty=format:%H|%h|%s|%an|%ae|%ad|%cd|%P", "--date=iso"}
	
	// Add skip parameter for offset
	if offset > 0 {
		args = append(args, fmt.Sprintf("--skip=%d", offset))
	}
	
	if limit > 0 {
		args = append(args, fmt.Sprintf("-%d", limit))
	}
	
	// Add the tag reference
	args = append(args, tagName)

	// Use timeout for better performance
	output, err := s.runGitCommandWithTimeout(10*time.Second, args...)
	if err != nil {
		return []types.Commit{}, nil // Return empty array instead of nil
	}

	lines := strings.Split(output, "\n")
	commits := make([]types.Commit, 0, len(lines)) // Initialize with capacity

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) < 7 {
			continue
		}

		// Parse dates
		date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[5])
		commitDate, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[6])

		// Parse parents
		var parents []string
		if parts[7] != "" {
			parents = strings.Split(parts[7], " ")
		} else {
			parents = []string{} // Empty array instead of nil
		}

		// Get refs for this commit (with caching consideration)
		refs, _ := s.getCommitRefs(parts[0])

		commit := types.Commit{
			Hash:       parts[0],
			ShortHash:  parts[1],
			Message:    parts[2],
			Author:     types.Author{Name: parts[3], Email: parts[4]},
			Committer:  types.Author{Name: parts[3], Email: parts[4]},
			Date:       date,
			CommitDate: commitDate,
			Parents:    parents,
			Refs:       refs,
			Stats:      types.CommitStats{}, // Initialize with zero values
		}

		commits = append(commits, commit)
	}

	return commits, nil
}

// ApplyStash applies a stash without removing it from the stash list
func (s *Service) ApplyStash(index int) error {
	_, err := s.runGitCommand("stash", "apply", fmt.Sprintf("stash@{%d}", index))
	return err
}

// PopStash applies a stash and removes it from the stash list
func (s *Service) PopStash(index int) error {
	_, err := s.runGitCommand("stash", "pop", fmt.Sprintf("stash@{%d}", index))
	return err
}

// DropStash removes a stash from the stash list without applying it
func (s *Service) DropStash(index int) error {
	_, err := s.runGitCommand("stash", "drop", fmt.Sprintf("stash@{%d}", index))
	return err
}

// ShowStash shows the contents of a stash
func (s *Service) ShowStash(index int) (*types.Commit, error) {
	stashRef := fmt.Sprintf("stash@{%d}", index)
	
	// Get stash commit details using log command
	output, err := s.runGitCommand("log", "--format=%H|%h|%s|%an|%ae|%ad|%cd", "-1", stashRef)
	if err != nil {
		return nil, err
	}

	lines := strings.Split(output, "\n")
	if len(lines) == 0 {
		return nil, fmt.Errorf("stash not found")
	}

	parts := strings.Split(lines[0], "|")
	if len(parts) < 7 {
		return nil, fmt.Errorf("invalid stash format")
	}

	// Parse dates
	date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[5])
	commitDate, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[6])

	// Get file changes for the stash
	fileChanges, _ := s.getStashFileChanges(index)

	commit := &types.Commit{
		Hash:        parts[0],
		ShortHash:   parts[1],
		Message:     parts[2],
		Author:      types.Author{Name: parts[3], Email: parts[4]},
		Committer:   types.Author{Name: parts[3], Email: parts[4]},
		Date:        date,
		CommitDate:  commitDate,
		Parents:     []string{},
		Refs:        []string{stashRef},
		Stats:       types.CommitStats{},
		FileChanges: fileChanges,
	}

	return commit, nil
}

// getStashFileChanges gets the file changes for a stash
func (s *Service) getStashFileChanges(index int) ([]types.FileChange, error) {
	output, err := s.runGitCommand("stash", "show", "--name-status", fmt.Sprintf("stash@{%d}", index))
	if err != nil {
		return []types.FileChange{}, nil
	}

	lines := strings.Split(output, "\n")
	changes := make([]types.FileChange, 0, len(lines))

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 2 {
			status := parts[0]
			path := parts[1]

			change := types.FileChange{
				Path:   path,
				Status: status,
			}

			changes = append(changes, change)
		}
	}

	return changes, nil
}

// PullFromRemote pulls changes from a remote
func (s *Service) PullFromRemote(remote string, branch string) error {
	args := []string{"pull"}
	if remote != "" {
		args = append(args, remote)
		if branch != "" {
			args = append(args, branch)
		}
	}
	_, err := s.runGitCommand(args...)
	return err
}

// PushToRemote pushes changes to a remote
func (s *Service) PushToRemote(remote string, branch string, force bool) error {
	args := []string{"push"}
	if force {
		args = append(args, "--force")
	}
	if remote != "" {
		args = append(args, remote)
		if branch != "" {
			args = append(args, branch)
		}
	}
	_, err := s.runGitCommand(args...)
	return err
}

// GetRemoteInfo gets detailed information about a remote
func (s *Service) GetRemoteInfo(remoteName string) (*types.Remote, error) {
	output, err := s.runGitCommand("remote", "show", remoteName)
	if err != nil {
		return nil, err
	}

	remote := &types.Remote{Name: remoteName}
	
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "Fetch URL:") {
			remote.FetchURL = strings.TrimSpace(strings.TrimPrefix(line, "Fetch URL:"))
		} else if strings.HasPrefix(line, "Push  URL:") {
			remote.PushURL = strings.TrimSpace(strings.TrimPrefix(line, "Push  URL:"))
		}
	}

	return remote, nil
}

// RenameBranch renames a branch
func (s *Service) RenameBranch(oldName string, newName string) error {
	_, err := s.runGitCommand("branch", "-m", oldName, newName)
	if err == nil {
		s.invalidateBranchesCache()
	}
	return err
}

// CherryPickCommit cherry picks a commit
func (s *Service) CherryPickCommit(commitHash string) error {
	_, err := s.runGitCommand("cherry-pick", commitHash)
	return err
}

// RevertCommit reverts a commit
func (s *Service) RevertCommit(commitHash string, noCommit bool) error {
	args := []string{"revert"}
	if noCommit {
		args = append(args, "--no-commit")
	}
	args = append(args, commitHash)
	_, err := s.runGitCommand(args...)
	return err
}

// ResetBranch resets the current branch to a specific commit
func (s *Service) ResetBranch(commitHash string, resetType string) error {
	args := []string{"reset"}
	switch resetType {
	case "soft":
		args = append(args, "--soft")
	case "mixed":
		args = append(args, "--mixed")
	case "hard":
		args = append(args, "--hard")
	default:
		args = append(args, "--mixed") // default to mixed
	}
	args = append(args, commitHash)
	_, err := s.runGitCommand(args...)
	return err
}

// RebaseBranch rebases the current branch onto another branch
func (s *Service) RebaseBranch(targetBranch string, interactive bool) error {
	args := []string{"rebase"}
	if interactive {
		args = append(args, "-i")
	}
	args = append(args, targetBranch)
	_, err := s.runGitCommand(args...)
	return err
}

// CreateTag creates a new tag
func (s *Service) CreateTag(tagName string, commitHash string, message string, annotated bool) error {
	args := []string{"tag"}
	if annotated && message != "" {
		args = append(args, "-a", tagName, "-m", message)
	} else {
		args = append(args, tagName)
	}
	if commitHash != "" {
		args = append(args, commitHash)
	}
	_, err := s.runGitCommand(args...)
	if err == nil {
		s.invalidateTagsCache()
	}
	return err
}

// DeleteTag deletes a tag
func (s *Service) DeleteTag(tagName string) error {
	_, err := s.runGitCommand("tag", "-d", tagName)
	if err == nil {
		s.invalidateTagsCache()
	}
	return err
}

// PushTag pushes a tag to remote
func (s *Service) PushTag(remote string, tagName string) error {
	args := []string{"push", remote, tagName}
	_, err := s.runGitCommand(args...)
	return err
}

// PushAllTags pushes all tags to remote
func (s *Service) PushAllTags(remote string) error {
	args := []string{"push", remote, "--tags"}
	_, err := s.runGitCommand(args...)
	return err
}

// GetAnnotatedTagDetails gets detailed information about an annotated tag
func (s *Service) GetAnnotatedTagDetails(tagName string) (*types.Tag, error) {
	// First check if it's an annotated tag
	output, err := s.runGitCommand("cat-file", "-t", tagName)
	if err != nil {
		return nil, err
	}
	
	if strings.TrimSpace(output) != "tag" {
		// It's a lightweight tag, get basic info
		hashOutput, err := s.runGitCommand("rev-list", "-n", "1", tagName)
		if err != nil {
			return nil, err
		}
		
		return &types.Tag{
			Name:       tagName,
			Hash:       strings.TrimSpace(hashOutput),
			Type:       "lightweight",
			TargetHash: strings.TrimSpace(hashOutput),
		}, nil
	}
	
	// Get annotated tag details
	output, err = s.runGitCommand("cat-file", "-p", tagName)
	if err != nil {
		return nil, err
	}
	
	tag := &types.Tag{
		Name: tagName,
		Type: "annotated",
	}
	
	lines := strings.Split(output, "\n")
	var messageLines []string
	inMessage := false
	
	for _, line := range lines {
		if strings.HasPrefix(line, "object ") {
			tag.TargetHash = strings.TrimSpace(strings.TrimPrefix(line, "object "))
		} else if strings.HasPrefix(line, "tag ") {
			// Tag name is already set
		} else if strings.HasPrefix(line, "tagger ") {
			// Parse tagger info: "tagger Name <email> timestamp timezone"
			taggerInfo := strings.TrimPrefix(line, "tagger ")
			if matches := regexp.MustCompile(`^(.+) <(.+)> (\d+) ([\+\-]\d{4})$`).FindStringSubmatch(taggerInfo); len(matches) == 5 {
				tag.Tagger = types.Author{
					Name:  matches[1],
					Email: matches[2],
				}
				if timestamp, err := strconv.ParseInt(matches[3], 10, 64); err == nil {
					tag.Date = time.Unix(timestamp, 0)
				}
			}
		} else if line == "" && !inMessage {
			inMessage = true
		} else if inMessage {
			messageLines = append(messageLines, line)
		}
	}
	
	tag.Message = strings.Join(messageLines, "\n")
	tag.Message = strings.TrimSpace(tag.Message)
	
	// Get the tag's own hash
	hashOutput, err := s.runGitCommand("rev-parse", tagName)
	if err == nil {
		tag.Hash = strings.TrimSpace(hashOutput)
	}
	
	return tag, nil
}

// CreateStash creates a new stash
func (s *Service) CreateStash(message string, includeUntracked bool) error {
	args := []string{"stash", "push"}
	if includeUntracked {
		args = append(args, "-u")
	}
	if message != "" {
		args = append(args, "-m", message)
	}
	_, err := s.runGitCommand(args...)
	return err
}

// CreateBranchFromStash creates a new branch from a stash
func (s *Service) CreateBranchFromStash(branchName string, stashIndex int) error {
	_, err := s.runGitCommand("stash", "branch", branchName, fmt.Sprintf("stash@{%d}", stashIndex))
	if err == nil {
		s.invalidateBranchesCache()
	}
	return err
}

// CleanWorkingDirectory cleans untracked files from working directory
func (s *Service) CleanWorkingDirectory(dryRun bool, includeDirectories bool) (string, error) {
	args := []string{"clean"}
	if dryRun {
		args = append(args, "-n")
	} else {
		args = append(args, "-f")
	}
	if includeDirectories {
		args = append(args, "-d")
	}
	return s.runGitCommand(args...)
}

// GetUncommittedChanges gets uncommitted changes in the working directory
func (s *Service) GetUncommittedChanges() ([]types.FileChange, error) {
	changes := make([]types.FileChange, 0)
	
	// Get staged changes with stats
	stagedOutput, err := s.runGitCommand("diff", "--cached", "--numstat")
	if err == nil && stagedOutput != "" {
		for _, line := range strings.Split(stagedOutput, "\n") {
			if line == "" {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				additionsStr := parts[0]
				deletionsStr := parts[1]
				path := parts[2]
				
				// Parse additions and deletions
				additions := 0
				deletions := 0
				
				if additionsStr != "-" {
					if val, err := strconv.Atoi(additionsStr); err == nil {
						additions = val
					}
				}
				
				if deletionsStr != "-" {
					if val, err := strconv.Atoi(deletionsStr); err == nil {
						deletions = val
					}
				}
				
				// Get the status for this staged file
				statusOutput, _ := s.runGitCommand("diff", "--cached", "--name-status", "--", path)
				status := "M" // default to modified
				if statusOutput != "" {
					statusParts := strings.Fields(statusOutput)
					if len(statusParts) >= 1 {
						status = statusParts[0]
					}
				}
				
				changes = append(changes, types.FileChange{
					Path:      path,
					Status:    "staged-" + strings.ToLower(status),
					Additions: additions,
					Deletions: deletions,
				})
			}
		}
	}
	
	// Get unstaged changes with stats
	unstagedOutput, err := s.runGitCommand("diff", "--numstat")
	if err == nil && unstagedOutput != "" {
		for _, line := range strings.Split(unstagedOutput, "\n") {
			if line == "" {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				additionsStr := parts[0]
				deletionsStr := parts[1]
				path := parts[2]
				
				// Parse additions and deletions
				additions := 0
				deletions := 0
				
				if additionsStr != "-" {
					if val, err := strconv.Atoi(additionsStr); err == nil {
						additions = val
					}
				}
				
				if deletionsStr != "-" {
					if val, err := strconv.Atoi(deletionsStr); err == nil {
						deletions = val
					}
				}
				
				// Get the status for this unstaged file
				statusOutput, _ := s.runGitCommand("diff", "--name-status", "--", path)
				status := "M" // default to modified
				if statusOutput != "" {
					statusParts := strings.Fields(statusOutput)
					if len(statusParts) >= 1 {
						status = statusParts[0]
					}
				}
				
				changes = append(changes, types.FileChange{
					Path:      path,
					Status:    "unstaged-" + strings.ToLower(status),
					Additions: additions,
					Deletions: deletions,
				})
			}
		}
	}
	
	// Get untracked files (no stats available, estimate as new files)
	untrackedOutput, err := s.runGitCommand("ls-files", "--others", "--exclude-standard")
	if err == nil && untrackedOutput != "" {
		for _, line := range strings.Split(untrackedOutput, "\n") {
			if line == "" {
				continue
			}
			
			// For untracked files, try to count lines as additions
			additions := 0
			if content, err := os.ReadFile(filepath.Join(s.repoPath, line)); err == nil {
				additions = len(strings.Split(string(content), "\n"))
			}
			
			changes = append(changes, types.FileChange{
				Path:      line,
				Status:    "untracked",
				Additions: additions,
				Deletions: 0,
			})
		}
	}
	
	return changes, nil
}

// StageFile stages a file for commit
func (s *Service) StageFile(filePath string) error {
	if filePath == "" {
		return fmt.Errorf("file path cannot be empty")
	}
	_, err := s.runGitCommand("add", "--", filePath)
	if err != nil {
		return fmt.Errorf("failed to stage file %s: %v", filePath, err)
	}
	return nil
}

// UnstageFile unstages a file
func (s *Service) UnstageFile(filePath string) error {
	if filePath == "" {
		return fmt.Errorf("file path cannot be empty")
	}
	_, err := s.runGitCommand("reset", "HEAD", "--", filePath)
	if err != nil {
		return fmt.Errorf("failed to unstage file %s: %v", filePath, err)
	}
	return nil
}

// DiscardFileChanges discards changes to a file
func (s *Service) DiscardFileChanges(filePath string) error {
	if filePath == "" {
		return fmt.Errorf("file path cannot be empty")
	}
	_, err := s.runGitCommand("checkout", "HEAD", "--", filePath)
	if err != nil {
		return fmt.Errorf("failed to discard changes for file %s: %v", filePath, err)
	}
	return nil
}

// CreateCommit creates a new commit with the given message and returns the commit hash
func (s *Service) CreateCommit(message string) (string, error) {
	if message == "" {
		return "", fmt.Errorf("commit message cannot be empty")
	}
	
	_, err := s.runGitCommand("commit", "-m", message)
	if err != nil {
		return "", err
	}
	
	// Get the hash of the newly created commit
	commitHash, err := s.runGitCommand("rev-parse", "HEAD")
	if err != nil {
		return "", fmt.Errorf("failed to get commit hash: %v", err)
	}
	
	return strings.TrimSpace(commitHash), nil
}

// invalidateTagsCache invalidates the tags cache
func (s *Service) invalidateTagsCache() {
	s.cache.mu.Lock()
	defer s.cache.mu.Unlock()
	s.cache.tagsExpiry = time.Time{}
}

// invalidateRemotesCache invalidates the remotes cache
func (s *Service) invalidateRemotesCache() {
	s.cache.mu.Lock()
	defer s.cache.mu.Unlock()
	s.cache.remotesExpiry = time.Time{}
} 