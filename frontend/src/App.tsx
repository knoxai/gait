import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Toaster } from "@/components/ui/sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useTranslation } from "react-i18next"
import { useGitData } from "@/hooks/useGitData"
import { useNotifications } from "@/hooks/useNotifications"
import type { Commit } from "@/lib/types"
import { 
  ChevronDown, 
  GitBranch, 
  Globe, 
  Archive, 
  Tag, 
  Download, 
  Upload, 
  ArrowUp, 
  BarChart3, 
  Search, 
  RotateCcw,
  Folder,
  ChevronRight,
  Copy,
  X,
  Clock,
  User,
  Eye,
  RefreshCw,
  GitMerge,
  GitFork,
  Trash2,
  FolderPlus
} from "lucide-react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { RepositorySidebar } from "@/components/RepositorySidebar"

function App() {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const {
    repositories,
    currentRepository,
    commits,
    branches,
    tags,
    stashes,
    remotes,
    selectedCommit,
    searchQuery,
    searchResults,
    isLoading,
    hasMore,
    expandedFiles,
    expandedCommits,
    loadMoreCommits,
    loadCommitDetails,
    search,
    clearSearch,
    cherryPickCommit,
    revertCommit,
    checkoutBranch,
    fetch,
    toggleFileExpansion,
    toggleCommitExpansion,
    refreshData,
    setSelectedCommit,
    addRepository,
    cloneRepository,
    removeRepository,
    switchRepository,
    clearRepository,
    discoverRepositories
  } = useGitData()

  const [showSearch, setShowSearch] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [showAddRepoDialog, setShowAddRepoDialog] = useState(false)
  const [showCloneRepoDialog, setShowCloneRepoDialog] = useState(false)
  const [addRepoPath, setAddRepoPath] = useState("")
  const [cloneRepoUrl, setCloneRepoUrl] = useState("")
  const [cloneRepoName, setCloneRepoName] = useState("")

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault()
            setShowSearch(true)
            break
          case 'r':
            e.preventDefault()
            refreshData()
            break
          case 'b':
            e.preventDefault()
            setSidebarCollapsed(!sidebarCollapsed)
            break
        }
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        clearSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarCollapsed, clearSearch, refreshData])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
    if (query.trim()) {
      search(query)
    } else {
      clearSearch()
    }
  }, [search, clearSearch])

  // Handle commit selection and expansion
  const handleCommitSelect = useCallback((commit: Commit) => {
    const isExpanded = expandedCommits.includes(commit.hash)
    
    if (isExpanded) {
      // If already expanded, collapse it
      toggleCommitExpansion(commit.hash)
      setSelectedCommit(null)
    } else {
      // If not expanded, expand it and load details
      toggleCommitExpansion(commit.hash)
      setSelectedCommit(commit)
      loadCommitDetails(commit.hash)
    }
  }, [expandedCommits, toggleCommitExpansion, setSelectedCommit, loadCommitDetails])

  // Get status color for file changes
  const getStatusColor = (status: string) => {
    switch (status) {
      case "modified": return "text-yellow-500"
      case "deleted": return "text-red-500" 
      case "added": return "text-green-500"
      case "staged": return "text-blue-500"
      case "untracked": return "text-gray-500"
      default: return "text-muted-foreground"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "modified": return "M"
      case "deleted": return "D"
      case "added": return "A"
      case "staged": return "S"
      case "untracked": return "?"
      default: return "?"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const shortHash = (hash: string) => hash.substring(0, 7)

  // Helper function to handle operations with notifications
  const handleOperation = async (operation: () => Promise<void>, successMessage: string) => {
    try {
      await operation()
      addNotification({
        type: 'success',
        title: 'Success',
        message: successMessage
      })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Operation failed'
      })
    }
  }

  // Repository management handlers
  const handleAddRepository = async () => {
    if (!addRepoPath.trim()) return
    
    await handleOperation(
      () => addRepository(addRepoPath.trim()),
      'Repository added successfully'
    )
    
    setAddRepoPath("")
    setShowAddRepoDialog(false)
  }

  const handleCloneRepository = async () => {
    if (!cloneRepoUrl.trim()) return
    
    await handleOperation(
      () => cloneRepository(cloneRepoUrl.trim(), cloneRepoName.trim()),
      'Repository cloned successfully'
    )
    
    setCloneRepoUrl("")
    setCloneRepoName("")
    setShowCloneRepoDialog(false)
  }

  const handleSwitchRepository = async (path: string) => {
    await handleOperation(
      () => switchRepository(path),
      `Switched to repository`
    )
  }

  const handleRemoveRepository = async (path: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the managed repositories?\n\nNote: This will only remove it from GAIT's management - the actual repository files will not be deleted.`)) {
      return
    }

    await handleOperation(
      () => removeRepository(path),
      'Repository removed successfully'
    )
  }

  const handleDiscoverRepositories = async () => {
    await handleOperation(
      async () => {
        const result = await discoverRepositories(3)
        addNotification({
          type: 'success',
          title: 'Discovery Complete',
          message: `Discovered ${result.repositories.length} repositories`
        })
      },
      ''
    )
  }

  const handleClearRepository = async () => {
    await handleOperation(
      () => clearRepository(),
      'Repository selection cleared'
    )
  }

  // Render commit details
  const renderCommitDetails = (commit: Commit) => {
    return (
      <div className="p-4 border-l-2 border-l-muted bg-muted/10">
        {/* Commit Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{t('commit.hash')}:</span>
            <code className="text-sm bg-muted px-2 py-1 rounded">{commit.hash}</code>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{t('commit.author')}:</span>
            <span className="text-sm">{commit.author.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{t('commit.date')}:</span>
            <span className="text-sm">{formatDate(commit.date)}</span>
          </div>
          <div>
            <span className="text-sm font-medium">{t('commit.message')}:</span>
            <p className="text-sm mt-1">{commit.message}</p>
          </div>
          <div className="flex space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleOperation(() => cherryPickCommit(commit.hash), 'Cherry-picked commit')}>
              <GitMerge className="h-3 w-3 mr-1" />
              {t('commit.cherry_pick')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOperation(() => revertCommit(commit.hash), 'Reverted commit')}>
              <RotateCcw className="h-3 w-3 mr-1" />
              {t('commit.revert')}
            </Button>
            <Button variant="outline" size="sm">
              <Tag className="h-3 w-3 mr-1" />
              {t('commit.create_tag')}
            </Button>
            <Button variant="outline" size="sm">
              <GitFork className="h-3 w-3 mr-1" />
              {t('commit.create_branch')}
            </Button>
          </div>
        </div>

        {/* Files Changed */}
        <div>
          <h3 className="text-sm font-medium mb-3">
            {t('commit.changed_files')} ({commit.files?.length || 0})
          </h3>
          {commit.files?.map((file) => (
            <div key={file.name} className="mb-4">
              <div
                className="flex items-center space-x-2 p-2 bg-muted/50 rounded cursor-pointer"
                onClick={() => toggleFileExpansion(file.name)}
              >
                {expandedFiles.includes(file.name) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className={`text-xs font-mono px-1 rounded ${getStatusColor(file.status)}`}>
                  {getStatusIcon(file.status)}
                </span>
                <span className="text-sm font-medium">{file.name}</span>
                <div className="flex space-x-2 text-xs text-muted-foreground">
                  {file.additions !== undefined && (
                    <span className="text-green-500">+{file.additions}</span>
                  )}
                  {file.deletions !== undefined && (
                    <span className="text-red-500">-{file.deletions}</span>
                  )}
                </div>
              </div>
              {expandedFiles.includes(file.name) && file.diff && (
                <div className="mt-2 p-3 bg-muted/30 rounded text-xs font-mono">
                  <pre className="whitespace-pre-wrap">{file.diff}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left side - Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src="/logo.svg" alt="ADES" className="w-6 h-6" />
              <span className="text-foreground font-semibold text-sm">{t('ades')}</span>
            </div>
            
            <Separator orientation="vertical" className="h-4" />
            
            {/* Navigation */}
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <GitBranch className="h-3 w-3 mr-1.5" />
                {t('git.branch')}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Globe className="h-3 w-3 mr-1.5" />
                {t('git.remote')}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Archive className="h-3 w-3 mr-1.5" />
                {t('git.stash')}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Tag className="h-3 w-3 mr-1.5" />
                {t('git.tag')}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleOperation(fetch, t('git.fetch_success'))}>
                <Download className="h-3 w-3 mr-1.5" />
                {t('git.fetch')}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <ArrowUp className="h-3 w-3 mr-1.5" />
                {t('git.pull')}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Upload className="h-3 w-3 mr-1.5" />
                {t('git.push')}
              </Button>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => window.location.href = '/dashboard'}>
              <BarChart3 className="h-3 w-3 mr-1.5" />
              {t('navigation.dashboard')}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs" 
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-3 w-3 mr-1.5" />
              {t('navigation.searchShortcut')}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={refreshData}>
              <RefreshCw className="h-3 w-3 mr-1.5" />
              {t('navigation.refreshShortcut')}
            </Button>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        {/* Search Box */}
        {showSearch && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('navigation.search') + " commits..."}
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    setSearchInput("")
                    clearSearch()
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 pt-16">
        <PanelGroup direction="horizontal">
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={35}>
                <div className="h-full border-r border-border bg-background">
                  <RepositorySidebar
                    repositories={repositories}
                    currentRepository={currentRepository || undefined}
                    branches={branches}
                    tags={tags}
                    stashes={stashes}
                    remotes={remotes}
                    isLoading={isLoading}
                    onAddRepository={() => setShowAddRepoDialog(true)}
                    onCloneRepository={() => setShowCloneRepoDialog(true)}
                    onDiscoverRepositories={handleDiscoverRepositories}
                    onClearRepository={handleClearRepository}
                    onSwitchRepository={handleSwitchRepository}
                    onRemoveRepository={handleRemoveRepository}
                    onCheckoutBranch={(branchName: string) => handleOperation(() => checkoutBranch(branchName), `Checked out branch ${branchName}`)}
                    onRefresh={refreshData}
                  />
                </div>
              </Panel>
              <PanelResizeHandle className="w-1 bg-border hover:bg-border/80" />
            </>
          )}

          {/* Main Panel - Expandable Commits */}
          <Panel defaultSize={sidebarCollapsed ? 100 : 80}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Commits</h2>
              </div>
              <ScrollArea className="flex-1">
                {searchResults ? (
                  <div className="p-4">
                    <div className="mb-4">
                      <Badge variant="secondary">
                        {searchResults.commits.length} {t('status.commits_found')} "{searchQuery}"
                      </Badge>
                    </div>
                    {searchResults.commits.map((commit) => (
                      <Collapsible key={commit.hash} open={expandedCommits.includes(commit.hash)}>
                        <CollapsibleTrigger asChild>
                          <div
                            className={`p-3 border-b border-border cursor-pointer hover:bg-accent ${
                              expandedCommits.includes(commit.hash) ? 'bg-accent' : ''
                            }`}
                            onClick={() => handleCommitSelect(commit)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex items-center">
                                {expandedCommits.includes(commit.hash) ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {shortHash(commit.hash)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{commit.message}</div>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                  <User className="h-3 w-3" />
                                  <span>{commit.author.name}</span>
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDate(commit.date)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {selectedCommit?.hash === commit.hash && renderCommitDetails(selectedCommit)}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <div className="p-4">
                    {commits.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        {isLoading ? t('status.loading_commits') : t('repository.noCommitsFound')}
                      </div>
                    ) : (
                      <>
                        {commits.map((commit) => (
                          <Collapsible key={commit.hash} open={expandedCommits.includes(commit.hash)}>
                            <CollapsibleTrigger asChild>
                              <div
                                className={`p-3 border-b border-border cursor-pointer hover:bg-accent ${
                                  expandedCommits.includes(commit.hash) ? 'bg-accent' : ''
                                }`}
                                onClick={() => handleCommitSelect(commit)}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="flex items-center">
                                    {expandedCommits.includes(commit.hash) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="text-xs font-mono text-muted-foreground">
                                    {shortHash(commit.hash)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{commit.message}</div>
                                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                      <User className="h-3 w-3" />
                                      <span>{commit.author.name}</span>
                                      <Clock className="h-3 w-3" />
                                      <span>{formatDate(commit.date)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {selectedCommit?.hash === commit.hash && renderCommitDetails(selectedCommit)}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                        {hasMore && (
                          <div className="p-4 text-center">
                            <Button
                              variant="outline"
                              onClick={loadMoreCommits}
                              disabled={isLoading}
                            >
                              {isLoading ? t('status.loading_more') : 'Load More'}
                            </Button>
                          </div>
                        )}
                        {!hasMore && commits.length > 0 && (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {t('status.all_loaded')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-muted border-t border-border flex items-center justify-between px-4 text-xs">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-4 px-2 text-xs"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Eye className="h-3 w-3 mr-1" />
            {sidebarCollapsed ? 'Show' : 'Hide'} Sidebar
          </Button>
          <span>{t('status.ready')}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>{commits.length} commits</span>
          {currentRepository && <span>{currentRepository.name}</span>}
        </div>
      </div>

      <Toaster />

      {/* Add Repository Dialog */}
      <Dialog open={showAddRepoDialog} onOpenChange={setShowAddRepoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Local Repository</DialogTitle>
            <DialogDescription>
              Enter the path to an existing Git repository on your local machine.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="repo-path">Repository Path</Label>
              <Input
                id="repo-path"
                placeholder="/path/to/your/repository"
                value={addRepoPath}
                onChange={(e) => setAddRepoPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRepository()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRepoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRepository} disabled={!addRepoPath.trim()}>
              Add Repository
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Repository Dialog */}
      <Dialog open={showCloneRepoDialog} onOpenChange={setShowCloneRepoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Repository</DialogTitle>
            <DialogDescription>
              Enter the Git repository URL to clone it to your local machine.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                placeholder="https://github.com/user/repo.git"
                value={cloneRepoUrl}
                onChange={(e) => setCloneRepoUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repo-name">Repository Name (Optional)</Label>
              <Input
                id="repo-name"
                placeholder="Leave empty to use default name"
                value={cloneRepoName}
                onChange={(e) => setCloneRepoName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCloneRepository()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneRepoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloneRepository} disabled={!cloneRepoUrl.trim()}>
              Clone Repository
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App