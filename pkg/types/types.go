package types

import "time"

// Repository represents a Git repository
type Repository struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Current bool   `json:"current"`
}

// Author represents a commit author
type Author struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// Signature represents a Git signature with author and timestamp
type Signature struct {
	Author Author    `json:"author"`
	Date   time.Time `json:"date"`
}

// CommitStats represents commit statistics
type CommitStats struct {
	FilesChanged int `json:"filesChanged"`
	Additions    int `json:"additions"`
	Deletions    int `json:"deletions"`
}

// FileChange represents a file change in a commit
type FileChange struct {
	Path      string `json:"path"`
	Status    string `json:"status"` // A, M, D, R, C
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
	OldPath   string `json:"oldPath,omitempty"` // For renames
}

// Commit represents a Git commit
type Commit struct {
	Hash           string       `json:"hash"`
	ShortHash      string       `json:"shortHash"`
	Message        string       `json:"message"`
	Author         Author       `json:"author"`
	Committer      Author       `json:"committer"`
	Date           time.Time    `json:"date"`
	CommitDate     time.Time    `json:"commitDate"`
	Parents        []string     `json:"parents"`
	Refs           []string     `json:"refs"`
	Stats          CommitStats  `json:"stats"`
	FileChanges    []FileChange `json:"fileChanges,omitempty"`
	IsUncommitted  bool         `json:"isUncommitted,omitempty"`
}

// Branch represents a Git branch
type Branch struct {
	Name      string `json:"name"`
	Hash      string `json:"hash"`
	IsRemote  bool   `json:"isRemote"`
	IsCurrent bool   `json:"isCurrent"`
	Upstream  string `json:"upstream,omitempty"`
}

// Tag represents a Git tag
type Tag struct {
	Name       string    `json:"name"`
	Hash       string    `json:"hash"`
	Type       string    `json:"type"` // lightweight, annotated
	Message    string    `json:"message,omitempty"`
	Tagger     Author    `json:"tagger,omitempty"`
	Date       time.Time `json:"date,omitempty"`
	TargetHash string    `json:"targetHash,omitempty"`
}

// Stash represents a Git stash entry
type Stash struct {
	Index       int       `json:"index"`
	Message     string    `json:"message"`
	Branch      string    `json:"branch"`
	Hash        string    `json:"hash"`
	Date        time.Time `json:"date"`
	BaseHash    string    `json:"baseHash"`
	HasUntracked bool     `json:"hasUntracked"`
}

// Remote represents a Git remote
type Remote struct {
	Name     string `json:"name"`
	FetchURL string `json:"fetchUrl"`
	PushURL  string `json:"pushUrl"`
}

// FileDiff represents a file diff
type FileDiff struct {
	Path       string     `json:"path"`
	OldPath    string     `json:"oldPath,omitempty"`
	Status     string     `json:"status"`
	Additions  int        `json:"additions"`
	Deletions  int        `json:"deletions"`
	Hunks      []DiffHunk `json:"hunks"`
	OldContent []string   `json:"oldContent,omitempty"`
	NewContent []string   `json:"newContent,omitempty"`
}

// DiffHunk represents a diff hunk
type DiffHunk struct {
	OldStart int        `json:"oldStart"`
	OldLines int        `json:"oldLines"`
	NewStart int        `json:"newStart"`
	NewLines int        `json:"newLines"`
	Header   string     `json:"header"`
	Lines    []DiffLine `json:"lines"`
}

// DiffLine represents a line in a diff
type DiffLine struct {
	Type    string `json:"type"` // context, addition, deletion
	Content string `json:"content"`
	OldNum  int    `json:"oldNum,omitempty"`
	NewNum  int    `json:"newNum,omitempty"`
}

// GaitPoint represents a point in the commit gait
type GaitPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// GaitLine represents a line in the commit gait
type GaitLine struct {
	From  GaitPoint `json:"from"`
	To    GaitPoint `json:"to"`
	Color string     `json:"color"`
}

// CommitGait represents the visual gait data
type CommitGait struct {
	Points []GaitPoint `json:"points"`
	Lines  []GaitLine  `json:"lines"`
	Width  int          `json:"width"`
	Height int          `json:"height"`
}

// SearchRequest represents a search request
type SearchRequest struct {
	Query      string `json:"query"`
	Type       string `json:"type"` // message, author, hash, file
	MaxResults int    `json:"maxResults"`
}

// SearchResult represents a search result
type SearchResult struct {
	CommitHash string `json:"commitHash"`
	Type       string `json:"type"`
	Match      string `json:"match"`
	Context    string `json:"context"`
}

// RepoSettings represents repository settings
type RepoSettings struct {
	ShowAllBranches    bool     `json:"showAllBranches"`
	MaxCommits         int      `json:"maxCommits"`
	DateFormat         string   `json:"dateFormat"`
	GaitColors        []string `json:"gaitColors"`
	ShowUncommitted    bool     `json:"showUncommitted"`
	ShowRemoteBranches bool     `json:"showRemoteBranches"`
} 