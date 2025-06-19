// Type definitions for Git data structures

export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: Author;
  date: string;
  parents?: string[];
  selected?: boolean;
  files?: FileChange[];
  stats?: CommitStats;
}

export interface Author {
  name: string;
  email: string;
}

export interface Branch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

export interface Tag {
  name: string;
  hash: string;
  message?: string;
  annotated: boolean;
  date?: string;
}

export interface Stash {
  index: number;
  message: string;
  branch: string;
  date: string;
}

export interface Remote {
  name: string;
  url: string;
  fetch?: string;
  push?: string;
}

export interface FileChange {
  name: string;
  type: 'file' | 'folder';
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'staged' | 'unstaged';
  additions?: number;
  deletions?: number;
  expanded?: boolean;
  oldName?: string;
  content?: string;
  diff?: string;
}

export interface CommitStats {
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface Repository {
  name: string;
  path: string;
  current: boolean;
  lastAccessed?: string;
}

export interface RepositoryData {
  repoName: string;
  commits: Commit[];
  branches: Branch[];
  tags: Tag[];
  stashes: Stash[];
  remotes: Remote[];
  uncommittedChanges?: FileChange[];
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface SearchResult {
  commits: Commit[];
  files: FileChange[];
  branches: Branch[];
  tags: Tag[];
  query: string;
  total: number;
}

export interface GitOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  filename: string;
  oldFilename?: string;
  status: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  binary?: boolean;
}

export interface DashboardData {
  repositoryStats: {
    totalCommits: number;
    activeDevelopers: number;
    codeQualityScore: number;
    technicalDebt: number;
  };
  commitActivity: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  languageDistribution: Array<{
    language: string;
    percentage: number;
    lines: number;
  }>;
  developerContributions: Array<{
    name: string;
    commits: number;
    additions: number;
    deletions: number;
  }>;
  semanticTrends: {
    features: number;
    fixes: number;
    refactoring: number;
    documentation: number;
    testing: number;
    performance: number;
  };
  insights: Array<{
    title: string;
    description: string;
    confidence: number;
    type: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    description: string;
    type: string;
  }>;
}

export interface WebSocketMessage {
  type: 'initial_data' | 'update' | 'commit' | 'insight' | 'notification';
  payload: any;
  timestamp: string;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  duration?: number;
}

export interface GitSettings {
  userName: string;
  userEmail: string;
  defaultBranch: string;
  autoFetch: boolean;
  signCommits: boolean;
  theme: 'light' | 'dark';
  language: 'en' | 'zh';
}

export interface ModalState {
  isOpen: boolean;
  type: 'commit' | 'branch' | 'tag' | 'stash' | 'confirm' | 'error';
  title: string;
  data?: any;
}

export interface AppState {
  repositories: Repository[];
  currentRepository?: Repository;
  commits: Commit[];
  branches: Branch[];
  tags: Tag[];
  stashes: Stash[];
  remotes: Remote[];
  uncommittedChanges: FileChange[];
  selectedCommit?: Commit;
  searchQuery: string;
  searchResults?: SearchResult;
  isLoading: boolean;
  hasMore: boolean;
  offset: number;
  limit: number;
  error?: string;
  modal: ModalState;
  notifications: NotificationMessage[];
  settings: GitSettings;
  sidebarCollapsed: boolean;
  expandedFiles: string[];
}

// Utility types
export type FileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'staged' | 'unstaged';
export type CommitAction = 'cherry-pick' | 'revert' | 'reset' | 'tag' | 'branch';
export type BranchAction = 'checkout' | 'merge' | 'rebase' | 'delete' | 'rename';
export type GitOperation = 'fetch' | 'pull' | 'push' | 'clone' | 'commit' | 'stage' | 'unstage' | 'discard';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type ModalType = 'commit' | 'branch' | 'tag' | 'stash' | 'confirm' | 'error';
export type ResetType = 'soft' | 'mixed' | 'hard';
export type ViewMode = 'split' | 'unified';
export type SortOrder = 'asc' | 'desc';
export type SortBy = 'date' | 'author' | 'message' | 'hash'; 