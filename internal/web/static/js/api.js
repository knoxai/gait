// API module for handling all API calls
class GaitAPI {
    constructor() {
        this.baseUrl = '';
    }

    // Safe API call with error handling
    async call(endpoint, options = {}) {
        try {
            const response = await fetch(endpoint, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return Array.isArray(data) ? data : (data || []);
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Safe HTML API call for server-side rendered content
    async callHTML(endpoint, options = {}) {
        try {
            const response = await fetch(endpoint, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`HTML API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Repository Management API calls
    async getRepositories() {
        return this.call('/api/repositories');
    }

    async addRepository(path) {
        return this.call('/api/repositories/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
    }

    async cloneRepository(url, name = '') {
        return this.call('/api/repositories/clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, name })
        });
    }

    async removeRepository(path) {
        return this.call('/api/repositories/remove', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
    }

    async switchRepository(path) {
        return this.call('/api/repository/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
    }

    async clearRepository() {
        return this.call('/api/repository/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async discoverRepositories(maxDepth = 3) {
        return this.call('/api/repositories/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maxDepth })
        });
    }

    // Get all data in one optimized request (reduces round trips)
    async getAllData(limit = 50) {
        return this.call(`/api/all?limit=${limit}`);
    }

    // Get server-side rendered commits for better performance
    async getCommitsHTML(limit = 50, offset = 0) {
        return this.callHTML(`/api/commits/html?limit=${limit}&offset=${offset}`);
    }

    // Get commits with pagination support (fallback for JSON)
    async getCommits(limit = 50, offset = 0) {
        return this.call(`/api/commits?limit=${limit}&offset=${offset}`);
    }

    // Get branches
    async getBranches() {
        return this.call('/api/branches');
    }

    // Get tags
    async getTags() {
        return this.call('/api/tags');
    }

    // Get commits for a specific tag
    async getCommitsByTag(tagName, limit = 50, offset = 0) {
        return this.call(`/api/commits/tag/${encodeURIComponent(tagName)}?limit=${limit}&offset=${offset}`);
    }

    // Get server-side rendered commits for a specific tag
    async getCommitsByTagHTML(tagName, limit = 50, offset = 0) {
        return this.callHTML(`/api/commits/tag/${encodeURIComponent(tagName)}/html?limit=${limit}&offset=${offset}`);
    }

    // Get stashes
    async getStashes() {
        return this.call('/api/stashes');
    }

    // Stash operations
    async applyStash(index) {
        return this.call('/api/stash/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
    }

    async popStash(index) {
        return this.call('/api/stash/pop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
    }

    async dropStash(index) {
        return this.call('/api/stash/drop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
    }

    async showStash(index) {
        return this.call(`/api/stash/${index}`);
    }

    // Get remotes
    async getRemotes() {
        return this.call('/api/remotes');
    }

    // Get uncommitted changes
    async getUncommittedChanges() {
        return this.call('/api/uncommitted');
    }

    // Remote operations
    async pullFromRemote(remote, branch) {
        return this.call('/api/remote/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remote, branch })
        });
    }

    async pushToRemote(remote, branch, force = false) {
        return this.call('/api/remote/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remote, branch, force })
        });
    }

    async getRemoteInfo(remoteName) {
        return this.call(`/api/remote/${encodeURIComponent(remoteName)}/info`);
    }

    // Get commit details
    async getCommitDetails(hash) {
        return this.call(`/api/commit/${hash}`);
    }

    // Get file diff
    async getFileDiff(hash, filePath) {
        return this.call(`/api/diff?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(filePath)}`);
    }

    // Get file content
    async getFileContent(hash, filePath) {
        return this.call(`/api/file-content?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(filePath)}`);
    }

    // Save file content
    async saveFileContent(filePath, content) {
        return this.call('/api/file-content/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content })
        });
    }

    // Create commit
    async createCommit(message, options = {}) {
        return this.call('/api/commit/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message,
                amend: options.amend || false,
                signoff: options.signoff || false
            })
        });
    }

    // Stage file
    async stageFile(filePath) {
        return this.call('/api/stage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
    }

    // Unstage file
    async unstageFile(filePath) {
        return this.call('/api/unstage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
    }

    // Discard file changes
    async discardFileChanges(filePath) {
        return this.call('/api/discard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
    }

    // Checkout branch
    async checkoutBranch(branchName) {
        return this.call('/api/branch/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch: branchName })
        });
    }

    // Create branch
    async createBranch(branchName, startPoint = '') {
        return this.call('/api/branch/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchName, startPoint })
        });
    }

    // Delete branch
    async deleteBranch(branchName, force = false) {
        return this.call('/api/branch/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchName, force })
        });
    }

    // Merge branch
    async mergeBranch(branchName, noFastForward = false) {
        return this.call('/api/branch/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchName, noFastForward })
        });
    }

    // Fetch from remotes
    async fetch(remote = '', prune = false) {
        return this.call('/api/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remote, prune })
        });
    }

    // Get gait data
    async getGait() {
        return this.call('/api/gait');
    }

    // Get settings
    async getSettings() {
        return this.call('/api/settings');
    }

    // Search commits
    async search(query) {
        return this.call(`/api/search?q=${encodeURIComponent(query)}`);
    }

    // Rename branch
    async renameBranch(oldName, newName) {
        return this.call('/api/branch/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName })
        });
    }

    // Reset branch
    async resetBranch(commitHash, resetType = 'mixed') {
        return this.call('/api/branch/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commitHash, resetType })
        });
    }

    // Rebase branch
    async rebaseBranch(targetBranch, interactive = false) {
        return this.call('/api/branch/rebase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetBranch, interactive })
        });
    }

    // Cherry pick commit
    async cherryPickCommit(commitHash) {
        return this.call('/api/commit/cherry-pick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commitHash })
        });
    }

    // Revert commit
    async revertCommit(commitHash, noCommit = false) {
        return this.call('/api/commit/revert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commitHash, noCommit })
        });
    }

    // Create tag
    async createTag(tagName, commitHash = '', message = '', annotated = false) {
        return this.call('/api/tag/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagName, commitHash, message, annotated })
        });
    }

    // Delete tag
    async deleteTag(tagName) {
        return this.call(`/api/tag/${encodeURIComponent(tagName)}`, {
            method: 'DELETE'
        });
    }

    // Push tag
    async pushTag(tagName, remote = 'origin') {
        return this.call('/api/tag/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagName, remote })
        });
    }

    // Create stash
    async createStash(message = '', includeUntracked = false) {
        return this.call('/api/stash/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, includeUntracked })
        });
    }

    // Create branch from stash
    async createBranchFromStash(branchName, stashIndex) {
        return this.call('/api/stash/branch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchName, stashIndex })
        });
    }

    // Clean working directory
    async cleanWorkingDirectory(dryRun = false, includeDirectories = false) {
        return this.call('/api/clean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dryRun, includeDirectories })
        });
    }
}

// Create global API instance
window.gAItAPI = new GaitAPI(); 