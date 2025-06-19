// Main application initialization and global functions

// Global functions for HTML onclick handlers
function toggleSearch() {
    gAItUI.toggleSearch();
}

function refreshData() {
    // Reset lazy loading state and reload data
    gAItUI.commitsOffset = 0;
    gAItUI.hasMoreCommits = true;
    gAItUI.isSearchMode = false;
    gAItUI.loadData();
}

function handleSearch(event) {
    gAItUI.handleSearch(event);
}

function toggleSidebarSection(sectionName) {
    const section = document.getElementById(sectionName + 'Section');
    const isCollapsed = section.classList.contains('collapsed');
    
    if (isCollapsed) {
        section.classList.remove('collapsed');
    } else {
        section.classList.add('collapsed');
    }
    
    // Save state to localStorage
    saveSidebarState(sectionName, !isCollapsed);
}

function switchFullscreenDiffView(viewType) {
    gAItDiffViewer.switchFullscreenDiffView(viewType);
}

function toggleFullscreenWrap() {
    gAItDiffViewer.toggleFullscreenWrap();
}

function closeFullscreenDiff() {
    gAItDiffViewer.closeFullscreenDiff();
}

function toggleCommitInfo() {
    const commitInfo = document.querySelector('.commit-info');
    const toggleBtn = document.getElementById('detailsToggleBtn');
    
    if (!commitInfo || !toggleBtn) return;
    
    const isCollapsed = commitInfo.classList.contains('collapsed');
    
    if (isCollapsed) {
        commitInfo.classList.remove('collapsed');
        toggleBtn.classList.remove('collapsed');
    } else {
        commitInfo.classList.add('collapsed');
        toggleBtn.classList.add('collapsed');
    }
    
    // Save state to localStorage
    saveCommitInfoState(!isCollapsed);
}

// Debug function for expanded files restoration
function debugRestoreExpandedFiles() {
    if (window.gAItUI) {
        window.gAItUI.manualRestoreExpandedFiles();
    }
}

// Debug function to check and fix visual state
function debugFixVisualState() {
    if (window.gAItUI && window.gAItUI.selectedCommit) {
        window.gAItUI.ensureVisualState(window.gAItUI.selectedCommit);
    }
}

function toggleSidebar() {
    console.log('toggleSidebar() called');
    const sidebar = document.querySelector('.sidebar');
    const body = document.body;
    
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    const isCollapsed = sidebar.classList.contains('collapsed');
    console.log('Current sidebar state - isCollapsed:', isCollapsed);
    
    if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        body.classList.remove('sidebar-collapsed');
        console.log('Sidebar expanded');
    } else {
        sidebar.classList.add('collapsed');
        body.classList.add('sidebar-collapsed');
        console.log('Sidebar collapsed');
    }
    
    // Save state to localStorage
    saveSidebarCollapseState(!isCollapsed);
}

// Persistent settings
const STORAGE_KEYS = {
    PANEL_WIDTH: 'gait_panel_width',
    SIDEBAR_WIDTH: 'gait_sidebar_width',
    SIDEBAR_COLLAPSED: 'gait_sidebar_collapsed',
    SIDEBAR_MAIN_COLLAPSED: 'gait_sidebar_main_collapsed',
    COMMIT_INFO_COLLAPSED: 'gait_commit_info_collapsed',
    SELECTED_COMMIT: 'gait_selected_commit',
    EXPANDED_FILES: 'gait_expanded_files'
};

// Resizable panels functionality
let isResizing = false;
let isSidebarResizing = false;

function initializeResizablePanels() {
    const resizeHandle = document.getElementById('resizeHandle');
    const commitListContainer = document.getElementById('commitListContainer');
    const commitDetails = document.getElementById('commitDetails');
    const mainPanels = document.getElementById('mainPanels');
    
    // Restore saved width
    restorePanelWidth();
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        const startX = e.clientX;
        const startWidth = commitListContainer.offsetWidth;
        const containerWidth = mainPanels.offsetWidth;
        
        function handleMouseMove(e) {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const newWidth = startWidth + deltaX;
            const minWidth = 300;
            const maxWidth = containerWidth * 0.7;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                commitListContainer.style.flex = `0 0 ${newWidth}px`;
            }
        }
        
        function handleMouseUp() {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Save the new width
            savePanelWidth();
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
}

function initializeSidebarResize() {
    const sidebarResizeHandle = document.getElementById('sidebarResizeHandle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebarResizeHandle || !sidebar || !mainContent) return;
    
    // Restore saved sidebar width
    restoreSidebarWidth();
    
    sidebarResizeHandle.addEventListener('mousedown', function(e) {
        isSidebarResizing = true;
        sidebarResizeHandle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        const startX = e.clientX;
        const startWidth = sidebar.offsetWidth;
        const containerWidth = mainContent.offsetWidth;
        
        function handleMouseMove(e) {
            if (!isSidebarResizing) return;
            
            const deltaX = e.clientX - startX;
            const newWidth = startWidth + deltaX;
            const minWidth = 150;
            const maxWidth = Math.min(400, containerWidth * 0.4);
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                sidebar.style.width = `${newWidth}px`;
            }
        }
        
        function handleMouseUp() {
            isSidebarResizing = false;
            sidebarResizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Save the new sidebar width
            saveSidebarWidth();
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
}

// Save panel width to localStorage
function savePanelWidth() {
    const commitListContainer = document.getElementById('commitListContainer');
    const mainPanels = document.getElementById('mainPanels');
    
    if (commitListContainer && mainPanels) {
        const width = commitListContainer.offsetWidth;
        const containerWidth = mainPanels.offsetWidth;
        const percentage = (width / containerWidth) * 100;
        
        localStorage.setItem(STORAGE_KEYS.PANEL_WIDTH, percentage.toString());
    }
}

// Restore panel width from localStorage
function restorePanelWidth() {
    const savedPercentage = localStorage.getItem(STORAGE_KEYS.PANEL_WIDTH);
    
    if (savedPercentage) {
        const commitListContainer = document.getElementById('commitListContainer');
        const mainPanels = document.getElementById('mainPanels');
        
        if (commitListContainer && mainPanels) {
            const percentage = parseFloat(savedPercentage);
            const containerWidth = mainPanels.offsetWidth;
            const width = (containerWidth * percentage) / 100;
            
            // Apply constraints
            const minWidth = 300;
            const maxWidth = containerWidth * 0.7;
            const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));
            
            commitListContainer.style.flex = `0 0 ${constrainedWidth}px`;
        }
    }
}

// Save sidebar width to localStorage
function saveSidebarWidth() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent && !sidebar.classList.contains('collapsed')) {
        const width = sidebar.offsetWidth;
        const containerWidth = mainContent.offsetWidth;
        const percentage = (width / containerWidth) * 100;
        
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_WIDTH, percentage.toString());
    }
}

// Restore sidebar width from localStorage
function restoreSidebarWidth() {
    const savedPercentage = localStorage.getItem(STORAGE_KEYS.SIDEBAR_WIDTH);
    
    if (savedPercentage) {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar && mainContent && !sidebar.classList.contains('collapsed')) {
            const percentage = parseFloat(savedPercentage);
            const containerWidth = mainContent.offsetWidth;
            const width = (containerWidth * percentage) / 100;
            
            // Apply constraints
            const minWidth = 150;
            const maxWidth = Math.min(400, containerWidth * 0.4);
            const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));
            
            sidebar.style.width = `${constrainedWidth}px`;
        }
    }
}

// Save sidebar section state
function saveSidebarState(sectionName, isCollapsed) {
    const key = STORAGE_KEYS.SIDEBAR_COLLAPSED + '_' + sectionName;
    localStorage.setItem(key, isCollapsed.toString());
}

// Save main sidebar collapse state
function saveSidebarCollapseState(isCollapsed) {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_MAIN_COLLAPSED, isCollapsed.toString());
}

// Save commit info collapse state
function saveCommitInfoState(isCollapsed) {
    localStorage.setItem(STORAGE_KEYS.COMMIT_INFO_COLLAPSED, isCollapsed.toString());
}

// Save selected commit hash
function saveSelectedCommit(commitHash) {
    if (commitHash) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_COMMIT, commitHash);
    } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_COMMIT);
    }
}

// Get saved selected commit hash
function getSavedSelectedCommit() {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_COMMIT);
}

// Save expanded files state
function saveExpandedFiles(expandedFiles) {
    const expandedArray = Array.from(expandedFiles);
    localStorage.setItem(STORAGE_KEYS.EXPANDED_FILES, JSON.stringify(expandedArray));
}

// Get saved expanded files
function getSavedExpandedFiles() {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPANDED_FILES);
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return new Set(parsed);
        } catch (error) {
            console.warn('Failed to parse saved expanded files:', error);
            return new Set();
        }
    }
    return new Set();
}

// Clear expanded files for a specific commit
function clearExpandedFilesForCommit(commitHash) {
    const expandedFiles = getSavedExpandedFiles();
    const toRemove = Array.from(expandedFiles).filter(key => key.startsWith(commitHash + '-'));
    toRemove.forEach(key => expandedFiles.delete(key));
    saveExpandedFiles(expandedFiles);
}

// Clean up old expanded files (keep only recent commits)
function cleanupExpandedFiles(currentCommits) {
    const expandedFiles = getSavedExpandedFiles();
    const currentCommitHashes = new Set(currentCommits.map(commit => commit.hash));
    
    // Only remove expanded files that are clearly old (more conservative approach)
    // Keep files for commits that might be loaded later or are in different branches
    const toRemove = Array.from(expandedFiles).filter(key => {
        const commitHash = key.split('-')[0];
        // Only remove if we have a substantial number of commits loaded and the commit is definitely not in the current set
        // This prevents premature cleanup during initial loads
        return currentCommits.length > 20 && !currentCommitHashes.has(commitHash);
    });
    
    if (toRemove.length > 0) {
        toRemove.forEach(key => expandedFiles.delete(key));
        saveExpandedFiles(expandedFiles);
    }
}

// Restore commit info collapse state
function restoreCommitInfoState() {
    const isCollapsed = localStorage.getItem(STORAGE_KEYS.COMMIT_INFO_COLLAPSED) === 'true';
    
    if (isCollapsed) {
        const commitInfo = document.querySelector('.commit-info');
        const toggleBtn = document.getElementById('detailsToggleBtn');
        
        if (commitInfo && toggleBtn) {
            commitInfo.classList.add('collapsed');
            toggleBtn.classList.add('collapsed');
        }
    }
}

// Restore sidebar section state
function restoreSidebarState() {
    const sections = ['branches', 'tags', 'stashes', 'remotes'];
    
    sections.forEach(sectionName => {
        const key = STORAGE_KEYS.SIDEBAR_COLLAPSED + '_' + sectionName;
        const isCollapsed = localStorage.getItem(key) === 'true';
        
        if (isCollapsed) {
            const section = document.getElementById(sectionName + 'Section');
            if (section) {
                section.classList.add('collapsed');
            }
        }
    });
}

// Restore main sidebar collapse state
function restoreSidebarCollapseState() {
    const isCollapsed = localStorage.getItem(STORAGE_KEYS.SIDEBAR_MAIN_COLLAPSED) === 'true';
    
    if (isCollapsed) {
        const sidebar = document.querySelector('.sidebar');
        const body = document.body;
        if (sidebar) {
            sidebar.classList.add('collapsed');
            body.classList.add('sidebar-collapsed');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Wait for gAItUI to be available
    if (typeof gAItUI !== 'undefined') {
        // Initialize UI components
        gAItUI.loadData();
        gAItUI.initializeScrollListener();
    } else {
        console.error('gAItUI is not defined. Make sure ui.js is loaded before main.js');
    }
    
    initializeResizablePanels();
    initializeSidebarResize();
    restoreSidebarState();
    restoreSidebarCollapseState();
    restoreCommitInfoState();
    
    // Restore panel width after a short delay to ensure DOM is ready
    setTimeout(restorePanelWidth, 100);
    setTimeout(restoreSidebarWidth, 100);
});

// Handle window resize to maintain panel proportions
window.addEventListener('resize', function() {
    setTimeout(restorePanelWidth, 100);
    setTimeout(restoreSidebarWidth, 100);
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 'f':
                event.preventDefault();
                toggleSearch();
                break;
            case 'r':
                event.preventDefault();
                refreshData();
                break;
            case 'b':
                event.preventDefault();
                toggleSidebar();
                break;
            case 'i':
                event.preventDefault();
                toggleCommitInfo();
                break;
            case 'e':
                event.preventDefault();
                if (gAItUI.selectedCommit) {
                    gAItUI.collapseAllFiles();
                }
                break;
        }
    }
    
    if (event.key === 'Escape') {
        if (document.getElementById('fullscreenOverlay').classList.contains('active')) {
            closeFullscreenDiff();
        } else if (gAItUI.searchVisible) {
            toggleSearch();
        } else if (gAItUI.selectedCommit) {
            // Clear selected commit if no other overlays are active
            gAItUI.clearSelectedCommit();
        }
    }
}); 