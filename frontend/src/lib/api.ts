// API service for handling all backend interactions
class GaitAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  }

  // Helper method for HTML responses
  private async callHTML(endpoint: string): Promise<string> {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  }

  // Repository Management API calls
  async getRepositories() {
    return this.request('/repositories');
  }

  async addRepository(path: string) {
    return this.request('/repositories/add', {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  }

  async cloneRepository(url: string, name = '') {
    return this.request('/repositories/clone', {
      method: 'POST',
      body: JSON.stringify({ url, name })
    });
  }

  async removeRepository(path: string) {
    return this.request('/repositories/remove', {
      method: 'DELETE',
      body: JSON.stringify({ path })
    });
  }

  async switchRepository(path: string) {
    return this.request('/repository/switch', {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  }

  async clearRepository() {
    return this.request('/repository/clear', {
      method: 'POST'
    });
  }

  async discoverRepositories(maxDepth = 3) {
    return this.request('/repositories/discover', {
      method: 'POST',
      body: JSON.stringify({ maxDepth })
    });
  }

  // Language switching API calls
  async switchLanguage(language: string) {
    return this.request('/language/switch', {
      method: 'POST',
      body: JSON.stringify({ language })
    });
  }

  async getCurrentLanguage() {
    return this.request('/language/current');
  }

  async getLanguage() {
    return this.request('/language');
  }

  // Get all data in one optimized request (reduces round trips)
  async getAllData(limit = 50) {
    return this.request(`/all?limit=${limit}`);
  }

  // Get server-side rendered commits for better performance
  async getCommitsHTML(limit = 50, offset = 0) {
    return this.callHTML(`/commits/html?limit=${limit}&offset=${offset}`);
  }

  // Get commits with pagination support (fallback for JSON)
  async getCommits(limit = 50, offset = 0) {
    return this.request(`/commits?limit=${limit}&offset=${offset}`);
  }

  // Get branches
  async getBranches() {
    return this.request('/branches');
  }

  // Get tags
  async getTags() {
    return this.request('/tags');
  }

  // Get commits for a specific tag
  async getCommitsByTag(tagName: string, limit = 50, offset = 0) {
    return this.request(`/commits/tag/${encodeURIComponent(tagName)}?limit=${limit}&offset=${offset}`);
  }

  // Get server-side rendered commits for a specific tag
  async getCommitsByTagHTML(tagName: string, limit = 50, offset = 0) {
    return this.callHTML(`/commits/tag/${encodeURIComponent(tagName)}/html?limit=${limit}&offset=${offset}`);
  }

  // Get stashes
  async getStashes() {
    return this.request('/stashes');
  }

  // Stash operations
  async applyStash(index: number) {
    return this.request('/stash/apply', {
      method: 'POST',
      body: JSON.stringify({ index })
    });
  }

  async popStash(index: number) {
    return this.request('/stash/pop', {
      method: 'POST',
      body: JSON.stringify({ index })
    });
  }

  async dropStash(index: number) {
    return this.request('/stash/drop', {
      method: 'POST',
      body: JSON.stringify({ index })
    });
  }

  async showStash(index: number) {
    return this.request(`/stash/${index}`);
  }

  // Get remotes
  async getRemotes() {
    return this.request('/remotes');
  }

  // Get uncommitted changes
  async getUncommittedChanges() {
    return this.request('/uncommitted');
  }

  // Remote operations
  async pullFromRemote(remote: string, branch: string) {
    return this.request('/remote/pull', {
      method: 'POST',
      body: JSON.stringify({ remote, branch })
    });
  }

  async pushToRemote(remote: string, branch: string, force = false) {
    return this.request('/remote/push', {
      method: 'POST',
      body: JSON.stringify({ remote, branch, force })
    });
  }

  async getRemoteInfo(remoteName: string) {
    return this.request(`/remote/${encodeURIComponent(remoteName)}/info`);
  }

  // Get commit details
  async getCommitDetails(hash: string) {
    return this.request(`/commit/${hash}`);
  }

  // Get file diff
  async getFileDiff(hash: string, filePath: string) {
    return this.request(`/diff?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(filePath)}`);
  }

  // Get file content
  async getFileContent(hash: string, filePath: string) {
    return this.request(`/file-content?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(filePath)}`);
  }

  // Save file content
  async saveFileContent(filePath: string, content: string) {
    return this.request('/file-content/save', {
      method: 'POST',
      body: JSON.stringify({ filePath, content })
    });
  }

  // Create commit
  async createCommit(message: string, options: { amend?: boolean; signoff?: boolean } = {}) {
    return this.request('/commit/create', {
      method: 'POST',
      body: JSON.stringify({ message, ...options })
    });
  }

  // Stage file
  async stageFile(filePath: string) {
    return this.request('/stage', {
      method: 'POST',
      body: JSON.stringify({ filePath })
    });
  }

  // Unstage file
  async unstageFile(filePath: string) {
    return this.request('/unstage', {
      method: 'POST',
      body: JSON.stringify({ filePath })
    });
  }

  // Discard file changes
  async discardFileChanges(filePath: string) {
    return this.request('/discard', {
      method: 'POST',
      body: JSON.stringify({ filePath })
    });
  }

  // Checkout branch
  async checkoutBranch(branchName: string) {
    return this.request('/branch/checkout', {
      method: 'POST',
      body: JSON.stringify({ branch: branchName })
    });
  }

  // Create branch
  async createBranch(branchName: string, startPoint = '') {
    return this.request('/branch/create', {
      method: 'POST',
      body: JSON.stringify({ branchName, startPoint })
    });
  }

  // Delete branch
  async deleteBranch(branchName: string, force = false) {
    return this.request('/branch/delete', {
      method: 'POST',
      body: JSON.stringify({ branchName, force })
    });
  }

  // Merge branch
  async mergeBranch(branchName: string, noFastForward = false) {
    return this.request('/branch/merge', {
      method: 'POST',
      body: JSON.stringify({ branchName, noFastForward })
    });
  }

  // Fetch
  async fetch(remote = '', prune = false) {
    return this.request('/fetch', {
      method: 'POST',
      body: JSON.stringify({ remote, prune })
    });
  }

  // Get Gait info
  async getGait() {
    return this.request('/gait');
  }

  // Get settings
  async getSettings() {
    return this.request('/settings');
  }

  // Search
  async search(query: string) {
    return this.request(`/search?q=${encodeURIComponent(query)}`);
  }

  // Rename branch
  async renameBranch(oldName: string, newName: string) {
    return this.request('/branch/rename', {
      method: 'POST',
      body: JSON.stringify({ oldName, newName })
    });
  }

  // Reset branch
  async resetBranch(commitHash: string, resetType = 'mixed') {
    return this.request('/branch/reset', {
      method: 'POST',
      body: JSON.stringify({ commitHash, resetType })
    });
  }

  // Rebase branch
  async rebaseBranch(targetBranch: string, interactive = false) {
    return this.request('/branch/rebase', {
      method: 'POST',
      body: JSON.stringify({ targetBranch, interactive })
    });
  }

  // Cherry pick commit
  async cherryPickCommit(commitHash: string) {
    return this.request('/commit/cherry-pick', {
      method: 'POST',
      body: JSON.stringify({ commitHash })
    });
  }

  // Revert commit
  async revertCommit(commitHash: string, noCommit = false) {
    return this.request('/commit/revert', {
      method: 'POST',
      body: JSON.stringify({ commitHash, noCommit })
    });
  }

  // Create tag
  async createTag(tagName: string, commitHash = '', message = '', annotated = false) {
    return this.request('/tag/create', {
      method: 'POST',
      body: JSON.stringify({ tagName, commitHash, message, annotated })
    });
  }

  // Delete tag
  async deleteTag(tagName: string) {
    return this.request(`/tag/${encodeURIComponent(tagName)}`, {
      method: 'DELETE'
    });
  }

  // Push tag
  async pushTag(tagName: string, remote = 'origin') {
    return this.request('/tag/push', {
      method: 'POST',
      body: JSON.stringify({ tagName, remote })
    });
  }

  // Get tag details
  async getTagDetails(tagName: string) {
    return this.request(`/tag/${encodeURIComponent(tagName)}/details`);
  }

  // Create stash
  async createStash(message = '', includeUntracked = false) {
    return this.request('/stash/create', {
      method: 'POST',
      body: JSON.stringify({ message, includeUntracked })
    });
  }

  // Create branch from stash
  async createBranchFromStash(branchName: string, stashIndex: number) {
    return this.request('/stash/branch', {
      method: 'POST',
      body: JSON.stringify({ branchName, stashIndex })
    });
  }

  // Clean working directory
  async cleanWorkingDirectory(dryRun = false, includeDirectories = false) {
    return this.request('/clean', {
      method: 'POST',
      body: JSON.stringify({ dryRun, includeDirectories })
    });
  }

  // ============================================================================
  // ADES API Endpoints - AI Development Experience System
  // ============================================================================

  // Repository Analysis
  async analyzeRepository(repoPath?: string) {
    return this.request('/ades/analyze', {
      method: 'POST',
      body: JSON.stringify({ repoPath })
    });
  }

  async analyzeRepositoryComprehensive(options: { async?: boolean; repoPath?: string } = {}) {
    return this.request('/ades/analyze/comprehensive', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async getAnalysisProgress() {
    return this.request('/ades/analyze/progress');
  }

  // Development Insights
  async getDevelopmentInsights() {
    return this.request('/ades/insights');
  }

  // Pattern Extraction
  async extractReusablePatterns(repoPath?: string, minOccurrences = 1) {
    const params = new URLSearchParams();
    if (repoPath) params.set('repo_path', repoPath);
    params.set('min_occurrences', minOccurrences.toString());
    return this.request(`/ades/patterns?${params}`);
  }

  // Experience Search
  async searchExperiences(query: string, options: {
    category?: number;
    limit?: number;
    language?: string;
    tags?: string[];
  } = {}) {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options.category !== undefined) params.set('category', options.category.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.language) params.set('language', options.language);
    if (options.tags?.length) params.set('tags', options.tags.join(','));
    return this.request(`/ades/search?${params}`);
  }

  // Analytics and Metrics
  async getAnalytics() {
    return this.request('/ades/analytics');
  }

  async getRepositoryMetrics() {
    return this.request('/ades/metrics');
  }

  async getDashboardData() {
    return this.request('/ades/dashboard');
  }

  // Similar Implementations
  async getSimilarImplementations(codeSnippet: string, context?: string) {
    return this.request('/ades/similar', {
      method: 'POST',
      body: JSON.stringify({ code_snippet: codeSnippet, context })
    });
  }

  // Semantic Analysis
  async analyzeCommitSemantics(commitHash: string, message?: string, author?: string, files?: string) {
    return this.request('/ades/semantic/analyze', {
      method: 'POST',
      body: JSON.stringify({ commit_hash: commitHash, message, author, files })
    });
  }

  async getSemanticSimilarity(commitHash: string, limit = 10) {
    return this.request('/ades/semantic/similar', {
      method: 'POST',
      body: JSON.stringify({ commit_hash: commitHash, limit })
    });
  }

  // Knowledge Graph
  async queryKnowledgeGraph(type: string, parameters: Record<string, any>) {
    return this.request('/ades/knowledge/query', {
      method: 'POST',
      body: JSON.stringify({ type, parameters })
    });
  }

  async exportKnowledgeGraph() {
    return this.request('/ades/knowledge/export');
  }

  // ============================================================================
  // AI API Endpoints - Sprint 8 Advanced AI Features
  // ============================================================================

  // AI Chat and Conversation
  async chatWithAI(message: string, sessionId?: string, context?: Record<string, any>) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId, context })
    });
  }

  async getConversationHistory(sessionId: string) {
    return this.request(`/ai/conversation/history?session_id=${encodeURIComponent(sessionId)}`);
  }

  async clearConversationHistory(sessionId: string) {
    return this.request(`/ai/conversation/clear?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  }

  // AI Embeddings and Semantic Search
  async generateEmbeddings(texts: string[], metadata?: Record<string, string>) {
    return this.request('/ai/embeddings', {
      method: 'POST',
      body: JSON.stringify({ texts, metadata })
    });
  }

  async semanticSearch(query: string, limit = 10) {
    return this.request('/ai/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit })
    });
  }

  // AI Predictions
  async predictTechnicalDebt(data: Record<string, any>) {
    return this.request('/ai/predict/debt', {
      method: 'POST',
      body: JSON.stringify({ data })
    });
  }

  async predictBugs(data: Record<string, any>) {
    return this.request('/ai/predict/bugs', {
      method: 'POST',
      body: JSON.stringify({ data })
    });
  }

  async forecastProductivity(data: Record<string, any>, period = 'monthly') {
    return this.request(`/ai/predict/productivity?period=${period}`, {
      method: 'POST',
      body: JSON.stringify({ data })
    });
  }

  // AI Commit Analysis
  async analyzeCommitSemanticsAI(commitHash: string, message: string, author?: string, files?: string) {
    return this.request('/ai/analyze/commit', {
      method: 'POST',
      body: JSON.stringify({ commit_hash: commitHash, message, author, files })
    });
  }

  // AI Capabilities and Status
  async getAICapabilities() {
    return this.request('/ai/capabilities');
  }

  async getAIMetrics() {
    return this.request('/ai/metrics');
  }

  async getAIStatus() {
    return this.request('/ai/status');
  }

  async getAIHelp() {
    return this.request('/ai/help');
  }
}

// Create singleton instance
export const api = new GaitAPI(); 