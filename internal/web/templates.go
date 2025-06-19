package web

import (
	"embed"
	"html/template"
	"net/http"
	"path/filepath"
	"time"

	"github.com/knoxai/gait/pkg/types"
)

//go:embed static/*
var staticFiles embed.FS

// TemplateData holds data for template rendering
type TemplateData struct {
	RepoName string
	Title    string
	Commits  []types.Commit
	Branches []types.Branch
	Tags     []types.Tag
	Stashes  []types.Stash
	Remotes  []types.Remote
	HasMore  bool
	Offset   int
	Limit    int
}

// CommitListData holds data for partial commit list rendering
type CommitListData struct {
	Commits []types.Commit
	HasMore bool
	Offset  int
}

// Server handles web requests
type Server struct {
	repoName string
	template *template.Template
	commitListTemplate *template.Template
	dashboardTemplate *template.Template
}

// NewServer creates a new web server with embedded templates
func NewServer(repoName string) *Server {
	// Create template function map
	funcMap := template.FuncMap{
		"formatDate": formatDate,
		"escapeHtml": template.HTMLEscapeString,
		"shortHash":  func(hash string) string {
			if len(hash) > 7 {
				return hash[:7]
			}
			return hash
		},
	}

	// Parse the main template with helper functions
	tmpl := template.Must(template.New("main").Funcs(funcMap).Parse(optimizedTemplate))

	// Parse the commit list partial template
	commitListTmpl := template.Must(template.New("commitList").Funcs(funcMap).Parse(commitListTemplate))

	// Parse the dashboard template
	dashboardTmpl := template.Must(template.New("dashboard").Funcs(funcMap).Parse(dashboardTemplate))
	
	return &Server{
		repoName: repoName,
		template: tmpl,
		commitListTemplate: commitListTmpl,
		dashboardTemplate: dashboardTmpl,
	}
}

// ServeIndex serves the main HTML page using embedded template
func (s *Server) ServeIndex(w http.ResponseWriter, r *http.Request) {
	data := TemplateData{
		RepoName: s.repoName,
		Title:    "GAIT - " + s.repoName,
	}

	w.Header().Set("Content-Type", "text/html")
	if err := s.template.Execute(w, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

// ServeCommitList serves server-rendered commit list for better performance
func (s *Server) ServeCommitList(w http.ResponseWriter, r *http.Request, commits []types.Commit, hasMore bool, offset int) {
	data := CommitListData{
		Commits: commits,
		HasMore: hasMore,
		Offset:  offset,
	}

	w.Header().Set("Content-Type", "text/html")
	if err := s.commitListTemplate.Execute(w, data); err != nil {
		http.Error(w, "Template execution error", http.StatusInternalServerError)
		return
	}
}

// ServeStatic serves static files (CSS, JS)
func (s *Server) ServeStatic(w http.ResponseWriter, r *http.Request) {
	// Remove /static/ prefix
	path := r.URL.Path[8:]
	
	// Set appropriate content type
	switch filepath.Ext(path) {
	case ".css":
		w.Header().Set("Content-Type", "text/css")
	case ".js":
		w.Header().Set("Content-Type", "application/javascript")
	}
	
	// Serve from embedded files
	data, err := staticFiles.ReadFile("static/" + path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	
	w.Write(data)
}

// ServeDashboard serves the enhanced ADES dashboard
func (s *Server) ServeDashboard(w http.ResponseWriter, r *http.Request) {
	data := TemplateData{
		RepoName: s.repoName,
		Title:    "ADES Dashboard - " + s.repoName,
	}

	w.Header().Set("Content-Type", "text/html")
	if err := s.dashboardTemplate.Execute(w, data); err != nil {
		http.Error(w, "Dashboard template execution error", http.StatusInternalServerError)
		return
	}
}

// UpdateRepoName updates the repository name
func (s *Server) UpdateRepoName(repoPath string) {
	s.repoName = filepath.Base(repoPath)
}

// formatDate formats a time.Time to a readable string
func formatDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02 15:04")
}

// Commit list partial template for server-side rendering
const commitListTemplate = `{{range .Commits}}
<li class="commit-item" onclick="gAItUI.selectCommit('{{.Hash}}')" data-hash="{{.Hash}}">
    <div class="commit-hash">{{shortHash .Hash}}</div>
    <div class="commit-message">{{escapeHtml .Message}}</div>
    <div class="commit-meta">
        <span class="commit-author">{{escapeHtml .Author.Name}}</span>
        <span class="commit-date">{{formatDate .Date}}</span>
    </div>
</li>
{{end}}
{{if .HasMore}}
<li class="loading-more">
    <div class="loading">Loading more commits...</div>
</li>
{{else}}
<li class="end-indicator">
    <div class="loading">📜 All commits loaded</div>
</li>
{{end}}`

// Optimized HTML template with comprehensive Git Operations
const optimizedTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" href="/static/assets/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}}</title>
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="stylesheet" href="/static/css/sidebar.css">
    <link rel="stylesheet" href="/static/css/commit-list.css">
    <link rel="stylesheet" href="/static/css/commit-details.css">
    <link rel="stylesheet" href="/static/css/diff-viewer.css">

</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="logo-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 41" fillRule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" class="logo-icon"> 
                    <path d="M16.19 1.034a3.508 3.508 0 0 1 3.501 0L33.936 9.26a3.505 3.505 0 0 1 1.751 3.032v16.451c0 1.25-.668 2.406-1.751 3.032L19.691 40a3.508 3.508 0 0 1-3.501 0 66030.71 66030.71 0 0 0-14.246-8.225 3.507 3.507 0 0 1-1.75-3.032V12.292c0-1.249.668-2.407 1.75-3.032L16.19 1.034z" fill="#20c997"/> 
                    <path d="m0 30.766 9.437-10.249 8.529 20.493L0 30.766z" fill="#F6C000"/> 
                    <path d="M9.437 20.517.124 10.198 0 30.766l9.437-10.249z" fill="#20c997"/> 
                    <path d="M9.437 20.517 17.966.023.124 10.198l9.313 10.32v-.001z" fill="#7239EA"/> 
                    <path d="m17.966.023 17.747 30.741L9.437 20.517" fill="#464852"/> 
                    <path d="m17.966 41.045 17.747-10.279L9.437 20.517l8.529 20.528z" fill="#107EFF"/> 
                    <path d="M35.713 30.764V10.27L17.966.023l17.747 30.741z" fill="#FF3767"/> 
                    <path d="m15.375 12.445 8.595 8.595-8.595 8.596-2.253-2.253 6.342-6.343-6.342-6.342 2.253-2.253z" fill="#1a67fd" fillOpacity="0.5"/> 
                    <path d="m23.97 20.03-2.253-2.254-8.595 8.596 2.253 2.253 8.595-8.596v.001z" fill="#d6ffff"/>
                    <path d="m15.375 11.434-2.253 2.253 8.595 8.595 2.253-2.253-8.595-8.595z" fill="#d6ffff"/> 
                </svg>
                <div class="logo-text">
                    <span class="brand-name">ADES</span>
                    <span class="brand-tagline">AI Dev Experience System</span>
                </div>
            </div>
        </div>
        <div class="header-center">
            <div class="git-operations-toolbar">
                <div class="toolbar-group">
                    <button class="toolbar-btn" onclick="gAItUI.showGitOperationsMenu('branch')" title="Branch Operations">
                        <span class="btn-icon">🌿</span>
                        <span class="btn-text">Branch</span>
                        <span class="btn-arrow">▼</span>
                    </button>
                    <button class="toolbar-btn" onclick="gAItUI.showGitOperationsMenu('remote')" title="Remote Operations">
                        <span class="btn-icon">🌐</span>
                        <span class="btn-text">Remote</span>
                        <span class="btn-arrow">▼</span>
                    </button>
                    <button class="toolbar-btn" onclick="gAItUI.showGitOperationsMenu('stash')" title="Stash Operations">
                        <span class="btn-icon">📦</span>
                        <span class="btn-text">Stash</span>
                        <span class="btn-arrow">▼</span>
                    </button>
                    <button class="toolbar-btn" onclick="gAItUI.showGitOperationsMenu('tag')" title="Tag Operations">
                        <span class="btn-icon">🏷️</span>
                        <span class="btn-text">Tag</span>
                        <span class="btn-arrow">▼</span>
                    </button>
                </div>
                <div class="toolbar-separator"></div>
                <div class="toolbar-group">
                    <button class="toolbar-btn" onclick="gAItUI.performQuickOperation('fetch')" title="Fetch from all remotes">
                        <span class="btn-icon">📥</span>
                        <span class="btn-text">Fetch</span>
                    </button>
                    <button class="toolbar-btn" onclick="gAItUI.performQuickOperation('pull')" title="Pull current branch">
                        <span class="btn-icon">⬇️</span>
                        <span class="btn-text">Pull</span>
                    </button>
                    <button class="toolbar-btn" onclick="gAItUI.performQuickOperation('push')" title="Push current branch">
                        <span class="btn-icon">⬆️</span>
                        <span class="btn-text">Push</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="controls">
            <button class="btn" onclick="window.location.href='/dashboard'">🚀 Dashboard</button>
            <button class="btn" onclick="toggleSearch()">Search (Ctrl+F)</button>
            <button class="btn secondary" onclick="refreshData()">Refresh (Ctrl+R)</button>
        </div>
    </div>
    
    <div class="main-content">
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="repo-name">{{.RepoName}}</div>
            </div>
            
            <!-- Repository Management Section -->
            <div class="sidebar-section repository-section" id="repositoriesSection">
                <div id="repositoryList">
                    <div class="loading">Loading repositories...</div>
                </div>
            </div>
            
            <div class="sidebar-section" id="branchesSection">
                <h3 onclick="toggleSidebarSection('branches')">
                    <span>Branches</span>
                    <span class="toggle-icon">▼</span>
                </h3>
                <div class="section-content">
                    <ul class="sidebar-list" id="branchesList">
                        <li class="loading">Loading...</li>
                    </ul>
                </div>
            </div>
            
            <div class="sidebar-section" id="tagsSection">
                <h3 onclick="toggleSidebarSection('tags')">
                    <span>Tags</span>
                    <span class="toggle-icon">▼</span>
                </h3>
                <div class="section-content">
                    <ul class="sidebar-list" id="tagsList">
                        <li class="loading">Loading...</li>
                    </ul>
                </div>
            </div>
            
            <div class="sidebar-section" id="stashesSection">
                <h3 onclick="toggleSidebarSection('stashes')">
                    <span>Stashes</span>
                    <span class="toggle-icon">▼</span>
                </h3>
                <div class="section-content">
                    <ul class="sidebar-list" id="stashesList">
                        <li class="loading">Loading...</li>
                    </ul>
                </div>
            </div>
            
            <div class="sidebar-section" id="remotesSection">
                <h3 onclick="toggleSidebarSection('remotes')">
                    <span>Remotes</span>
                    <span class="toggle-icon">▼</span>
                </h3>
                <div class="section-content">
                    <ul class="sidebar-list" id="remotesList">
                        <li class="loading">Loading...</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="sidebar-resize-handle" id="sidebarResizeHandle"></div>
        
        <div class="commit-area">
            <div class="search-box" id="searchBox" style="display: none;">
                <input type="text" class="search-input" id="searchInput" placeholder="Search commits..." onkeyup="handleSearch(event)">
            </div>
            
            <div style="display: flex; flex: 1; overflow: hidden;" id="mainPanels">
                <div class="commit-list-container" id="commitListContainer">
                    <ul class="commit-list" id="commitsList">
                        <li class="loading">Loading commits...</li>
                    </ul>
                </div>
                
                <div class="resize-handle" id="resizeHandle"></div>
                
                <div class="commit-details hidden" id="commitDetails">
                    <div class="details-header">
                        				<span id="detailsTitle">Commit Details</span>
                        <button class="details-toggle-btn" id="detailsToggleBtn" onclick="toggleCommitInfo()" title="Toggle commit info (Ctrl+I)">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="details-content" id="detailsContent">
                        <div class="loading">Select a commit to view details</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="status-bar" id="statusBar">
        <div class="status-bar-left">
            <button class="sidebar-toggle-btn" onclick="toggleSidebar()" title="Toggle Sidebar (Ctrl+B)">
                <span class="sidebar-toggle-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" fill-rule="evenodd" d="M21.89 4.287v15.425H9.013V4.287zm1.442-1.44c-.383-.383-.892-.56-1.41-.56H2.078c-.517 0-1.026.177-1.409.56c-.382.382-.559.89-.559 1.408v15.49c0 .517.177 1.026.56 1.408c.382.382.89.56 1.408.56h19.846a1.97 1.97 0 0 0 1.409-.56c.382-.382.559-.891.559-1.409V4.255c0-.517-.177-1.026-.56-1.409M6.888 6.306a.75.75 0 0 0-.75-.75H3.234a.75.75 0 1 0 0 1.5h2.904a.75.75 0 0 0 .75-.75m-.75 3.124a.75.75 0 0 1 0 1.5H3.234a.75.75 0 0 1 0-1.5zm.75 4.506a.75.75 0 0 0-.75-.75H3.234a.75.75 0 0 0 0 1.5h2.904a.75.75 0 0 0 .75-.75m-.75 3.006a.75.75 0 0 1 0 1.5H4.879a.75.75 0 0 1 0-1.5z" clip-rule="evenodd"/></svg>
                </span>
            </button>
            <span class="status-message">Ready</span>
        </div>
        <div class="status-bar-right">
            <!-- Additional status information can be added here -->
        </div>
    </div>
    
    <!-- Custom Modal System -->
    <div class="modal-overlay" id="modalOverlay">
        <div class="modal-container" id="modalContainer">
            <div class="modal-header">
                <h3 class="modal-title" id="modalTitle">Modal Title</h3>
                <button class="modal-close" id="modalClose" onclick="closeModal()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 7.293L13.854 1.44a.5.5 0 0 1 .707.707L8.707 8l5.854 5.854a.5.5 0 0 1-.707.707L8 8.707l-5.854 5.854a.5.5 0 0 1-.707-.707L7.293 8 1.44 2.146a.5.5 0 0 1 .707-.707L8 7.293z"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" id="modalBody">
                <!-- Modal content will be inserted here -->
            </div>
            <div class="modal-footer" id="modalFooter">
                <button class="modal-btn modal-btn-secondary" id="modalCancel" onclick="closeModal()">Cancel</button>
                <button class="modal-btn modal-btn-primary" id="modalConfirm">Confirm</button>
            </div>
        </div>
    </div>
    
    <!-- Commit Dialog Template -->
    <template id="commitDialogTemplate">
        <div class="commit-dialog">
            <div class="form-group">
                <label for="commitMessage" class="form-label">Commit Message</label>
                <textarea 
                    id="commitMessage" 
                    class="form-textarea" 
                    placeholder="Enter your commit message here..."
                    rows="4"
                    maxlength="500"
                    autofocus
                ></textarea>
                <div class="form-help">
                    <span class="char-counter">0 / 500</span>
                    <span class="form-tip">Describe what changes you made and why</span>
                </div>
            </div>
            <div class="commit-options">
                <label class="checkbox-label">
                    <input type="checkbox" id="amendCommit" class="form-checkbox">
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Amend previous commit</span>
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="signoffCommit" class="form-checkbox">
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Add Signed-off-by line</span>
                </label>
            </div>
        </div>
    </template>
    
    <!-- Input Dialog Template -->
    <template id="inputDialogTemplate">
        <div class="input-dialog">
            <div class="form-group">
                <label for="dialogInput" class="form-label" id="inputLabel">Input</label>
                <input 
                    type="text" 
                    id="dialogInput" 
                    class="form-input" 
                    placeholder=""
                    autofocus
                >
                <div class="form-help" id="inputHelp" style="display: none;">
                    <span class="form-tip" id="inputTip"></span>
                </div>
            </div>
        </div>
    </template>
    
    <!-- Confirmation Dialog Template -->
    <template id="confirmDialogTemplate">
        <div class="confirm-dialog">
            <div class="confirm-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            </div>
            <div class="confirm-content">
                <p class="confirm-message" id="confirmMessage">Are you sure?</p>
                <p class="confirm-details" id="confirmDetails" style="display: none;"></p>
            </div>
        </div>
    </template>
    
    <!-- Warning Dialog Template -->
    <template id="warningDialogTemplate">
        <div class="warning-dialog">
            <div class="warning-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
            </div>
            <div class="warning-content">
                <p class="warning-message" id="warningMessage">Warning!</p>
                <p class="warning-details" id="warningDetails" style="display: none;"></p>
            </div>
        </div>
    </template>
    
    <!-- Fullscreen Diff Overlay -->
    <div class="fullscreen-overlay" id="fullscreenOverlay">
        <div class="fullscreen-header">
            <div class="fullscreen-title" id="fullscreenTitle">Diff Viewer</div>
            <div class="fullscreen-controls">
                <div class="diff-view-toggle">
                    <button class="diff-view-btn active" id="fullscreenSplitBtn" onclick="switchFullscreenDiffView('split')">Split</button>
                    <button class="diff-view-btn" id="fullscreenUnifiedBtn" onclick="switchFullscreenDiffView('unified')">Unified</button>
                </div>
                <button class="diff-wrap-btn active" id="fullscreenWrapBtn" onclick="toggleFullscreenWrap()">Wrap</button>
                <button class="fullscreen-close" onclick="closeFullscreenDiff()">Close</button>
            </div>
        </div>
        <div class="fullscreen-content">
            <div class="fullscreen-diff-content" id="fullscreenDiffContent">
                <div class="loading">Loading diff...</div>
            </div>
        </div>
    </div>
    <script src="/static/js/api.js"></script>
    <script src="/static/js/clipboard.js"></script>
    <script src="/static/js/modal.js"></script>
    <script src="/static/js/ui.js"></script>
    <script src="/static/js/diff-viewer.js"></script>
    <script src="/static/js/main.js"></script>
    
    <script>
        // Enhanced status bar handler for new structure
        (function() {
            const statusBar = document.getElementById('statusBar');
            const statusMessage = statusBar ? statusBar.querySelector('.status-message') : null;
            
            if (statusMessage) {
                // Mark status bar as structured to prevent direct text updates
                statusBar.classList.add('structured');
                
                // Override the textContent setter to update the status message instead
                const originalTextContentDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'textContent');
                Object.defineProperty(statusBar, 'textContent', {
                    get: function() {
                        return statusMessage.textContent;
                    },
                    set: function(value) {
                        statusMessage.textContent = value;
                    },
                    configurable: true
                });
            }
        })();
    </script>
</body>
</html>`

// Enhanced Dashboard Template for Sprint 6
const dashboardTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADES Dashboard - {{.RepoName}}</title>
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="stylesheet" href="/static/css/dashboard.css">
    <script src="/static/js/chart.min.js"></script>
    <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <div class="dashboard-header">
            <div class="header-left">
                <h1 class="dashboard-title">ADES Dashboard - {{.RepoName}}</h1>
            </div>
            <div class="dashboard-controls">
                <div class="real-time-indicator">
                    <div class="real-time-dot"></div>
                    <span class="real-time-text">Live</span>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="realtime-toggle" checked>
                    <span class="toggle-slider"></span>
                </label>
                <button class="interactive-button" onclick="window.adesDashboard.refreshDashboard()">
                    Refresh
                </button>
                <button class="interactive-button" onclick="window.location.href='/'">
                    Git View
                </button>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <!-- Statistics Overview -->
            <div class="dashboard-card slide-in-left">
                <div class="card-header">
                    <h2 class="card-title">Repository Statistics</h2>
                    <span class="card-icon">📊</span>
                </div>
                <div class="card-content">
                    <div class="stats-grid">
                        <!-- Stats will be populated by JavaScript -->
                    </div>
                </div>
            </div>

            <!-- Commit Trends Chart -->
            <div class="dashboard-card slide-in-right">
                <div class="card-header">
                    <h2 class="card-title">Commit Activity</h2>
                    <span class="card-icon">📈</span>
                </div>
                <div class="card-content">
                    <div class="visualization-container">
                        <canvas id="commitTrendChart"></canvas>
                        <div class="chart-loading">
                            <div class="loading-spinner"></div>
                            <span>Loading...</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Language Distribution -->
            <div class="dashboard-card fade-in">
                <div class="card-header">
                    <h2 class="card-title">Language Distribution</h2>
                    <span class="card-icon">🌐</span>
                </div>
                <div class="card-content">
                    <div class="visualization-container">
                        <canvas id="languageChart"></canvas>
                        <div class="chart-loading">
                            <div class="loading-spinner"></div>
                            <span>Analyzing...</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Developer Activity -->
            <div class="dashboard-card fade-in">
                <div class="card-header">
                    <h2 class="card-title">Developer Contributions</h2>
                    <span class="card-icon">👥</span>
                </div>
                <div class="card-content">
                    <div class="visualization-container">
                        <canvas id="developerChart"></canvas>
                        <div class="chart-loading">
                            <div class="loading-spinner"></div>
                            <span>Loading...</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Semantic Analysis -->
            <div class="dashboard-card slide-in-left">
                <div class="card-header">
                    <h2 class="card-title">Semantic Trends</h2>
                    <span class="card-icon">🧠</span>
                </div>
                <div class="card-content">
                    <div class="visualization-container">
                        <canvas id="semanticChart"></canvas>
                        <div class="chart-loading">
                            <div class="loading-spinner"></div>
                            <span>Analyzing semantic patterns...</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Knowledge Graph -->
            <div class="dashboard-card slide-in-right">
                <div class="card-header">
                    <h2 class="card-title">Knowledge Graph</h2>
                    <span class="card-icon">🕸️</span>
                </div>
                <div class="card-content">
                    <div class="knowledge-graph-container">
                        <!-- Graph will be rendered by D3.js -->
                    </div>
                </div>
            </div>

            <!-- Development Timeline -->
            <div class="dashboard-card fade-in">
                <div class="card-header">
                    <h2 class="card-title">Development Timeline</h2>
                    <span class="card-icon">⏰</span>
                </div>
                <div class="card-content">
                    <div class="timeline-container">
                        <!-- Timeline will be populated by JavaScript -->
                    </div>
                </div>
            </div>

            <!-- AI Insights -->
            <div class="dashboard-card slide-in-left">
                <div class="card-header">
                    <h2 class="card-title">AI Insights</h2>
                    <span class="card-icon">🤖</span>
                </div>
                <div class="card-content">
                    <div class="insights-panel">
                        <!-- Insights will be populated by JavaScript -->
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="dashboard-card slide-in-right">
                <div class="card-header">
                    <h2 class="card-title">Quick Actions</h2>
                    <span class="card-icon">⚡</span>
                </div>
                <div class="card-content">
                    <div class="actions-grid">
                        <button class="interactive-button" data-action="analyze-repository">
                            🔍 Analyze Repository
                        </button>
                        <button class="interactive-button" data-action="export-insights">
                            📤 Export Insights
                        </button>
                        <button class="interactive-button" data-action="view-patterns">
                            🔍 View Patterns
                        </button>
                        <button class="interactive-button" onclick="window.location.href='/api/ades/knowledge/export'">
                            📊 Export Knowledge Graph
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Notification Container -->
    <div id="notification-container"></div>

    <script src="/static/js/dashboard.js"></script>

</body>
</html>` 