// UI module for handling UI interactions and rendering
class GaitUI {
    constructor() {
        this.currentData = { commits: [], branches: [], tags: [], stashes: [], remotes: [] };
        this.selectedCommit = null;
        this.searchVisible = false;
        this.expandedFiles = new Set();
        this.currentTag = null; // Track current tag for tag mode
        
        // Load saved expanded files
        if (typeof getSavedExpandedFiles === 'function') {
            this.expandedFiles = getSavedExpandedFiles();
        }
        
        // Lazy loading state
        this.isLoading = false;
        this.hasMoreCommits = true;
        this.commitsOffset = 0;
        this.commitsLimit = 50;
        this.isSearchMode = false;
        this.useServerSideRendering = true; // Enable SSR for better performance
        
        // Operation state flags to prevent multiple simultaneous operations
        this.isPerformingBranchAction = false;
        this.isPerformingStashAction = false;
        this.isPerformingRemoteAction = false;
        this.isPerformingTagAction = false;
        this.isLoadingData = false;
    }

    async loadData() {
        // Prevent multiple simultaneous data loads
        if (this.isLoadingData) {
            return;
        }
        
        this.isLoadingData = true;
        this.showStatus('Loading data...', 'info');
        try {
            // Reset lazy loading state
            this.commitsOffset = 0;
            this.hasMoreCommits = true;
            this.isSearchMode = false;
            
            // Use optimized single API call to get all data including uncommitted changes
            const allData = await gAItAPI.getAllData(this.commitsLimit);
            
            this.currentData = {
                commits: allData.commits || [],
                branches: allData.branches || [],
                tags: allData.tags || [],
                stashes: allData.stashes || [],
                remotes: allData.remotes || [],
                uncommittedChanges: allData.uncommittedChanges || []
            };
            
            this.commitsOffset = allData.commits ? allData.commits.length : 0;
            this.hasMoreCommits = allData.hasMore || false;
            
            // Use server-side rendering for commits for better performance
            if (this.useServerSideRendering) {
                await this.renderCommitsSSR(true); // true = replace content
            } else {
                this.renderCommits(allData.commits, true); // Fallback to client-side rendering
            }
            
            this.renderBranches(allData.branches);
            this.renderTags(allData.tags);
            this.renderStashes(allData.stashes);
            this.renderRemotes(allData.remotes);
            
            // Restore selected commit after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.restoreSelectedCommit();
            }, 200);
            
            this.showStatus('Data loaded successfully', 'success');
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showStatus('Failed to load data', 'error');
            // Fallback to individual API calls if batch fails
            await this.loadDataFallback();
        } finally {
            this.isLoadingData = false;
        }
    }

    // Fallback method using individual API calls
    async loadDataFallback() {
        try {
            const [commits, branches, tags, stashes, remotes, uncommittedChanges] = await Promise.all([
                gAItAPI.getCommits(this.commitsLimit, 0), 
                gAItAPI.getBranches(),
                gAItAPI.getTags(), 
                gAItAPI.getStashes(), 
                gAItAPI.getRemotes(),
                gAItAPI.getUncommittedChanges()
            ]);
            
            this.currentData = { commits, branches, tags, stashes, remotes, uncommittedChanges };
            this.commitsOffset = commits.length;
            this.hasMoreCommits = commits.length === this.commitsLimit;
            
            this.renderCommits(commits, true);
            this.renderBranches(branches);
            this.renderTags(tags);
            this.renderStashes(stashes);
            this.renderRemotes(remotes);
            
            setTimeout(() => {
                this.restoreSelectedCommit();
            }, 200);
            
            this.showStatus('Data loaded successfully (fallback)', 'success');
        } catch (error) {
            console.error('Fallback data loading failed:', error);
            this.showStatus('Failed to load data', 'error');
        } finally {
            this.isLoadingData = false;
        }
    }

    // Server-side rendered commits for better performance
    async renderCommitsSSR(replace = false) {
        const list = document.getElementById('commitsList');
        
        try {
            const html = await gAItAPI.getCommitsHTML(this.commitsLimit, replace ? 0 : this.commitsOffset);
            
            if (replace) {
                // Add uncommitted changes at the top if there are any
                let finalHtml = '';
                if (this.currentData && this.currentData.uncommittedChanges && this.currentData.uncommittedChanges.length > 0) {
                    const changeCount = this.currentData.uncommittedChanges.length;
                    finalHtml += `
                        <li class="commit-item uncommitted-changes" onclick="gAItUI.selectCommit('uncommitted')" data-hash="uncommitted">
                            <div class="commit-hash">⚡</div>
                                        <div class="commit-message">${this.t('commit.uncommitted_changes', 'Uncommitted Changes')} (${changeCount})</div>
            <div class="commit-meta">
                <span class="commit-author">${this.t('commit.working_directory', 'Working Directory')}</span>
                                <span class="commit-date">Now</span>
                            </div>
                        </li>
                    `;
                }
                finalHtml += html;
                list.innerHTML = finalHtml;
            } else {
                // Remove loading indicator if it exists
                const loadingIndicator = list.querySelector('.loading-more');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                
                // Append new commits
                list.insertAdjacentHTML('beforeend', html);
            }
        } catch (error) {
            console.error('Server-side rendering failed, falling back to client-side:', error);
            this.useServerSideRendering = false;
            
            // Fallback to client-side rendering
            if (replace) {
                this.renderCommits(this.currentData.commits, true);
            }
        }
    }

    renderCommits(commits, replace = false) {
        const list = document.getElementById('commitsList');
        
        console.log('renderCommits called with:', { commits: commits.length, replace, hasUncommittedChanges: this.currentData?.uncommittedChanges?.length || 0 });
        
        if (!Array.isArray(commits) || commits.length === 0) {
            if (replace) {
                list.innerHTML = '<li class="loading">No commits found</li>';
            }
            return;
        }
        
        let commitsHtml = '';
        
        // Add uncommitted changes at the top if there are any and we're replacing content
        if (replace && this.currentData && this.currentData.uncommittedChanges && this.currentData.uncommittedChanges.length > 0) {
            const changeCount = this.currentData.uncommittedChanges.length;
            console.log('Adding uncommitted changes to commitsList:', changeCount);
            commitsHtml += `
                <li class="commit-item uncommitted-changes" onclick="gAItUI.selectCommit('uncommitted')" data-hash="uncommitted">
                    <div class="commit-hash">⚡</div>
                    <div class="commit-message">${this.t('commit.uncommitted_changes', 'Uncommitted Changes')} (${changeCount})</div>
                    <div class="commit-meta">
                        <span class="commit-author">${this.t('commit.working_directory', 'Working Directory')}</span>
                        <span class="commit-date">Now</span>
                    </div>
                </li>
            `;
        }
        
        commitsHtml += commits.map(commit => `
            <li class="commit-item" onclick="gAItUI.selectCommit('${commit.hash}')" data-hash="${commit.hash}">
                <div class="commit-hash">${commit.shortHash || commit.hash.substring(0, 7)}</div>
                <div class="commit-message">${this.escapeHtml(commit.message || 'No message')}</div>
                <div class="commit-meta">
                    <span class="commit-author">${this.escapeHtml(commit.author?.name || 'Unknown')}</span>
                    <span class="commit-date">${this.formatDate(commit.date)}</span>
                </div>
            </li>
        `).join('');
        
        if (replace) {
            list.innerHTML = commitsHtml;
        } else {
            // Remove loading indicator if it exists
            const loadingIndicator = list.querySelector('.loading-more');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            
            // Append new commits (without uncommitted changes for append mode)
            const newCommitsHtml = commits.map(commit => `
                <li class="commit-item" onclick="gAItUI.selectCommit('${commit.hash}')" data-hash="${commit.hash}">
                    <div class="commit-hash">${commit.shortHash || commit.hash.substring(0, 7)}</div>
                    <div class="commit-message">${this.escapeHtml(commit.message || 'No message')}</div>
                    <div class="commit-meta">
                        <span class="commit-author">${this.escapeHtml(commit.author?.name || 'Unknown')}</span>
                        <span class="commit-date">${this.formatDate(commit.date)}</span>
                    </div>
                </li>
            `).join('');
            list.insertAdjacentHTML('beforeend', newCommitsHtml);
        }
        
        // Add loading indicator if there are more commits
        if (this.hasMoreCommits && !this.isSearchMode) {
            this.addLoadingIndicator();
        } else if (!this.hasMoreCommits && !this.isSearchMode && this.currentData.commits.length > 0) {
            this.addEndIndicator();
        }
    }

    renderBranches(branches) {
        const list = document.getElementById('branchesList');
        if (!Array.isArray(branches) || branches.length === 0) {
            list.innerHTML = '<li class="loading">No branches found</li>';
            return;
        }
        list.innerHTML = branches.map(branch => `
            <li class="${branch.isCurrent ? 'current' : ''}" onclick="gAItUI.selectBranch('${branch.name}', ${branch.isCurrent})">
                <span>${this.escapeHtml(branch.name)}</span>
                <span>${branch.hash}</span>
            </li>
        `).join('');
    }

    // Enhanced branch selection with action menu
    selectBranch(branchName, isCurrent) {
        // If we're in tag mode, offer to exit tag mode and checkout the branch
        if (this.currentTag) {
            this.showBranchActionsFromTagMode(branchName, isCurrent);
            return;
        }

        if (isCurrent) {
            // If it's the current branch, show branch actions menu
            this.showBranchActions(branchName, true);
        } else {
            // If it's not current, show checkout and other actions
            this.showBranchActions(branchName, false);
        }
    }

    // Show branch actions menu
    showBranchActions(branchName, isCurrent) {
        // Close any existing menus first
        this.closeAllMenus();
        
        // Create action menu
        const menu = document.createElement('div');
        menu.className = 'action-menu';
        menu.innerHTML = `
            <div class="action-menu-content">
                <div class="action-menu-header">
                    <h4>Branch Actions: ${this.escapeHtml(branchName)} ${isCurrent ? '(current)' : ''}</h4>
                    <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                </div>
                <div class="action-menu-body">
                    ${!isCurrent ? `
                        <button class="action-btn primary" onclick="gAItUI.performBranchActionWithButton(event, 'checkout', '${branchName}');">
                            🔄 ${this.t('branch.checkout', 'Checkout')}
                        </button>
                        <button class="action-btn secondary" onclick="gAItUI.performBranchActionWithButton(event, 'merge', '${branchName}');">
                            🔀 ${this.t('branch.merge_into_current', 'Merge into Current')}
                        </button>
                        <button class="action-btn secondary" onclick="gAItUI.performBranchActionWithButton(event, 'rebase', '${branchName}');">
                            🔗 ${this.t('branch.rebase_current', 'Rebase Current onto This')}
                        </button>
                        <button class="action-btn secondary" onclick="gAItUI.showRenameBranchDialog('${branchName}');">
                            ✏️ ${this.t('branch.rename', 'Rename Branch')}
                        </button>
                        <button class="action-btn danger" onclick="gAItUI.performBranchActionWithButton(event, 'delete', '${branchName}');">
                            🗑️ ${this.t('branch.delete', 'Delete Branch')}
                        </button>
                    ` : `
                        <button class="action-btn secondary" onclick="gAItUI.showCreateBranchDialog('${branchName}');">
                            ➕ ${this.t('branch.create_new', 'Create New Branch')}
                        </button>
                        <button class="action-btn secondary" onclick="gAItUI.showRenameBranchDialog('${branchName}');">
                            ✏️ ${this.t('branch.rename_current', 'Rename Current Branch')}
                        </button>
                        <button class="action-btn secondary" onclick="gAItUI.showResetBranchDialog('${branchName}');">
                            ↩️ ${this.t('branch.reset', 'Reset Branch')}
                        </button>
                        <button class="action-btn secondary" onclick="gAItUI.showRebaseBranchDialog('${branchName}');">
                            🔗 ${this.t('branch.rebase', 'Rebase Branch')}
                        </button>
                    `}
                </div>
            </div>
        `;

        // Position and show menu
        document.body.appendChild(menu);
        
        // Position menu properly
        this.positionBranchMenu(menu);
        
        // Add click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
        }, 100);
        
        this.showStatus(`Branch ${branchName} actions available`, 'info');
    }

    // Position branch menu properly
    positionBranchMenu(menu) {
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Center the menu on screen
        let left = (viewportWidth - rect.width) / 2;
        let top = (viewportHeight - rect.height) / 2;
        
        // Ensure menu stays within viewport
        if (left < 20) left = 20;
        if (left + rect.width > viewportWidth - 20) left = viewportWidth - rect.width - 20;
        if (top < 20) top = 20;
        if (top + rect.height > viewportHeight - 20) top = viewportHeight - rect.height - 20;
        
        menu.style.position = 'fixed';
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
        menu.style.zIndex = '1001';
    }

    // Show branch actions menu when in tag mode
    showBranchActionsFromTagMode(branchName, isCurrent) {
        // Create action menu with tag mode context
        const menu = document.createElement('div');
        menu.className = 'action-menu';
        menu.innerHTML = `
            <div class="action-menu-content">
                <div class="action-menu-header">
                    <h4>Switch to Branch: ${this.escapeHtml(branchName)} ${isCurrent ? '(current)' : ''}</h4>
                    <button class="action-menu-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="action-menu-body">
                    <div style="margin-bottom: 12px; padding: 8px; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4caf50; font-size: 12px; color: #cccccc;">
                        📍 Currently viewing tag: <strong>${this.escapeHtml(this.currentTag)}</strong>
                    </div>
                    ${!isCurrent ? `
                                            <button class="action-btn primary" onclick="gAItUI.exitTagModeAndCheckoutBranch('${branchName}')">
                        🔄 ${this.t('branch.exit_tag_checkout', 'Exit Tag Mode & Checkout')} ${this.escapeHtml(branchName)}
                    </button>
                        <button class="action-btn secondary" onclick="gAItUI.exitTagMode()">
                            🏷️ Exit Tag Mode (Stay on Current Branch)
                        </button>
                    ` : `
                        <button class="action-btn primary" onclick="gAItUI.exitTagMode()">
                            🏷️ Exit Tag Mode (Return to ${this.escapeHtml(branchName)})
                        </button>
                        <button class="action-btn secondary" onclick="gAItUI.showCreateBranchDialog('${branchName}')">
                            ➕ ${this.t('branch.create_new', 'Create New Branch')}
                        </button>
                    `}
                </div>
            </div>
        `;

        // Position and show menu
        document.body.appendChild(menu);
        this.showStatus(`Branch ${branchName} actions available from tag mode`, 'info');
    }

    // Show create branch dialog
    async showCreateBranchDialog(startPoint = '') {
        // Close any existing menus
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const fromText = startPoint ? this.t('dialog.create_branch_from', startPoint) : '';
        try {
            const branchName = await showInputDialog({
                title: this.t('dialog.create_branch_title'),
                label: this.t('dialog.branch_name'),
                placeholder: 'feature/new-branch',
                tip: this.t('dialog.branch_name_tip'),
                required: true,
                pattern: /^[a-zA-Z0-9._/-]+$/
            });
            
            if (branchName && branchName.trim()) {
                this.performBranchAction('create', branchName.trim(), startPoint);
            }
        } catch (error) {
            // User cancelled
        }
    }

    // Wrapper method to handle button state
    async performBranchActionWithButton(event, action, branchName, startPoint = '') {
        const button = event.target;
        return this.performBranchAction(action, branchName, startPoint, button);
    }

    // Perform branch action
    async performBranchAction(action, branchName, startPoint = '', clickedButton = null) {
        // Prevent multiple simultaneous operations
        if (this.isPerformingBranchAction) {
            this.showStatus('Branch operation already in progress...', 'info');
            return;
        }

        this.isPerformingBranchAction = true;

        // Disable the clicked button to provide visual feedback
        if (clickedButton && clickedButton.classList.contains('action-btn')) {
            clickedButton.classList.add('loading');
            clickedButton.disabled = true;
        }

        // Close action menu after a short delay to show the loading state
        const menu = document.querySelector('.action-menu');
        setTimeout(() => {
            if (menu) menu.remove();
        }, 300);

        try {
            switch (action) {
                case 'checkout':
                    this.showStatus(`Checking out ${branchName}...`, 'info');
                    
                    await gAItAPI.checkoutBranch(branchName);
                    this.showStatus(`Checked out ${branchName}`, 'success');
                    
                    // Refresh data immediately - cache invalidation on backend ensures fresh data
                    await this.loadData();
                    break;

                case 'create':
                    this.showStatus(`Creating branch ${branchName}...`, 'info');
                    await gAItAPI.createBranch(branchName, startPoint);
                    this.showStatus(`Branch ${branchName} created and checked out`, 'success');
                    
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'delete':
                    try {
                        const confirmDelete = await showWarningDialog({
                            title: this.t('dialog.delete_branch_title'),
                            message: this.t('dialog.delete_branch_confirm', branchName),
                            details: this.t('dialog.delete_branch_warning'),
                            confirmText: this.t('actions.delete'),
                            cancelText: this.t('actions.cancel')
                        });
                        
                        if (confirmDelete) {
                            this.showStatus(`Deleting branch ${branchName}...`, 'info');
                            try {
                                await gAItAPI.deleteBranch(branchName, false);
                                this.showStatus(`Branch ${branchName} deleted`, 'success');
                            } catch (error) {
                                if (error.message.includes('not fully merged')) {
                                    const forceDelete = await showWarningDialog({
                                        title: this.t('dialog.force_delete_title'),
                                        message: this.t('dialog.delete_branch_force', branchName),
                                        details: this.t('dialog.force_delete_warning'),
                                        confirmText: this.t('actions.force_delete'),
                                        cancelText: this.t('actions.cancel')
                                    });
                                    
                                    if (forceDelete) {
                                        await gAItAPI.deleteBranch(branchName, true);
                                        this.showStatus(`Branch ${branchName} force deleted`, 'success');
                                    } else {
                                        this.showStatus('Branch deletion cancelled', 'info');
                                        break;
                                    }
                                } else {
                                    throw error;
                                }
                            }
                            // Refresh data immediately
                            await this.loadData();
                        } else {
                            // User cancelled the initial confirmation
                            this.showStatus('Branch deletion cancelled', 'info');
                        }
                    } catch (error) {
                        // User cancelled
                        this.showStatus('Branch deletion cancelled', 'info');
                    }
                    break;

                case 'merge':
                    const noFastForward = confirm(this.t('dialog.merge_branch', branchName));
                    this.showStatus(`Merging ${branchName}...`, 'info');
                    await gAItAPI.mergeBranch(branchName, noFastForward);
                    this.showStatus(`Branch ${branchName} merged successfully`, 'success');
                    
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'rebase':
                    const interactive = confirm(this.t('dialog.rebase_branch', branchName));
                    this.showStatus(`Rebasing onto ${branchName}...`, 'info');
                    await gAItAPI.rebaseBranch(branchName, interactive);
                    this.showStatus(`Successfully rebased onto ${branchName}`, 'success');
                    
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'rename':
                    this.showStatus(`Renaming branch ${branchName} to ${startPoint}...`, 'info');
                    await gAItAPI.renameBranch(branchName, startPoint);
                    this.showStatus(`Branch renamed from ${branchName} to ${startPoint}`, 'success');
                    
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'reset':
                    this.showStatus(`Resetting branch ${branchName} to ${startPoint}...`, 'info');
                    await gAItAPI.resetBranch(startPoint, 'mixed'); // Default to mixed reset
                    this.showStatus(`Branch ${branchName} reset to ${startPoint}`, 'success');
                    
                    // Refresh data immediately
                    await this.loadData();
                    break;
            }
        } catch (error) {
            console.error(`Branch ${action} failed:`, error);
            this.showStatus(`Branch ${action} failed: ${error.message}`, 'error');
            
            // If checkout failed, revert the optimistic UI update
            if (action === 'checkout') {
                await this.loadData();
            }
        } finally {
            this.isPerformingBranchAction = false;
        }
    }

    // Optimistically update branch UI for immediate feedback
    updateBranchUIOptimistically(newCurrentBranch) {
        const branchItems = document.querySelectorAll('#branchesList li');
        branchItems.forEach(item => {
            const branchName = item.querySelector('span')?.textContent;
            if (branchName === newCurrentBranch) {
                item.classList.add('current');
                // Update the onclick to reflect it's now current
                item.setAttribute('onclick', `gAItUI.selectBranch('${branchName}', true)`);
            } else {
                item.classList.remove('current');
                // Update the onclick to reflect it's not current
                item.setAttribute('onclick', `gAItUI.selectBranch('${branchName}', false)`);
            }
        });
    }

    // Keep the old checkoutBranch method for backward compatibility
    async checkoutBranch(branchName) {
        return this.performBranchAction('checkout', branchName);
    }

    renderTags(tags) {
        const list = document.getElementById('tagsList');
        if (!Array.isArray(tags) || tags.length === 0) {
            list.innerHTML = `<li class="loading">${this.t('sidebar.no_tags', 'No tags found')}</li>`;
            return;
        }
        list.innerHTML = tags.map(tag => `
            <li onclick="gAItUI.selectTag('${tag.name}')">
                <span>${this.escapeHtml(tag.name)}</span>
                <span>${tag.hash}</span>
            </li>
        `).join('');
    }

    renderStashes(stashes) {
        const list = document.getElementById('stashesList');
        if (!Array.isArray(stashes) || stashes.length === 0) {
            list.innerHTML = `<li class="loading">${this.t('sidebar.no_stashes', 'No stashes found')}</li>`;
            return;
        }
        list.innerHTML = stashes.map(stash => `
            <li onclick="gAItUI.selectStash(${stash.index})">
                <span>${this.escapeHtml(stash.message || 'Stash')}</span>
                <span>${stash.branch}</span>
            </li>
        `).join('');
    }

    renderRemotes(remotes) {
        const list = document.getElementById('remotesList');
        if (!Array.isArray(remotes) || remotes.length === 0) {
            list.innerHTML = `<li class="loading">${this.t('sidebar.no_remotes', 'No remotes found')}</li>`;
            return;
        }
        list.innerHTML = remotes.map(remote => `
            <li onclick="gAItUI.selectRemote('${remote.name}')">
                <span>${this.escapeHtml(remote.name)}</span>
                <span title="${this.escapeHtml(remote.fetchUrl || remote.pushUrl || '')}">📡</span>
            </li>
        `).join('');
    }

    async selectCommit(hash) {
        document.querySelectorAll('.commit-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-hash="${hash}"]`).classList.add('selected');
        
        this.selectedCommit = hash;
        // Don't clear expandedFiles - we want to maintain state across commits
        
        // Save selected commit to localStorage
        if (typeof saveSelectedCommit === 'function') {
            saveSelectedCommit(hash);
        }
        
        const detailsPanel = document.getElementById('commitDetails');
        detailsPanel.classList.remove('hidden');
        
        // Handle uncommitted changes specially
        if (hash === 'uncommitted') {
            this.showStatus('Loading uncommitted changes...', 'info');
            this.renderUncommittedChangesAsCommit();
            this.showStatus('Uncommitted changes loaded', 'success');
            return;
        }
        
                    this.showStatus(this.t('status.loading_commit_details', 'Loading commit details...'), 'info');
        
        try {
            const commit = await gAItAPI.getCommitDetails(hash);
            this.renderCommitDetails(commit);
            this.showStatus('Commit details loaded', 'success');
        } catch (error) {
            document.getElementById('detailsContent').innerHTML = 
                `<div class="error">${this.t('error.failed_load_commit', 'Failed to load commit details')}: ${error.message}</div>`;
            this.showStatus(this.t('error.failed_load_commit', 'Failed to load commit details'), 'error');
        }
    }

    renderCommitDetails(commit) {
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');
        
        title.textContent = `${this.t('commit.details', 'Commit')} ${commit.shortHash}`;
        
        let totalAdditions = 0;
        let totalDeletions = 0;
        let filesChanged = 0;
        
        if (commit.fileChanges && commit.fileChanges.length > 0) {
            filesChanged = commit.fileChanges.length;
            commit.fileChanges.forEach(file => {
                totalAdditions += file.additions || 0;
                totalDeletions += file.deletions || 0;
            });
        }
        
        let html = `
            <div class="commit-info">
                <h3>${this.escapeHtml(commit.message)}</h3>
                <div class="meta">${this.t('commit.author', 'Author')}: ${this.escapeHtml(commit.author.name)} &lt;${this.escapeHtml(commit.author.email)}&gt;</div>
                <div class="meta">${this.t('commit.date', 'Date')}: ${this.formatDate(commit.date)}</div>
                <div class="meta">${this.t('commit.hash', 'Hash')}: <code>${commit.hash}</code></div>
                ${commit.parents && commit.parents.length > 0 ? 
                    `<div class="meta">${this.t('commit.parents', 'Parents')}: ${commit.parents.map(p => `<code>${p.substring(0, 7)}</code>`).join(', ')}</div>` : ''}
                ${filesChanged > 0 ? `
                    <div class="commit-stats">
                        <span class="files-changed">${filesChanged} ${filesChanged !== 1 ? this.t('commit.files_changed', 'files changed') : this.t('commit.file_changed', 'file changed')}</span>
                        ${totalAdditions > 0 ? `<span class="total-additions">+${totalAdditions}</span>` : ''}
                        ${totalDeletions > 0 ? `<span class="total-deletions">-${totalDeletions}</span>` : ''}
                    </div>
                ` : ''}
                <div class="commit-actions">
                    <button class="action-btn secondary" onclick="gAItUI.performCommitAction('cherry-pick', '${commit.hash}')" title="Cherry-pick this commit">
                        🍒 ${this.t('commit.cherry_pick_action', 'Cherry-pick')}
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performCommitAction('revert', '${commit.hash}')" title="Revert this commit">
                        ↩️ ${this.t('commit.revert_action', 'Revert')}
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performCommitAction('reset', '${commit.hash}')" title="Reset current branch to this commit">
                        🎯 ${this.t('commit.reset_to_here', 'Reset to Here')}
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performCommitAction('create-tag', '${commit.hash}')" title="Create tag at this commit">
                        🏷️ ${this.t('commit.create_tag', 'Tag')}
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performCommitAction('create-branch', '${commit.hash}')" title="Create branch from this commit">
                        🌿 ${this.t('commit.create_branch', 'Branch')}
                    </button>
                    <button class="action-btn secondary" onclick="gAItClipboard.copyCommitHash('${commit.hash}')" title="Copy commit hash">
                        📋 ${this.t('commit.copy_hash', 'Copy Hash')}
                    </button>
                </div>
            </div>
        `;
        
        if (commit.fileChanges && commit.fileChanges.length > 0) {
            // Add index to each file change for tree building
            const fileChangesWithIndex = commit.fileChanges.map((file, index) => ({
                ...file,
                index: index
            }));
            
            // Build tree structure from file paths
            const fileTree = this.buildFileTree(fileChangesWithIndex);
            
            html += `
                <div class="file-changes">
                    <h4>${this.t('commit.changed_files', 'Changed Files')} (${commit.fileChanges.length})
                        <div class="file-tree-controls">
                            <button class="tree-control-btn" onclick="gAItUI.expandAllDirectories()" title="${this.t('file.expand_all', 'Expand all directories')}">📁</button>
                            <button class="tree-control-btn" onclick="gAItUI.collapseAllDirectories()" title="${this.t('file.collapse_all', 'Collapse all directories')}">📂</button>
                        </div>
                    </h4>
                    <div class="file-tree">
                        ${this.renderCommitFileTreeNode(fileTree, '', 0, commit.hash)}
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = html;
        
        // Restore expanded files state
        setTimeout(() => {
            this.restoreExpandedFiles(commit.hash);
        }, 100);
    }

    // Render a tree node for committed changes (directory or file)
    renderCommitFileTreeNode(node, path, depth, commitHash) {
        let html = '';
        
        // Sort entries: directories first, then files
        const entries = Object.entries(node).sort(([aName, aNode], [bName, bNode]) => {
            if (aNode.type === 'directory' && bNode.type === 'file') return -1;
            if (aNode.type === 'file' && bNode.type === 'directory') return 1;
            return aName.localeCompare(bName);
        });
        
        entries.forEach(([name, nodeData]) => {
            const currentPath = path ? `${path}/${name}` : name;
            
            if (nodeData.type === 'directory') {
                // Render directory - collapsed by default
                const hasFiles = Object.keys(nodeData.children).length > 0;
                const dirId = `commit-dir-${commitHash.substring(0, 8)}-${currentPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
                
                html += `
                    <div class="tree-directory collapsed" data-path="${currentPath}">
                        <div class="tree-item directory" onclick="gAItUI.toggleDirectory('${dirId}')">
                            <span class="tree-icon" id="${dirId}-icon">📂</span>
                            <span class="tree-name">${this.escapeHtml(name)}</span>
                        </div>
                        <div class="tree-children" id="${dirId}" style="display: none;">
                            ${hasFiles ? this.renderCommitFileTreeNode(nodeData.children, currentPath, depth + 1, commitHash) : ''}
                        </div>
                    </div>
                `;
            } else {
                // Render file
                const file = nodeData.data;
                const index = file.index;
                
                html += `
                    <div class="file-item tree-file" id="file-${index}" data-path="${currentPath}">
                        <div class="file-header tree-item file" onclick="gAItUI.toggleFileExpansion('${commitHash}', '${this.escapeHtml(file.path)}', ${index})">
                            <div class="file-expand-icon">▶</div>
                            <span class="file-status ${file.status}">${file.status}</span>
                            <span class="tree-name file-name">${this.escapeHtml(name)}</span>
                            <span class="file-stats">
                                <span class="additions">+${file.additions || 0}</span>
                                <span class="separator">-</span>
                                <span class="deletions">${file.deletions || 0}</span>
                            </span>
                        </div>
                        <div class="file-diff" id="diff-${index}">
                            <div class="diff-controls">
                                <div class="diff-view-toggle">
                                    <button class="diff-view-btn active" onclick="gAItUI.switchDiffView(${index}, 'split')">${this.t('file.split_view', 'Split')}</button>
                                    <button class="diff-view-btn" onclick="gAItUI.switchDiffView(${index}, 'unified')">${this.t('file.unified_view', 'Unified')}</button>
                                </div>
                                <button class="diff-wrap-btn active" id="wrap-btn-${index}" onclick="gAItDiffViewer.toggleWrap(${index})">${this.t('file.wrap', 'Wrap')}</button>
                                <button class="diff-fullscreen-btn" onclick="gAItDiffViewer.openFullscreenDiff('${commitHash}', '${this.escapeHtml(file.path)}', ${index})">${this.t('file.fullscreen', 'Fullscreen')}</button>
                            </div>
                            <div class="diff-content" id="diff-content-${index}">
                                <div class="loading">${this.t('file.loading_diff', 'Loading diff...')}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        return html;
    }

    // Ensure visual state is correct for expanded files
    ensureVisualState(commitHash) {
        if (!commitHash) return;
        
        const filesToExpand = Array.from(this.expandedFiles).filter(fileKey => 
            fileKey.startsWith(commitHash + '-')
        );
        
        // Check each file item and ensure visual state matches the expanded state
        document.querySelectorAll('.file-item.tree-file').forEach((fileElement, index) => {
            // For tree structure, get the full path from data-path attribute
            const dataPath = fileElement.getAttribute('data-path');
            if (dataPath) {
                const fileKey = `${commitHash}-${dataPath}`;
                const shouldBeExpanded = this.expandedFiles.has(fileKey);
                const isVisuallyExpanded = fileElement.classList.contains('expanded');
                
                if (shouldBeExpanded && !isVisuallyExpanded) {
                    fileElement.classList.add('expanded');
                    
                    const expandIcon = fileElement.querySelector('.file-expand-icon');
                    if (expandIcon) {
                        expandIcon.style.transform = 'rotate(90deg)';
                    }
                    
                    // Let CSS handle the display via the expanded class
                    const fileDiff = fileElement.querySelector('.file-diff');
                    if (fileDiff) {
                        fileDiff.style.display = '';
                    }
                } else if (!shouldBeExpanded && isVisuallyExpanded) {
                    fileElement.classList.remove('expanded');
                    
                    const expandIcon = fileElement.querySelector('.file-expand-icon');
                    if (expandIcon) {
                        expandIcon.style.transform = 'rotate(0deg)';
                    }
                    
                    // Explicitly hide the diff to override any inline styles
                    const fileDiff = fileElement.querySelector('.file-diff');
                    if (fileDiff) {
                        fileDiff.style.display = 'none';
                    }
                }
            }
        });
    }

    // More robust restoration function
    restoreExpandedFilesRobust(commitHash) {
        if (!commitHash) return;
        
        // Get all files that should be expanded for this commit
        const filesToExpand = Array.from(this.expandedFiles).filter(fileKey => 
            fileKey.startsWith(commitHash + '-')
        );
        
        if (filesToExpand.length === 0) {
            return;
        }
        
        // Wait for DOM to be ready and then restore
        const restoreFiles = () => {
            filesToExpand.forEach(fileKey => {
                const filePath = fileKey.substring(commitHash.length + 1);
                
                // Find all file items and match by path using tree structure
                const fileItems = document.querySelectorAll('.file-item.tree-file');
                
                let found = false;
                fileItems.forEach((fileElement, index) => {
                    const dataPath = fileElement.getAttribute('data-path');
                    if (dataPath) {
                        if (dataPath === filePath) {
                            found = true;
                            
                            // Add the expanded class
                            fileElement.classList.add('expanded');
                            
                            // Rotate the expand icon
                            const expandIcon = fileElement.querySelector('.file-expand-icon');
                            if (expandIcon) {
                                expandIcon.style.transform = 'rotate(90deg)';
                            }
                            
                            // Show the diff content (let CSS handle display via expanded class)
                            const fileDiff = fileElement.querySelector('.file-diff');
                            if (fileDiff) {
                                fileDiff.style.display = '';
                            }
                        }
                    }
                });
                
                if (!found) {
                    console.warn(`Could not find file element for path: ${filePath}`);
                }
            });
        };
        
        // Try multiple times with different delays
        setTimeout(restoreFiles, 50);
        setTimeout(restoreFiles, 200);
        setTimeout(restoreFiles, 500);
    }

    // Helper function to load file diff
    async loadFileDiff(hash, filePath, index) {
        const diffContent = document.getElementById(`diff-content-${index}`);
        if (!diffContent) return;
        
        try {
            const diff = await gAItAPI.getFileDiff(hash, filePath);
            gAItDiffViewer.renderFileDiff(diff, filePath, index);
        } catch (error) {
            diffContent.innerHTML = `<div class="error">Failed to load diff: ${error.message}</div>`;
        }
    }

    // Restore selected commit from localStorage
    restoreSelectedCommit() {
        if (typeof getSavedSelectedCommit === 'function') {
            const savedCommitHash = getSavedSelectedCommit();
            if (savedCommitHash) {
                // Check if the commit exists in the current list
                const commitElement = document.querySelector(`[data-hash="${savedCommitHash}"]`);
                if (commitElement) {
                    // Select the commit
                    this.selectCommit(savedCommitHash);
                    
                    // Scroll the commit into view
                    setTimeout(() => {
                        commitElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }, 100);
                }
            }
        }
    }

    // Clear selected commit
    clearSelectedCommit() {
        this.selectedCommit = null;
        document.querySelectorAll('.commit-item').forEach(item => {
            item.classList.remove('selected');
        });
        const detailsPanel = document.getElementById('commitDetails');
        detailsPanel.classList.add('hidden');
        
        // Clear from localStorage
        if (typeof saveSelectedCommit === 'function') {
            saveSelectedCommit(null);
        }
    }

    // Collapse all expanded files for the current commit
    collapseAllFiles() {
        if (!this.selectedCommit) return;
        
        // Remove all expanded files for the current commit
        const toRemove = Array.from(this.expandedFiles).filter(key => 
            key.startsWith(this.selectedCommit + '-')
        );
        toRemove.forEach(key => this.expandedFiles.delete(key));
        
        // Update UI
        document.querySelectorAll('.file-item').forEach(fileItem => {
            fileItem.classList.remove('expanded');
            
            // Reset the expand icon rotation
            const expandIcon = fileItem.querySelector('.file-expand-icon');
            if (expandIcon) {
                expandIcon.style.transform = 'rotate(0deg)';
            }
            
            // Explicitly hide the diff (to override any inline styles)
            const fileDiff = fileItem.querySelector('.file-diff');
            if (fileDiff) {
                fileDiff.style.display = 'none';
            }
        });
        
        // Save state
        if (typeof saveExpandedFiles === 'function') {
            saveExpandedFiles(this.expandedFiles);
        }
        
        this.showStatus('All files collapsed', 'success');
    }

    // Manual restoration function for debugging
    manualRestoreExpandedFiles() {
        if (this.selectedCommit) {
            this.restoreExpandedFiles(this.selectedCommit);
        }
    }

    async toggleFileExpansion(hash, filePath, index) {
        const fileItem = document.getElementById(`file-${index}`);
        const diffContent = document.getElementById(`diff-content-${index}`);
        const fileDiff = fileItem.querySelector('.file-diff');
        const fileKey = `${hash}-${filePath}`;
        
        if (this.expandedFiles.has(fileKey)) {
            // Collapsing the file
            this.expandedFiles.delete(fileKey);
            fileItem.classList.remove('expanded');
            
            // Reset the expand icon rotation
            const expandIcon = fileItem.querySelector('.file-expand-icon');
            if (expandIcon) {
                expandIcon.style.transform = 'rotate(0deg)';
            }
            
            // Explicitly hide the diff (to override any inline styles)
            if (fileDiff) {
                fileDiff.style.display = 'none';
            }
        } else {
            // Expanding the file
            this.expandedFiles.add(fileKey);
            fileItem.classList.add('expanded');
            
            // Ensure the expand icon is rotated
            const expandIcon = fileItem.querySelector('.file-expand-icon');
            if (expandIcon) {
                expandIcon.style.transform = 'rotate(90deg)';
            }
            
            // Show the diff (remove inline style to let CSS take over)
            if (fileDiff) {
                fileDiff.style.display = '';
            }
            
            if (diffContent.innerHTML.includes('Loading diff...') || diffContent.innerHTML.includes('file.loading_diff') || diffContent.innerHTML.includes('加载差异中...')) {
                this.showStatus(`Loading diff for ${filePath}...`, 'info');
                
                try {
                    const diff = await gAItAPI.getFileDiff(hash, filePath);
                    gAItDiffViewer.renderFileDiff(diff, filePath, index);
                    this.showStatus('Diff loaded', 'success');
                } catch (error) {
                    diffContent.innerHTML = `<div class="error">Failed to load diff: ${error.message}</div>`;
                    this.showStatus(`Failed to load diff: ${error.message}`, 'error');
                }
            }
        }
        
        // Save expanded files state
        if (typeof saveExpandedFiles === 'function') {
            saveExpandedFiles(this.expandedFiles);
        }
    }

    // Handle expanding/collapsing uncommitted file diffs
    async toggleUncommittedFileExpansion(filePath, index) {
        const fileItem = document.getElementById(`uncommitted-file-${index}`);
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        const fileDiff = fileItem.querySelector('.file-diff');
        const fileKey = `uncommitted-${filePath}`;
        
        console.log(`Toggling uncommitted file expansion for ${filePath}, index ${index}`);
        
        if (!fileItem || !diffContent) {
            console.error(`Could not find elements for file ${filePath}, index ${index}`);
            return;
        }
        
        if (this.expandedFiles.has(fileKey)) {
            // Collapsing the file
            console.log(`Collapsing file ${filePath}`);
            this.expandedFiles.delete(fileKey);
            fileItem.classList.remove('expanded');
            
            // Reset the expand icon rotation
            const expandIcon = fileItem.querySelector('.file-expand-icon');
            if (expandIcon) {
                expandIcon.style.transform = 'rotate(0deg)';
            }
            
            // Explicitly hide the diff (to override any inline styles)
            if (fileDiff) {
                fileDiff.style.display = 'none';
            }
        } else {
            // Expanding the file
            console.log(`Expanding file ${filePath}`);
            this.expandedFiles.add(fileKey);
            fileItem.classList.add('expanded');
            
            // Ensure the expand icon is rotated
            const expandIcon = fileItem.querySelector('.file-expand-icon');
            if (expandIcon) {
                expandIcon.style.transform = 'rotate(90deg)';
            }
            
            // Show the diff (remove inline style to let CSS take over)
            if (fileDiff) {
                fileDiff.style.display = '';
            }
            
            // Always load the diff when expanding, regardless of current content
            console.log(`Loading diff for ${filePath}...`);
            this.showStatus(`Loading diff for ${filePath}...`, 'info');
            
            try {
                diffContent.innerHTML = `<div class="loading">${this.t('file.loading_diff', 'Loading diff...')}</div>`;
                const diff = await gAItAPI.getFileDiff('uncommitted', filePath);
                console.log(`Diff loaded for ${filePath}:`, diff);
                
                // Use a custom render method for uncommitted changes to handle the different element IDs
                this.renderUncommittedFileDiff(diff, filePath, index);
                this.showStatus('Diff loaded', 'success');
            } catch (error) {
                console.error(`Failed to load diff for ${filePath}:`, error);
                diffContent.innerHTML = `<div class="error">Failed to load diff: ${error.message}</div>`;
                this.showStatus(`Failed to load diff: ${error.message}`, 'error');
            }
        }
        
        // Save expanded files state
        if (typeof saveExpandedFiles === 'function') {
            saveExpandedFiles(this.expandedFiles);
        }
    }

    // Custom render method for uncommitted file diffs
    renderUncommittedFileDiff(diff, filePath, index) {
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        if (!diffContent) {
            console.error(`Could not find diff content element: uncommitted-diff-content-${index}`);
            return;
        }
        
        // Use the same rendering logic as the diff viewer but with our custom container
        this.renderSplitDiffForUncommitted(diff, diffContent);
    }

    // Render split diff view for uncommitted changes
    renderSplitDiffForUncommitted(diff, container) {
        let html = `
            <div class="diff-split-view">
                <div class="diff-split-pane">
                    <div class="diff-split-header">Original</div>
        `;
        
        if (diff.hunks && diff.hunks.length > 0) {
            let oldLineNum = 1;
            diff.hunks.forEach(hunk => {
                hunk.lines.forEach(line => {
                    if (line.type !== 'addition') {
                        html += `
                            <div class="diff-line ${line.type}">
                                <div class="diff-line-number">${line.type === 'deletion' ? oldLineNum : oldLineNum}</div>
                                <div class="diff-line-content">${this.escapeHtml(line.content.substring(1) || '')}</div>
                            </div>
                        `;
                        if (line.type !== 'addition') oldLineNum++;
                    } else {
                        html += `
                            <div class="diff-line context">
                                <div class="diff-line-number"></div>
                                <div class="diff-line-content"></div>
                            </div>
                        `;
                    }
                });
            });
        } else {
            html += '<div class="diff-line context"><div class="diff-line-number"></div><div class="diff-line-content">No changes</div></div>';
        }
        
        html += `
                </div>
                <div class="diff-split-pane">
                    <div class="diff-split-header">Modified</div>
        `;
        
        if (diff.hunks && diff.hunks.length > 0) {
            let newLineNum = 1;
            diff.hunks.forEach(hunk => {
                hunk.lines.forEach(line => {
                    if (line.type !== 'deletion') {
                        html += `
                            <div class="diff-line ${line.type}">
                                <div class="diff-line-number">${line.type === 'addition' ? newLineNum : newLineNum}</div>
                                <div class="diff-line-content">${this.escapeHtml(line.content.substring(1) || '')}</div>
                            </div>
                        `;
                        if (line.type !== 'deletion') newLineNum++;
                    } else {
                        html += `
                            <div class="diff-line context">
                                <div class="diff-line-number"></div>
                                <div class="diff-line-content"></div>
                            </div>
                        `;
                    }
                });
            });
        } else {
            html += '<div class="diff-line context"><div class="diff-line-number"></div><div class="diff-line-content">No changes</div></div>';
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Store diff data for view switching
        const diffView = container.querySelector('.diff-split-view');
        if (diffView) {
            diffView.diffData = diff;
        }
    }

    selectTag(name) {
        this.showTagActions(name);
    }

    // Show tag actions menu
    showTagActions(tagName) {
        // Close any existing menus first
        this.closeAllMenus();
        
        // Create action menu
        const menu = document.createElement('div');
        menu.className = 'action-menu';
        menu.innerHTML = `
            <div class="action-menu-content">
                <div class="action-menu-header">
                    <h4>Tag Actions: ${this.escapeHtml(tagName)}</h4>
                    <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                </div>
                <div class="action-menu-body">
                    <button class="action-btn primary" onclick="gAItUI.loadCommitsByTag('${tagName}'); gAItUI.closeAllMenus();">
                        👁️ View Commits
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performTagActionWithButton(event, 'push', '${tagName}');">
                        ⬆️ Push Tag
                    </button>
                    <button class="action-btn secondary" onclick="gAItClipboard.copyTagName('${tagName}');">
                        📋 Copy Tag Name
                    </button>
                    <button class="action-btn danger" onclick="gAItUI.performTagActionWithButton(event, 'delete', '${tagName}');">
                        🗑️ Delete Tag
                    </button>
                </div>
            </div>
        `;

        // Position and show menu
        document.body.appendChild(menu);
        
        // Position menu properly
        this.positionBranchMenu(menu);
        
        // Add click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
        }, 100);
        
        this.showStatus(`Tag ${tagName} actions available`, 'info');
    }

    // Wrapper method to handle button state for tag actions
    async performTagActionWithButton(event, action, tagName) {
        const button = event.target;
        return this.performTagAction(action, tagName, button);
    }

    // Perform tag action
    async performTagAction(action, tagName, clickedButton = null) {
        // Prevent multiple simultaneous operations
        if (this.isPerformingTagAction) {
            this.showStatus('Tag operation already in progress...', 'info');
            return;
        }

        this.isPerformingTagAction = true;

        // Disable the clicked button to provide visual feedback
        if (clickedButton && clickedButton.classList.contains('action-btn')) {
            clickedButton.classList.add('loading');
            clickedButton.disabled = true;
        }

        // Close action menu after a short delay to show the loading state
        const menu = document.querySelector('.action-menu');
        setTimeout(() => {
            if (menu) menu.remove();
        }, 300);

        try {
            switch (action) {
                case 'delete':
                    if (confirm(this.t('dialog.delete_tag_confirm', tagName))) {
                        this.showStatus(`Deleting tag ${tagName}...`, 'info');
                        await gAItAPI.deleteTag(tagName);
                        this.showStatus(`Tag ${tagName} deleted successfully`, 'success');
                        
                        // If we're currently viewing this tag, exit tag mode
                        if (this.currentTag === tagName) {
                            await this.exitTagMode();
                        } else {
                            // Just refresh data to update the tag list
                            await this.loadData();
                        }
                    } else {
                        this.showStatus('Tag deletion cancelled', 'info');
                    }
                    break;

                case 'push':
                    const remotes = this.currentData.remotes || [];
                    if (remotes.length === 0) {
                        this.showStatus('No remotes configured', 'error');
                        break;
                    }
                    
                    const remoteName = remotes.length === 1 ? remotes[0].name : 
                        prompt(this.t('dialog.push_tag', tagName, remotes.map(r => r.name).join(', '))) || 'origin';
                    
                    this.showStatus(`Pushing tag ${tagName} to ${remoteName}...`, 'info');
                    await gAItAPI.pushTag(tagName, remoteName);
                    this.showStatus(`Tag ${tagName} pushed to ${remoteName} successfully`, 'success');
                    break;
            }
        } catch (error) {
            console.error(`Tag ${action} failed:`, error);
            this.showStatus(`Tag ${action} failed: ${error.message}`, 'error');
        } finally {
            this.isPerformingTagAction = false;
        }
    }

    // Load commits for a specific tag
    async loadCommitsByTag(tagName) {
        this.showStatus(`Loading commits for tag ${tagName}...`, 'info');
        try {
            // Reset lazy loading state for tag mode
            this.commitsOffset = 0;
            this.hasMoreCommits = true;
            this.isSearchMode = false;
            this.currentTag = tagName; // Track current tag
            
            // Clear selected commit when switching to tag view
            this.clearSelectedCommit();
            
            // Use server-side rendering for better performance
            if (this.useServerSideRendering) {
                await this.renderCommitsByTagSSR(tagName, true); // true = replace content
            } else {
                // Fallback to client-side rendering
                const commits = await gAItAPI.getCommitsByTag(tagName, this.commitsLimit, 0);
                this.currentData.commits = commits;
                this.renderCommits(commits, true);
            }
            
            this.commitsOffset = this.commitsLimit;
            
            // Update UI to show we're in tag mode
            this.updateTagModeUI(tagName);
            
            this.showStatus(`Loaded commits for tag ${tagName}`, 'success');
        } catch (error) {
            console.error('Failed to load commits for tag:', error);
            this.showStatus(`Failed to load commits for tag ${tagName}`, 'error');
        }
    }

    // Server-side rendered commits for tags
    async renderCommitsByTagSSR(tagName, replace = false) {
        const list = document.getElementById('commitsList');
        
        try {
            const html = await gAItAPI.getCommitsByTagHTML(tagName, this.commitsLimit, replace ? 0 : this.commitsOffset);
            
            if (replace) {
                list.innerHTML = html;
            } else {
                // Remove loading indicator if it exists
                const loadingIndicator = list.querySelector('.loading-more');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                
                // Append new commits
                list.insertAdjacentHTML('beforeend', html);
            }
        } catch (error) {
            console.error('Server-side rendering failed for tag, falling back to client-side:', error);
            this.useServerSideRendering = false;
            
            // Fallback to client-side rendering
            if (replace) {
                const commits = await gAItAPI.getCommitsByTag(tagName, this.commitsLimit, 0);
                this.currentData.commits = commits;
                this.renderCommits(commits, true);
            }
        }
    }

    // Update UI to show tag mode
    updateTagModeUI(tagName) {
        // Add visual indicator that we're viewing a tag
        const commitListContainer = document.getElementById('commitListContainer');
        const existingIndicator = commitListContainer.querySelector('.tag-mode-indicator');
        
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'tag-mode-indicator';
        indicator.innerHTML = `
            <div class="mode-indicator">
                <span class="mode-icon">🏷️</span>
                <span class="mode-text">Viewing commits for tag: <strong>${this.escapeHtml(tagName)}</strong> • Click any branch to switch</span>
                <button class="mode-close" onclick="gAItUI.exitTagMode()" title="Exit tag mode">✕</button>
            </div>
        `;
        
        const commitsList = document.getElementById('commitsList');
        commitListContainer.insertBefore(indicator, commitsList);
        
        // Highlight the selected tag in the sidebar
        document.querySelectorAll('#tagsList li').forEach(item => {
            item.classList.remove('selected');
        });
        
        const tagItems = document.querySelectorAll('#tagsList li');
        tagItems.forEach(item => {
            const tagNameSpan = item.querySelector('span');
            if (tagNameSpan && tagNameSpan.textContent === tagName) {
                item.classList.add('selected');
            }
        });
    }

    // Exit tag mode and return to normal commit view
    async exitTagMode() {
        // Close any action menus first
        const menu = document.querySelector('.action-menu');
        if (menu) menu.remove();

        this.currentTag = null;
        
        // Remove tag mode indicator
        const indicator = document.querySelector('.tag-mode-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Remove tag selection highlight
        document.querySelectorAll('#tagsList li').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Reload normal commit view
        this.showStatus('Loading commits...', 'info');
        await this.loadData();
    }

    // Exit tag mode and checkout a specific branch
    async exitTagModeAndCheckoutBranch(branchName) {
        try {
            this.showStatus(`Exiting tag mode and checking out ${branchName}...`, 'info');
            
            // First checkout the branch
            await gAItAPI.checkoutBranch(branchName);
            
            // Then exit tag mode (this will reload data, show the new branch, and close the modal)
            await this.exitTagMode();
            
            this.showStatus(`Checked out ${branchName} and exited tag mode`, 'success');
        } catch (error) {
            console.error('Failed to checkout branch from tag mode:', error);
            this.showStatus(`Failed to checkout ${branchName}: ${error.message}`, 'error');
            
            // Close the modal even if there was an error
            const menu = document.querySelector('.action-menu');
            if (menu) menu.remove();
            
            // Still try to exit tag mode even if checkout failed
            await this.exitTagMode();
        }
    }

    // Load more commits for tag mode
    async loadMoreCommitsByTag() {
        if (this.isLoading || !this.hasMoreCommits || this.isSearchMode || !this.currentTag) {
            return;
        }
        
        this.isLoading = true;
        this.showStatus('Loading more commits...', 'info');
        
        try {
            if (this.useServerSideRendering) {
                // Use server-side rendering for better performance
                await this.renderCommitsByTagSSR(this.currentTag, false);
                
                // Update state - we need to fetch the actual commit data for state management
                const newCommits = await gAItAPI.getCommitsByTag(this.currentTag, this.commitsLimit, this.commitsOffset);
                this.currentData.commits.push(...newCommits);
                this.commitsOffset += newCommits.length;
                this.hasMoreCommits = newCommits.length === this.commitsLimit;
                
                this.showStatus(`Loaded ${newCommits.length} more commits`, 'success');
            } else {
                // Fallback to client-side rendering
                const newCommits = await gAItAPI.getCommitsByTag(this.currentTag, this.commitsLimit, this.commitsOffset);
                
                if (newCommits.length > 0) {
                    // Add to current data
                    this.currentData.commits.push(...newCommits);
                    this.commitsOffset += newCommits.length;
                    this.hasMoreCommits = newCommits.length === this.commitsLimit;
                    
                    // Render new commits (append mode)
                    this.renderCommits(newCommits, false);
                    
                    this.showStatus(`Loaded ${newCommits.length} more commits`, 'success');
                } else {
                    this.hasMoreCommits = false;
                    this.addEndIndicator();
                    this.showStatus('All commits loaded', 'success');
                }
            }
        } catch (error) {
            console.error('Failed to load more commits for tag:', error);
            this.showStatus('Failed to load more commits', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    selectStash(index) {
        this.showStashActions(index);
    }

    selectRemote(name) {
        this.showRemoteActions(name);
    }

    // Show stash actions menu
    showStashActions(index) {
        // Close any existing menus first
        this.closeAllMenus();
        
        const stash = this.currentData.stashes.find(s => s.index === index);
        if (!stash) {
            this.showStatus('Stash not found', 'error');
            return;
        }

        // Create action menu
        const menu = document.createElement('div');
        menu.className = 'action-menu';
        menu.innerHTML = `
            <div class="action-menu-content">
                <div class="action-menu-header">
                    <h4>Stash Actions: ${this.escapeHtml(stash.message)}</h4>
                    <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                </div>
                <div class="action-menu-body">
                    <button class="action-btn primary" onclick="gAItUI.performStashActionWithButton(event, 'show', ${index}); gAItUI.closeAllMenus();">
                        👁️ Show Contents
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performStashActionWithButton(event, 'apply', ${index}); gAItUI.closeAllMenus();">
                        📥 Apply (Keep Stash)
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performStashActionWithButton(event, 'pop', ${index}); gAItUI.closeAllMenus();">
                        📤 Pop (Apply & Remove)
                    </button>
                    <button class="action-btn danger" onclick="gAItUI.performStashActionWithButton(event, 'drop', ${index}); gAItUI.closeAllMenus();">
                        🗑️ Drop (Delete)
                    </button>
                </div>
            </div>
        `;

        // Position and show menu
        document.body.appendChild(menu);
        this.positionBranchMenu(menu); // Reuse the same positioning logic
        
        // Add click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
        }, 100);
        
        this.showStatus(`Stash ${index} actions available`, 'info');
    }

    // Show remote actions menu
    showRemoteActions(name) {
        // Close any existing menus first
        this.closeAllMenus();
        
        const remote = this.currentData.remotes.find(r => r.name === name);
        if (!remote) {
            this.showStatus('Remote not found', 'error');
            return;
        }

        // Create action menu
        const menu = document.createElement('div');
        menu.className = 'action-menu';
        menu.innerHTML = `
            <div class="action-menu-content">
                <div class="action-menu-header">
                    <h4>Remote Actions: ${this.escapeHtml(name)}</h4>
                    <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                </div>
                <div class="action-menu-body">
                    <button class="action-btn primary" onclick="gAItUI.performRemoteActionWithButton(event, 'info', '${name}'); gAItUI.closeAllMenus();">
                        ℹ️ Show Info
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performRemoteActionWithButton(event, 'fetch', '${name}'); gAItUI.closeAllMenus();">
                        📥 Fetch
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performRemoteActionWithButton(event, 'pull', '${name}'); gAItUI.closeAllMenus();">
                        ⬇️ Pull
                    </button>
                    <button class="action-btn secondary" onclick="gAItUI.performRemoteActionWithButton(event, 'push', '${name}'); gAItUI.closeAllMenus();">
                        ⬆️ Push
                    </button>
                </div>
            </div>
        `;

        // Position and show menu
        document.body.appendChild(menu);
        this.positionBranchMenu(menu); // Reuse the same positioning logic
        
        // Add click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
        }, 100);
        
        this.showStatus(`Remote ${name} actions available`, 'info');
    }

    // Wrapper method to handle button state for stash actions
    async performStashActionWithButton(event, action, index) {
        const button = event.target;
        return this.performStashAction(action, index, button);
    }

    // Perform stash action
    async performStashAction(action, index, clickedButton = null) {
        // Prevent multiple simultaneous operations
        if (this.isPerformingStashAction) {
            this.showStatus('Stash operation already in progress...', 'info');
            return;
        }

        this.isPerformingStashAction = true;

        // Disable the clicked button to provide visual feedback
        if (clickedButton && clickedButton.classList.contains('action-btn')) {
            clickedButton.classList.add('loading');
            clickedButton.disabled = true;
        }

        // Close action menu after a short delay to show the loading state
        const menu = document.querySelector('.action-menu');
        setTimeout(() => {
            if (menu) menu.remove();
        }, 300);

        try {
            switch (action) {
                case 'show':
                    this.showStatus(`Loading stash ${index} contents...`, 'info');
                    const stashCommit = await gAItAPI.showStash(index);
                    this.renderCommitDetails(stashCommit);
                    
                    // Show commit details panel
                    const detailsPanel = document.getElementById('commitDetails');
                    detailsPanel.classList.remove('hidden');
                    
                    this.showStatus(`Stash ${index} contents loaded`, 'success');
                    break;

                case 'apply':
                    this.showStatus(`Applying stash ${index}...`, 'info');
                    await gAItAPI.applyStash(index);
                    this.showStatus(`Stash ${index} applied successfully`, 'success');
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'pop':
                    this.showStatus(`Popping stash ${index}...`, 'info');
                    await gAItAPI.popStash(index);
                    this.showStatus(`Stash ${index} popped successfully`, 'success');
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'drop':
                    if (confirm(this.t('dialog.delete_stash_confirm', index))) {
                        this.showStatus(`Dropping stash ${index}...`, 'info');
                        await gAItAPI.dropStash(index);
                        this.showStatus(`Stash ${index} dropped successfully`, 'success');
                        // Refresh data immediately
                        await this.loadData();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Stash ${action} failed:`, error);
            this.showStatus(`Stash ${action} failed: ${error.message}`, 'error');
        } finally {
            this.isPerformingStashAction = false;
        }
    }

    // Wrapper method to handle button state for remote actions
    async performRemoteActionWithButton(event, action, remoteName) {
        const button = event.target;
        return this.performRemoteAction(action, remoteName, button);
    }

    // Perform remote action
    async performRemoteAction(action, remoteName, clickedButton = null) {
        // Prevent multiple simultaneous operations
        if (this.isPerformingRemoteAction) {
            this.showStatus('Remote operation already in progress...', 'info');
            return;
        }

        this.isPerformingRemoteAction = true;

        // Disable the clicked button to provide visual feedback
        if (clickedButton && clickedButton.classList.contains('action-btn')) {
            clickedButton.classList.add('loading');
            clickedButton.disabled = true;
        }

        // Close action menu after a short delay to show the loading state
        const menu = document.querySelector('.action-menu');
        setTimeout(() => {
            if (menu) menu.remove();
        }, 300);

        try {
            switch (action) {
                case 'info':
                    this.showStatus(`Loading remote ${remoteName} info...`, 'info');
                    const remoteInfo = await gAItAPI.getRemoteInfo(remoteName);
                    this.showRemoteInfo(remoteInfo);
                    this.showStatus(`Remote ${remoteName} info loaded`, 'success');
                    break;

                case 'fetch':
                    this.showStatus(`Fetching from ${remoteName}...`, 'info');
                    await gAItAPI.fetch();
                    this.showStatus(`Fetched from ${remoteName} successfully`, 'success');
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'pull':
                    this.showStatus(`Pulling from ${remoteName}...`, 'info');
                    await gAItAPI.pullFromRemote(remoteName, '');
                    this.showStatus(`Pulled from ${remoteName} successfully`, 'success');
                    // Refresh data immediately
                    await this.loadData();
                    break;

                case 'push':
                    this.showStatus(`Pushing to ${remoteName}...`, 'info');
                    await gAItAPI.pushToRemote(remoteName, '', false);
                    this.showStatus(`Pushed to ${remoteName} successfully`, 'success');
                    break;
            }
        } catch (error) {
            console.error(`Remote ${action} failed:`, error);
            this.showStatus(`Remote ${action} failed: ${error.message}`, 'error');
        } finally {
            this.isPerformingRemoteAction = false;
        }
    }

    // Show remote info in a modal
    showRemoteInfo(remote) {
        const modal = document.createElement('div');
        modal.className = 'info-modal';
        modal.innerHTML = `
            <div class="info-modal-content">
                <div class="info-modal-header">
                    <h4>Remote Information: ${this.escapeHtml(remote.name)}</h4>
                    <button class="info-modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="info-modal-body">
                    <div class="info-item">
                        <strong>Name:</strong> ${this.escapeHtml(remote.name)}
                    </div>
                    <div class="info-item">
                        <strong>Fetch URL:</strong> ${this.escapeHtml(remote.fetchUrl || 'Not set')}
                    </div>
                    <div class="info-item">
                        <strong>Push URL:</strong> ${this.escapeHtml(remote.pushUrl || 'Not set')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper function to get translated text with placeholder replacement
    t(key, fallback = null, ...args) {
        let text = fallback || key;
        
        // Replace placeholders {0}, {1}, etc. with provided arguments
        args.forEach((arg, index) => {
            text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
        });
        
        return text;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        try {
            return new Date(dateString).toLocaleDateString() + ' ' + 
                   new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch { return 'Invalid date'; }
    }

    showStatus(message, type = 'info') {
        const statusBar = document.getElementById('statusBar');
        statusBar.textContent = message;
        statusBar.className = `status-bar ${type}`;
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusBar.textContent = 'Ready';
                statusBar.className = 'status-bar';
            }, 3000);
        }
    }

    toggleSearch() {
        const searchBox = document.getElementById('searchBox');
        const searchInput = document.getElementById('searchInput');
        
        this.searchVisible = !this.searchVisible;
        searchBox.style.display = this.searchVisible ? 'block' : 'none';
        
        if (this.searchVisible) {
            searchInput.focus();
            // Show search options if not already visible
            this.showSearchOptions();
        } else {
            searchInput.value = '';
            this.isSearchMode = false;
            this.renderCommits(this.currentData.commits, true);
            // Restore selected commit when closing search
            setTimeout(() => {
                this.restoreSelectedCommit();
            }, 100);
        }
    }

    // Show advanced search options
    showSearchOptions() {
        const searchBox = document.getElementById('searchBox');
        const existingOptions = searchBox.querySelector('.search-options');
        
        if (!existingOptions) {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'search-options';
            optionsDiv.innerHTML = `
                <div class="search-filters">
                    <label class="search-filter">
                        <input type="checkbox" id="searchMessage" checked> Message
                    </label>
                    <label class="search-filter">
                        <input type="checkbox" id="searchAuthor" checked> Author
                    </label>
                    <label class="search-filter">
                        <input type="checkbox" id="searchHash" checked> Hash
                    </label>
                    <label class="search-filter">
                        <input type="checkbox" id="searchFiles"> Files
                    </label>
                    <label class="search-filter">
                        <input type="checkbox" id="searchDate"> Date Range
                    </label>
                </div>
                <div class="search-advanced" id="searchAdvanced" style="display: none;">
                    <div class="date-range">
                        <label>From: <input type="date" id="searchDateFrom"></label>
                        <label>To: <input type="date" id="searchDateTo"></label>
                    </div>
                </div>
            `;
            searchBox.appendChild(optionsDiv);
            
            // Add event listeners for search options
            document.getElementById('searchDate').addEventListener('change', (e) => {
                document.getElementById('searchAdvanced').style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase();
        
        if (query === '') {
            this.isSearchMode = false;
            this.renderCommits(this.currentData.commits, true);
            // Restore selected commit when exiting search
            setTimeout(() => {
                this.restoreSelectedCommit();
            }, 100);
            return;
        }
        
        this.isSearchMode = true;
        
        // Get search options
        const searchMessage = document.getElementById('searchMessage')?.checked ?? true;
        const searchAuthor = document.getElementById('searchAuthor')?.checked ?? true;
        const searchHash = document.getElementById('searchHash')?.checked ?? true;
        const searchFiles = document.getElementById('searchFiles')?.checked ?? false;
        const searchDate = document.getElementById('searchDate')?.checked ?? false;
        
        let filtered = this.currentData.commits.filter(commit => {
            let matches = false;
            
            // Text-based searches
            if (searchMessage && commit.message.toLowerCase().includes(query)) {
                matches = true;
            }
            if (searchAuthor && commit.author.name.toLowerCase().includes(query)) {
                matches = true;
            }
            if (searchHash && commit.hash.toLowerCase().includes(query)) {
                matches = true;
            }
            if (searchFiles && commit.fileChanges) {
                const fileMatches = commit.fileChanges.some(file => 
                    file.path.toLowerCase().includes(query)
                );
                if (fileMatches) matches = true;
            }
            
            return matches;
        });
        
        // Apply date range filter if enabled
        if (searchDate) {
            const dateFrom = document.getElementById('searchDateFrom')?.value;
            const dateTo = document.getElementById('searchDateTo')?.value;
            
            if (dateFrom || dateTo) {
                filtered = filtered.filter(commit => {
                    const commitDate = new Date(commit.date);
                    let inRange = true;
                    
                    if (dateFrom) {
                        const fromDate = new Date(dateFrom);
                        if (commitDate < fromDate) inRange = false;
                    }
                    
                    if (dateTo) {
                        const toDate = new Date(dateTo);
                        toDate.setHours(23, 59, 59, 999); // End of day
                        if (commitDate > toDate) inRange = false;
                    }
                    
                    return inRange;
                });
            }
        }
        
        this.renderCommits(filtered, true);
        
        // Show search results count
        this.showStatus(`Found ${filtered.length} commit${filtered.length !== 1 ? 's' : ''} matching "${query}"`, 'info');
        
        // Try to restore selected commit if it's in the filtered results
        if (this.selectedCommit) {
            const foundInFiltered = filtered.find(commit => commit.hash === this.selectedCommit);
            if (foundInFiltered) {
                setTimeout(() => {
                    const commitElement = document.querySelector(`[data-hash="${this.selectedCommit}"]`);
                    if (commitElement) {
                        commitElement.classList.add('selected');
                    }
                }, 50);
            } else {
                // Hide commit details if selected commit is not in filtered results
                const detailsPanel = document.getElementById('commitDetails');
                detailsPanel.classList.add('hidden');
            }
        }
    }

    // Load more commits for lazy loading
    async loadMoreCommits() {
        if (this.isLoading || !this.hasMoreCommits || this.isSearchMode) {
            return;
        }
        
        // If we're in tag mode, use the tag-specific loading function
        if (this.currentTag) {
            return this.loadMoreCommitsByTag();
        }
        
        this.isLoading = true;
        this.showStatus('Loading more commits...', 'info');
        
        try {
            if (this.useServerSideRendering) {
                // Use server-side rendering for better performance
                await this.renderCommitsSSR(false);
                
                // Update state - we need to fetch the actual commit data for state management
                const newCommits = await gAItAPI.getCommits(this.commitsLimit, this.commitsOffset);
                this.currentData.commits.push(...newCommits);
                this.commitsOffset += newCommits.length;
                this.hasMoreCommits = newCommits.length === this.commitsLimit;
                
                // Check if the saved selected commit is in the newly loaded commits
                if (!this.selectedCommit && typeof getSavedSelectedCommit === 'function') {
                    const savedCommitHash = getSavedSelectedCommit();
                    if (savedCommitHash) {
                        const foundCommit = newCommits.find(commit => commit.hash === savedCommitHash);
                        if (foundCommit) {
                            setTimeout(() => {
                                this.restoreSelectedCommit();
                            }, 100);
                        }
                    }
                }
                
                this.showStatus(`Loaded ${newCommits.length} more commits`, 'success');
            } else {
                // Fallback to client-side rendering
                const newCommits = await gAItAPI.getCommits(this.commitsLimit, this.commitsOffset);
                
                if (newCommits.length > 0) {
                    // Add to current data
                    this.currentData.commits.push(...newCommits);
                    this.commitsOffset += newCommits.length;
                    this.hasMoreCommits = newCommits.length === this.commitsLimit;
                    
                    // Render new commits (append mode)
                    this.renderCommits(newCommits, false);
                    
                    // Check if the saved selected commit is in the newly loaded commits
                    if (!this.selectedCommit && typeof getSavedSelectedCommit === 'function') {
                        const savedCommitHash = getSavedSelectedCommit();
                        if (savedCommitHash) {
                            const foundCommit = newCommits.find(commit => commit.hash === savedCommitHash);
                            if (foundCommit) {
                                setTimeout(() => {
                                    this.restoreSelectedCommit();
                                }, 100);
                            }
                        }
                    }
                    
                    this.showStatus(`Loaded ${newCommits.length} more commits`, 'success');
                } else {
                    this.hasMoreCommits = false;
                    this.addEndIndicator();
                    this.showStatus('All commits loaded', 'success');
                }
            }
        } catch (error) {
            console.error('Failed to load more commits:', error);
            this.showStatus('Failed to load more commits', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Add loading indicator at the bottom of the list
    addLoadingIndicator() {
        const list = document.getElementById('commitsList');
        const existingIndicator = list.querySelector('.loading-more');
        
        if (!existingIndicator) {
            const indicator = document.createElement('li');
            indicator.className = 'loading-more';
            indicator.innerHTML = '<div class="loading">Loading more commits...</div>';
            list.appendChild(indicator);
        }
    }

    // Add end indicator when all commits are loaded
    addEndIndicator() {
        const list = document.getElementById('commitsList');
        const existingIndicator = list.querySelector('.loading-more, .end-indicator');
        
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('li');
        indicator.className = 'end-indicator';
        indicator.innerHTML = '<div class="loading">📜 All commits loaded</div>';
        list.appendChild(indicator);
    }

    // Initialize scroll listener for lazy loading
    initializeScrollListener() {
        const commitListContainer = document.getElementById('commitListContainer');
        
        commitListContainer.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = commitListContainer;
            
            // Load more when user scrolls to within 200px of the bottom
            if (scrollHeight - scrollTop - clientHeight < 200) {
                this.loadMoreCommits();
            }
        });
    }

    // Restore expanded files state for the current commit
    restoreExpandedFiles(commitHash) {
        if (!commitHash) return;
        
        // Get all files that should be expanded for this commit
        const filesToExpand = Array.from(this.expandedFiles).filter(fileKey => 
            fileKey.startsWith(commitHash + '-')
        );
        
        if (filesToExpand.length === 0) {
            return;
        }
        
        // Process each file that should be expanded
        filesToExpand.forEach(fileKey => {
            const filePath = fileKey.substring(commitHash.length + 1);
            
            // Find the file element by matching the file path in tree structure
            const fileElements = document.querySelectorAll('.file-item.tree-file');
            fileElements.forEach((fileElement, index) => {
                // For tree structure, we need to reconstruct the full path from data-path attribute
                const dataPath = fileElement.getAttribute('data-path');
                
                if (dataPath === filePath) {
                    // Expand this file
                    fileElement.classList.add('expanded');
                    
                    // Rotate the expand icon
                    const expandIcon = fileElement.querySelector('.file-expand-icon');
                    if (expandIcon) {
                        expandIcon.style.transform = 'rotate(90deg)';
                    }
                    
                    // Show the diff content (let CSS handle display via expanded class)
                    const fileDiff = fileElement.querySelector('.file-diff');
                    if (fileDiff) {
                        fileDiff.style.display = '';
                    }
                }
            });
        });
    }

    // Render uncommitted changes as if they were a commit with file tree
    renderUncommittedChangesAsCommit() {
        const title = document.getElementById('detailsTitle');
        const content = document.getElementById('detailsContent');
        
        title.textContent = this.t('commit.uncommitted_changes', 'Uncommitted Changes');
        
        const changes = this.currentData.uncommittedChanges || [];
        
        if (changes.length === 0) {
            content.innerHTML = `
                <div class="commit-info">
                    <h3>${this.t('commit.no_uncommitted', 'No Uncommitted Changes')}</h3>
                    <div class="meta">${this.t('commit.working_clean', 'Working directory is clean')}</div>
                </div>
            `;
            return;
        }
        
        // Group changes by status for summary
        const stagedChanges = changes.filter(change => change.status && change.status.startsWith('staged-'));
        const unstagedChanges = changes.filter(change => change.status && change.status.startsWith('unstaged-'));
        const untrackedFiles = changes.filter(change => change.status === 'untracked');
        
        // Calculate total additions and deletions from actual data
        let totalAdditions = 0;
        let totalDeletions = 0;
        let filesChanged = changes.length;
        
        // Sum up actual additions and deletions from the backend data
        changes.forEach(change => {
            totalAdditions += change.additions || 0;
            totalDeletions += change.deletions || 0;
        });
        
        let html = `
            <div class="commit-info">
                <h3>${this.t('commit.uncommitted', 'Uncommitted Changes')}</h3>
                <div class="meta">${this.t('commit.displaying', 'Displaying all uncommitted changes')}.</div>
                <div class="commit-stats">
                    <span class="files-changed">${filesChanged} ${filesChanged !== 1 ? this.t('commit.files_changed', 'files changed') : this.t('commit.file_changed', 'file changed')}</span>
                    ${totalAdditions > 0 ? `<span class="total-additions">+${totalAdditions}</span>` : ''}
                    ${totalDeletions > 0 ? `<span class="total-deletions">-${totalDeletions}</span>` : ''}
                </div>
                <div class="commit-stats">
                    ${stagedChanges.length > 0 ? `<span class="staged-count">${stagedChanges.length} ${this.t('file.status.staged', 'staged')}</span>` : ''}
                    ${unstagedChanges.length > 0 ? `<span class="unstaged-count">${unstagedChanges.length} ${this.t('file.status.unstaged', 'unstaged')}</span>` : ''}
                    ${untrackedFiles.length > 0 ? `<span class="untracked-count">${untrackedFiles.length} ${this.t('file.status.untracked', 'untracked')}</span>` : ''}
                </div>
                <div class="commit-actions">
                    ${stagedChanges.length > 0 ? `
                        <button class="action-btn primary" onclick="gAItUI.showCommitDialog()" title="Create commit with staged changes">
                            💾 ${this.t('commit.commit_staged', 'Commit Staged Changes')}
                        </button>
                    ` : ''}
                    ${unstagedChanges.length > 0 || untrackedFiles.length > 0 ? `
                        <button class="action-btn secondary" onclick="gAItUI.stageAllChanges()" title="Stage all changes for commit">
                            ➕ ${this.t('commit.stage_all', 'Stage All Changes')}
                        </button>
                    ` : ''}
                    ${stagedChanges.length > 0 ? `
                                        <button class="action-btn secondary" onclick="gAItUI.unstageAllChanges()" title="Unstage all changes">
                    ➖ ${this.t('commit.unstage_all', 'Unstage All Changes')}
                        </button>
                    ` : ''}
                    <button class="action-btn secondary" onclick="gAItUI.refreshUncommittedChanges()" title="${this.t('refresh.title', 'Refresh uncommitted changes')}">
                        🔄 ${this.t('action.refresh', 'Refresh')}
                    </button>
                </div>
            </div>
        `;
        
        // Build tree structure from file paths
        const fileTree = this.buildFileTree(changes);
        
        // Create file tree structure
        html += `
            <div class="file-changes">
                <h4>${this.t('commit.changed_files', 'Changed Files')} (${changes.length})
                    <div class="file-tree-controls">
                        <button class="tree-control-btn" onclick="gAItUI.expandAllDirectories()" title="Expand all directories">📁</button>
                        <button class="tree-control-btn" onclick="gAItUI.collapseAllDirectories()" title="Collapse all directories">📂</button>
                    </div>
                </h4>
                <div class="file-tree">
                    ${this.renderFileTreeNode(fileTree, '', 0)}
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        // Restore expanded files state for uncommitted changes
        setTimeout(() => {
            this.restoreExpandedFiles('uncommitted');
        }, 100);
    }

    // Build a tree structure from file paths
    buildFileTree(changes) {
        const tree = {};
        
        changes.forEach((change, index) => {
            const parts = change.path.split('/');
            let current = tree;
            
            // Build the directory structure
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {
                        type: 'directory',
                        children: {},
                        files: []
                    };
                }
                current = current[part].children;
            }
            
            // Add the file
            const fileName = parts[parts.length - 1];
            if (!current[fileName]) {
                current[fileName] = {
                    type: 'file',
                    data: { ...change, index: index }
                };
            }
        });
        
        return tree;
    }

    // Render a tree node (directory or file)
    renderFileTreeNode(node, path, depth) {
        let html = '';
        const indent = '  '.repeat(depth);
        
        // Sort entries: directories first, then files
        const entries = Object.entries(node).sort(([aName, aNode], [bName, bNode]) => {
            if (aNode.type === 'directory' && bNode.type === 'file') return -1;
            if (aNode.type === 'file' && bNode.type === 'directory') return 1;
            return aName.localeCompare(bName);
        });
        
        entries.forEach(([name, nodeData]) => {
            const currentPath = path ? `${path}/${name}` : name;
            
            if (nodeData.type === 'directory') {
                // Render directory - collapsed by default
                const hasFiles = Object.keys(nodeData.children).length > 0;
                const dirId = `dir-${currentPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
                
                html += `
                    <div class="tree-directory collapsed" data-path="${currentPath}">
                        <div class="tree-item directory" onclick="gAItUI.toggleDirectory('${dirId}')">
                            <span class="tree-icon" id="${dirId}-icon">📂</span>
                            <span class="tree-name">${this.escapeHtml(name)}</span>
                        </div>
                        <div class="tree-children" id="${dirId}" style="display: none;">
                            ${hasFiles ? this.renderFileTreeNode(nodeData.children, currentPath, depth + 1) : ''}
                        </div>
                    </div>
                `;
            } else {
                // Render file
                const change = nodeData.data;
                const index = change.index;
                
                // Map git status to file status classes for coloring
                let fileStatusClass = 'M'; // default to modified
                let statusLetter = 'M';
                
                if (change.status === 'untracked') {
                    fileStatusClass = 'A'; // treat untracked as added
                    statusLetter = 'A';
                } else if (change.status.includes('a') || change.status.includes('A')) {
                    fileStatusClass = 'A'; // added
                    statusLetter = 'A';
                } else if (change.status.includes('d') || change.status.includes('D')) {
                    fileStatusClass = 'D'; // deleted
                    statusLetter = 'D';
                } else if (change.status.includes('r') || change.status.includes('R')) {
                    fileStatusClass = 'R'; // renamed
                    statusLetter = 'R';
                } else if (change.status.includes('m') || change.status.includes('M')) {
                    fileStatusClass = 'M'; // modified
                    statusLetter = 'M';
                }
                
                // Use actual file-level additions/deletions from backend
                const fileAdditions = change.additions || 0;
                const fileDeletions = change.deletions || 0;
                
                html += `
                    <div class="file-item tree-file" id="uncommitted-file-${index}" data-path="${currentPath}">
                        <div class="file-header tree-item file" onclick="gAItUI.toggleUncommittedFileExpansion('${this.escapeHtml(change.path)}', ${index})">
                            <div class="file-expand-icon">▶</div>
                            <span class="file-status ${fileStatusClass}">${statusLetter}</span>
                            <span class="tree-name file-name">${this.escapeHtml(name)}</span>
                            <span class="file-stats">
                                ${fileAdditions > 0 ? `<span class="additions">+${fileAdditions}</span>` : ''}
                                ${fileAdditions > 0 && fileDeletions > 0 ? `<span class="separator">-</span>` : ''}
                                ${fileDeletions > 0 ? `<span class="deletions">${fileDeletions}</span>` : ''}
                            </span>
                            <div class="file-actions" onclick="event.stopPropagation()">
                                ${change.status.startsWith('staged-') ? `
                                    <button class="file-action-btn unstage" onclick="gAItUI.unstageFile('${this.escapeHtml(change.path)}')" title="Unstage file">
                                        ➖
                                    </button>
                                ` : `
                                    <button class="file-action-btn stage" onclick="gAItUI.stageFile('${this.escapeHtml(change.path)}')" title="Stage file">
                                        ➕
                                    </button>
                                `}
                                ${!change.status.startsWith('staged-') ? `
                                    <button class="file-action-btn discard" onclick="gAItUI.discardFileChanges('${this.escapeHtml(change.path)}')" title="${this.t('commit.discard_changes', 'Discard changes')}"
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="file-diff" id="uncommitted-diff-${index}">
                            <div class="diff-controls">
                                <div class="diff-view-toggle">
                                    <button class="diff-view-btn active" onclick="gAItUI.switchUncommittedDiffView(${index}, 'split')">${this.t('file.split_view', 'Split')}</button>
                                    <button class="diff-view-btn" onclick="gAItUI.switchUncommittedDiffView(${index}, 'unified')">${this.t('file.unified_view', 'Unified')}</button>
                                </div>
                                <button class="diff-wrap-btn active" id="uncommitted-wrap-btn-${index}" onclick="gAItUI.toggleUncommittedWrap(${index})">${this.t('file.wrap', 'Wrap')}</button>
                                <button class="diff-edit-btn" onclick="gAItUI.toggleUncommittedFileEditor('${this.escapeHtml(change.path)}', ${index})">${this.t('file.edit', 'Edit')}</button>
                                <button class="diff-fullscreen-btn" onclick="gAItUI.openUncommittedFullscreenDiff('${this.escapeHtml(change.path)}', ${index})">${this.t('file.fullscreen', 'Fullscreen')}</button>
                            </div>
                            <div class="diff-content" id="uncommitted-diff-content-${index}">
                                <div class="loading">${this.t('file.loading_diff', 'Loading diff...')}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        return html;
    }

    // Toggle directory expansion
    toggleDirectory(dirId) {
        const dirElement = document.getElementById(dirId);
        const iconElement = document.getElementById(dirId + '-icon');
        const parentDirectory = dirElement.closest('.tree-directory');
        
        if (dirElement.style.display === 'none') {
            // Expanding directory
            dirElement.style.display = 'block';
            iconElement.textContent = '📁';
            if (parentDirectory) {
                parentDirectory.classList.remove('collapsed');
            }
        } else {
            // Collapsing directory
            dirElement.style.display = 'none';
            iconElement.textContent = '📂';
            if (parentDirectory) {
                parentDirectory.classList.add('collapsed');
            }
        }
    }

    // Expand all directories in the current view
    expandAllDirectories() {
        const directories = document.querySelectorAll('.tree-directory');
        directories.forEach(dir => {
            const childrenElement = dir.querySelector('.tree-children');
            const iconElement = dir.querySelector('.tree-icon');
            
            if (childrenElement && iconElement) {
                childrenElement.style.display = 'block';
                iconElement.textContent = '📁';
                dir.classList.remove('collapsed');
            }
        });
        this.showStatus('All directories expanded', 'success');
    }

    // Collapse all directories in the current view
    collapseAllDirectories() {
        const directories = document.querySelectorAll('.tree-directory');
        directories.forEach(dir => {
            const childrenElement = dir.querySelector('.tree-children');
            const iconElement = dir.querySelector('.tree-icon');
            
            if (childrenElement && iconElement) {
                childrenElement.style.display = 'none';
                iconElement.textContent = '📂';
                dir.classList.add('collapsed');
            }
        });
        this.showStatus('All directories collapsed', 'success');
    }

    // Helper method to get status icons
    getStatusIcon(statusType) {
        switch(statusType) {
            case 'M': return 'M'; // Modified
            case 'A': return '+'; // Added
            case 'D': return '-'; // Deleted
            case 'R': return 'R'; // Renamed
            case 'C': return 'C'; // Copied
            case '?': return '?'; // Untracked
            default: return statusType;
        }
    }

    // Render unified diff view for uncommitted changes
    renderUnifiedDiffForUncommitted(diff, container) {
        let html = '<div class="diff-unified-view">';
        
        if (diff.hunks && diff.hunks.length > 0) {
            diff.hunks.forEach(hunk => {
                html += `<div class="diff-hunk-header">${this.escapeHtml(hunk.header)}</div>`;
                
                let oldLineNum = hunk.oldStart;
                let newLineNum = hunk.newStart;
                
                hunk.lines.forEach(line => {
                    let oldNum = '', newNum = '';
                    
                    if (line.type === 'context') {
                        oldNum = oldLineNum++;
                        newNum = newLineNum++;
                    } else if (line.type === 'deletion') {
                        oldNum = oldLineNum++;
                    } else if (line.type === 'addition') {
                        newNum = newLineNum++;
                    }
                    
                    html += `
                        <div class="diff-unified-line ${line.type}">
                            <div class="diff-line-number">${oldNum}</div>
                            <div class="diff-line-number">${newNum}</div>
                            <div class="diff-line-content">${this.escapeHtml(line.content || '')}</div>
                        </div>
                    `;
                });
            });
        } else {
            html += '<div class="diff-unified-line context"><div class="diff-line-number"></div><div class="diff-line-number"></div><div class="diff-line-content">No changes to display</div></div>';
        }
        
        html += '</div>';
        
        container.innerHTML = html;
        
        // Store diff data for view switching
        const diffView = container.querySelector('.diff-unified-view');
        if (diffView) {
            diffView.diffData = diff;
        }
    }

    // Switch between split and unified diff views for uncommitted changes
    switchUncommittedDiffView(index, viewType) {
        const buttons = document.querySelectorAll(`#uncommitted-file-${index} .diff-view-btn`);
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = Array.from(buttons).find(btn => btn.textContent.toLowerCase() === viewType);
        if (activeBtn) activeBtn.classList.add('active');
        
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        const currentDiff = diffContent.querySelector('.diff-split-view, .diff-unified-view');
        
        if (currentDiff && currentDiff.diffData) {
            if (viewType === 'split') {
                this.renderSplitDiffForUncommitted(currentDiff.diffData, diffContent);
            } else {
                this.renderUnifiedDiffForUncommitted(currentDiff.diffData, diffContent);
            }
        }
    }

    // Toggle wrap functionality for uncommitted changes
    toggleUncommittedWrap(index) {
        const wrapBtn = document.getElementById(`uncommitted-wrap-btn-${index}`);
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        const isWrapped = wrapBtn.classList.contains('active');
        
        if (isWrapped) {
            wrapBtn.classList.remove('active');
            wrapBtn.textContent = this.t('file.no_wrap', 'No Wrap');
            this.applyWrapSetting(diffContent, false);
        } else {
            wrapBtn.classList.add('active');
            wrapBtn.textContent = this.t('file.wrap', 'Wrap');
            this.applyWrapSetting(diffContent, true);
        }
    }

    // Apply wrap setting to diff content
    applyWrapSetting(container, wrapEnabled) {
        const diffLines = container.querySelectorAll('.diff-line-content');
        diffLines.forEach(line => {
            if (wrapEnabled) {
                line.classList.remove('no-wrap');
                line.style.whiteSpace = 'pre-wrap';
                line.style.wordBreak = 'break-all';
            } else {
                line.classList.add('no-wrap');
                line.style.whiteSpace = 'pre';
                line.style.wordBreak = 'normal';
            }
        });
    }

    // Open fullscreen diff for uncommitted changes
    openUncommittedFullscreenDiff(filePath, index) {
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        const currentDiff = diffContent.querySelector('.diff-split-view, .diff-unified-view');
        
        if (currentDiff && currentDiff.diffData) {
            // Use the global diff viewer for fullscreen
            gAItDiffViewer.fullscreenDiffData = currentDiff.diffData;
            const overlay = document.getElementById('fullscreenOverlay');
            const title = document.getElementById('fullscreenTitle');
            
            title.textContent = `${filePath} - ${this.t('commit.uncommitted_changes', 'Uncommitted Changes')}`;
            overlay.classList.add('active');
            
            // Render the diff in fullscreen
            gAItDiffViewer.renderFullscreenDiff(gAItDiffViewer.fullscreenDiffData, gAItDiffViewer.fullscreenCurrentView);
            
            // Focus for keyboard events
            overlay.focus();
        }
    }

    // Toggle inline file editor for uncommitted changes
    async toggleUncommittedFileEditor(filePath, index) {
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        const editBtn = document.querySelector(`#uncommitted-file-${index} .diff-edit-btn`);
        
        // Check if we're already in edit mode
        if (diffContent.querySelector('.file-editor')) {
            // Exit edit mode
            await this.exitUncommittedFileEditor(filePath, index);
            return;
        }
        
        // Enter edit mode
        this.showStatus(`Loading file content for editing: ${filePath}...`, 'info');
        
        try {
            // Get the current file content
            const response = await gAItAPI.getFileContent('uncommitted', filePath);
            const content = response.content || [];
            
            // Create the editor
            this.renderUncommittedFileEditor(filePath, index, content);
            
            // Update button text
            editBtn.textContent = '💾 Save';
            editBtn.classList.add('editing');
            
            this.showStatus(`Editing ${filePath} - Click Save when done`, 'info');
        } catch (error) {
            console.error('Failed to load file content for editing:', error);
            this.showStatus(`Failed to load file content: ${error.message}`, 'error');
        }
    }

    // Render the inline file editor
    renderUncommittedFileEditor(filePath, index, content) {
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        
        // Store the original diff content for restoration
        const originalContent = diffContent.innerHTML;
        diffContent.setAttribute('data-original-content', originalContent);
        
        // Create the editor interface
        const editorHtml = `
            <div class="file-editor">
                <div class="editor-header">
                    <h4>${this.t('editor.editing', 'Editing')}: ${this.escapeHtml(filePath)}</h4>
                    <div class="editor-controls">
                        <button class="editor-btn secondary" onclick="gAItUI.toggleEditorFullscreen('${this.escapeHtml(filePath)}', ${index})">${this.t('file.fullscreen', 'Fullscreen')}</button>
                        <button class="editor-btn secondary" onclick="gAItUI.exitUncommittedFileEditor('${this.escapeHtml(filePath)}', ${index})">${this.t('editor.cancel', 'Cancel')}</button>
                        <button class="editor-btn primary" onclick="gAItUI.saveUncommittedFileContent('${this.escapeHtml(filePath)}', ${index})">${this.t('editor.save', 'Save')}</button>
                    </div>
                </div>
                <div class="editor-content">
                    <textarea class="file-editor-textarea" id="editor-textarea-${index}" spellcheck="false">${this.escapeHtml(content.join('\n'))}</textarea>
                </div>
                <div class="editor-footer">
                    <span class="editor-info">${this.t('editor.footer_inline', 'Lines: ${content.length} | Use Ctrl+S to save | Ctrl+F11 for fullscreen', content.length)}</span>
                </div>
            </div>
        `;
        
        diffContent.innerHTML = editorHtml;
        
        // Focus the textarea and add keyboard shortcuts
        const textarea = document.getElementById(`editor-textarea-${index}`);
        textarea.focus();
        
        // Add keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveUncommittedFileContent(filePath, index);
            } else if (e.ctrlKey && e.key === 'F11') {
                e.preventDefault();
                this.toggleEditorFullscreen(filePath, index);
            }
        });
        
        // Auto-resize textarea
        this.setupTextareaAutoResize(textarea);
    }

    // Setup auto-resize for textarea
    setupTextareaAutoResize(textarea) {
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
        };
        
        textarea.addEventListener('input', resize);
        // Initial resize
        setTimeout(resize, 100);
    }

    // Save the edited file content
    async saveUncommittedFileContent(filePath, index) {
        const textarea = document.getElementById(`editor-textarea-${index}`);
        if (!textarea) {
            this.showStatus('Editor not found', 'error');
            return;
        }
        
        const content = textarea.value.split('\n');
        
        this.showStatus(`Saving ${filePath}...`, 'info');
        
        try {
            await gAItAPI.saveFileContent(filePath, content);
            this.showStatus(`File ${filePath} saved successfully`, 'success');
            
            // Exit edit mode and refresh the diff
            await this.exitUncommittedFileEditor(filePath, index);
            
            // Refresh the entire uncommitted changes to ensure git status is updated
            await this.refreshUncommittedChanges();
            
        } catch (error) {
            console.error('Failed to save file:', error);
            this.showStatus(`Failed to save file: ${error.message}`, 'error');
        }
    }

    // Exit edit mode and restore diff view
    async exitUncommittedFileEditor(filePath, index) {
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        const editBtn = document.querySelector(`#uncommitted-file-${index} .diff-edit-btn`);
        
        // Restore original content
        const originalContent = diffContent.getAttribute('data-original-content');
        if (originalContent) {
            diffContent.innerHTML = originalContent;
            diffContent.removeAttribute('data-original-content');
        }
        
        // Reset button
        editBtn.textContent = `✏️ ${this.t('file.edit', 'Edit')}`;
        editBtn.classList.remove('editing');
        
        this.showStatus('Exited edit mode', 'info');
    }

    // Refresh a specific uncommitted file's diff
    async refreshUncommittedFile(filePath, index) {
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        
        try {
            // Show loading
            diffContent.innerHTML = '<div class="loading">Refreshing diff...</div>';
            
            // Get the updated diff
            const diff = await gAItAPI.getFileDiff('uncommitted', filePath);
            
            // Re-render the diff
            this.renderUncommittedFileDiff(diff, filePath, index);
            
            this.showStatus('Diff refreshed', 'success');
        } catch (error) {
            console.error('Failed to refresh diff:', error);
            diffContent.innerHTML = `<div class="error">Failed to refresh diff: ${error.message}</div>`;
            this.showStatus('Failed to refresh diff', 'error');
        }
    }

    // Toggle fullscreen mode for the editor
    toggleEditorFullscreen(filePath, index) {
        const textarea = document.getElementById(`editor-textarea-${index}`);
        if (!textarea) {
            this.showStatus('Editor not found', 'error');
            return;
        }

        // Check if we're already in fullscreen
        const existingOverlay = document.getElementById('editor-fullscreen-overlay');
        if (existingOverlay) {
            this.exitEditorFullscreen(filePath, index);
            return;
        }

        // Get current content
        const content = textarea.value;
        const lines = content.split('\n');

        // Create fullscreen overlay
        const overlay = document.createElement('div');
        overlay.id = 'editor-fullscreen-overlay';
        overlay.className = 'fullscreen-overlay active';
        overlay.innerHTML = `
            <div class="fullscreen-header">
                <div class="fullscreen-title">${this.t('editor.editing', 'Editing')}: ${this.escapeHtml(filePath)}</div>
                <div class="fullscreen-controls">
                    <button class="editor-btn secondary" onclick="gAItUI.saveFullscreenEditorContent('${this.escapeHtml(filePath)}', ${index})">💾 Save</button>
                    <button class="editor-btn secondary" onclick="gAItUI.exitEditorFullscreen('${this.escapeHtml(filePath)}', ${index})">✕ Exit Fullscreen</button>
                </div>
            </div>
            <div class="fullscreen-content">
                <div class="fullscreen-editor-content">
                    <div class="fullscreen-editor-line-numbers" id="fullscreen-line-numbers"></div>
                    <textarea class="fullscreen-editor-textarea" id="fullscreen-editor-textarea" spellcheck="false">${this.escapeHtml(content)}</textarea>
                </div>
            </div>
            <div class="fullscreen-editor-footer">
                <span class="editor-info">${this.t('editor.footer_fullscreen', 'Lines: ${lines.length} | Ctrl+S to save | Escape to exit fullscreen', lines.length)}</span>
            </div>
        `;

        document.body.appendChild(overlay);

        // Focus the fullscreen textarea with a small delay to ensure DOM is ready
        setTimeout(() => {
            const fullscreenTextarea = document.getElementById('fullscreen-editor-textarea');
            const lineNumbers = document.getElementById('fullscreen-line-numbers');
            
            if (fullscreenTextarea && lineNumbers) {
                // Initialize line numbers
                this.updateFullscreenLineNumbers(fullscreenTextarea, lineNumbers);
                
                fullscreenTextarea.focus();
                
                // Add keyboard shortcuts for fullscreen editor
                const handleKeydown = (e) => {
                    if (e.ctrlKey && e.key === 's') {
                        e.preventDefault();
                        this.saveFullscreenEditorContent(filePath, index);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.exitEditorFullscreen(filePath, index);
                    }
                };

                fullscreenTextarea.addEventListener('keydown', handleKeydown);
                overlay.addEventListener('keydown', handleKeydown);

                // Update line count and line numbers on input
                fullscreenTextarea.addEventListener('input', () => {
                    const currentLines = fullscreenTextarea.value.split('\n');
                    const footerInfo = overlay.querySelector('.editor-info');
                    if (footerInfo) {
                        footerInfo.textContent = this.t('editor.footer_fullscreen', 'Lines: ${currentLines.length} | Ctrl+S to save | Escape to exit fullscreen', currentLines.length);
                    }
                    this.updateFullscreenLineNumbers(fullscreenTextarea, lineNumbers);
                });

                // Sync scrolling between textarea and line numbers
                fullscreenTextarea.addEventListener('scroll', () => {
                    lineNumbers.scrollTop = fullscreenTextarea.scrollTop;
                });

                // Handle window resize to maintain proper layout
                const resizeObserver = new ResizeObserver(() => {
                    this.updateFullscreenLineNumbers(fullscreenTextarea, lineNumbers);
                });
                resizeObserver.observe(fullscreenTextarea);
                
                // Store the observer for cleanup
                overlay.resizeObserver = resizeObserver;
            }
        }, 50);

        this.showStatus('Entered fullscreen editing mode', 'info');
    }

    // Save content from fullscreen editor
    async saveFullscreenEditorContent(filePath, index) {
        const fullscreenTextarea = document.getElementById('fullscreen-editor-textarea');
        if (!fullscreenTextarea) {
            this.showStatus('Fullscreen editor not found', 'error');
            return;
        }

        const content = fullscreenTextarea.value.split('\n');
        
        this.showStatus(`Saving ${filePath}...`, 'info');
        
        try {
            await gAItAPI.saveFileContent(filePath, content);
            this.showStatus(`File ${filePath} saved successfully`, 'success');
            
            // Update the inline editor with the saved content
            const inlineTextarea = document.getElementById(`editor-textarea-${index}`);
            if (inlineTextarea) {
                inlineTextarea.value = fullscreenTextarea.value;
            }
            
            // Refresh the entire uncommitted changes to ensure git status is updated
            await this.refreshUncommittedChanges();
            
        } catch (error) {
            console.error('Failed to save file:', error);
            this.showStatus(`Failed to save file: ${error.message}`, 'error');
        }
    }

    // Exit fullscreen editor mode
    exitEditorFullscreen(filePath, index) {
        const overlay = document.getElementById('editor-fullscreen-overlay');
        if (!overlay) {
            return;
        }

        // Clean up resize observer
        if (overlay.resizeObserver) {
            overlay.resizeObserver.disconnect();
        }

        // Get content from fullscreen editor
        const fullscreenTextarea = document.getElementById('fullscreen-editor-textarea');
        const inlineTextarea = document.getElementById(`editor-textarea-${index}`);
        
        // Sync content back to inline editor
        if (fullscreenTextarea && inlineTextarea) {
            inlineTextarea.value = fullscreenTextarea.value;
            
            // Update line count in inline editor
            const lines = inlineTextarea.value.split('\n');
            const inlineFooter = document.querySelector(`#uncommitted-file-${index} .editor-info`);
            if (inlineFooter) {
                inlineFooter.textContent = this.t('editor.footer_inline', 'Lines: ${lines.length} | Use Ctrl+S to save | Ctrl+F11 for fullscreen', lines.length);
            }
        }

        // Remove overlay
        overlay.remove();
        
        // Focus back to inline editor
        if (inlineTextarea) {
            inlineTextarea.focus();
        }

        this.showStatus('Exited fullscreen editing mode', 'info');
    }

    // Update line numbers for fullscreen editor
    updateFullscreenLineNumbers(textarea, lineNumbersElement) {
        const lines = textarea.value.split('\n');
        const lineCount = lines.length;
        
        // Calculate the width needed for line numbers (minimum 3 digits)
        const maxDigits = Math.max(3, lineCount.toString().length);
        
        // Generate line numbers with proper padding
        let lineNumbersHtml = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersHtml += i.toString().padStart(maxDigits, ' ') + '\n';
        }
        
        lineNumbersElement.textContent = lineNumbersHtml;
        
        // Adjust width based on content
        const charWidth = 8.4; // Approximate character width in pixels for monospace font
        const newWidth = Math.max(60, (maxDigits * charWidth) + 32); // 32px for padding
        lineNumbersElement.style.minWidth = newWidth + 'px';
        
        // Sync scroll position
        lineNumbersElement.scrollTop = textarea.scrollTop;
    }

    // Show Git Operations Menu
    showGitOperationsMenu(category) {
        // Close any existing menus first
        this.closeAllMenus();
        
        const menu = document.createElement('div');
        menu.className = 'action-menu git-operations-menu';
        
        let menuContent = '';
        
        switch (category) {
            case 'branch':
                menuContent = `
                    <div class="action-menu-content">
                        <div class="action-menu-header">
                            <h4>🌿 ${this.t('git.branch_operations')}</h4>
                            <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                        </div>
                        <div class="action-menu-body">
                            <button class="action-btn primary" onclick="gAItUI.showCreateBranchDialog(); gAItUI.closeAllMenus();">
                                ➕ ${this.t('git.create_new_branch')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showBranchListDialog(); gAItUI.closeAllMenus();">
                                📋 ${this.t('git.manage_branches')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showRebaseBranchDialog(); gAItUI.closeAllMenus();">
                                🔗 ${this.t('git.rebase_current_branch')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showResetBranchDialog(); gAItUI.closeAllMenus();">
                                ↩️ ${this.t('git.reset_current_branch')}
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'remote':
                menuContent = `
                    <div class="action-menu-content">
                        <div class="action-menu-header">
                            <h4>🌐 ${this.t('git.remote_operations')}</h4>
                            <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                        </div>
                        <div class="action-menu-body">
                            <button class="action-btn primary" onclick="gAItUI.performQuickOperation('fetch'); gAItUI.closeAllMenus();">
                                📥 ${this.t('git.fetch_all_remotes')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showPullDialog(); gAItUI.closeAllMenus();">
                                ⬇️ ${this.t('git.pull_from_remote')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showPushDialog(); gAItUI.closeAllMenus();">
                                ⬆️ ${this.t('git.push_to_remote')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showRemoteManagementDialog(); gAItUI.closeAllMenus();">
                                🔧 ${this.t('git.manage_remotes')}
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'stash':
                menuContent = `
                    <div class="action-menu-content">
                        <div class="action-menu-header">
                            <h4>📦 ${this.t('git.stash_operations')}</h4>
                            <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                        </div>
                        <div class="action-menu-body">
                            <button class="action-btn primary" onclick="gAItUI.showCreateStashDialog(); gAItUI.closeAllMenus();">
                                💾 ${this.t('git.create_stash')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showStashListDialog(); gAItUI.closeAllMenus();">
                                📋 ${this.t('git.manage_stashes')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showCreateBranchFromStashDialog(); gAItUI.closeAllMenus();">
                                🌿 ${this.t('git.create_branch_from_stash')}
                            </button>
                        </div>
                    </div>
                `;
                break;
                
            case 'tag':
                menuContent = `
                    <div class="action-menu-content">
                        <div class="action-menu-header">
                            <h4>🏷️ ${this.t('git.tag_operations')}</h4>
                            <button class="action-menu-close" onclick="gAItUI.closeAllMenus()">✕</button>
                        </div>
                        <div class="action-menu-body">
                            <button class="action-btn primary" onclick="gAItUI.showCreateTagDialog(); gAItUI.closeAllMenus();">
                                ➕ ${this.t('git.create_tag')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.showTagListDialog(); gAItUI.closeAllMenus();">
                                📋 ${this.t('git.manage_tags')}
                            </button>
                            <button class="action-btn secondary" onclick="gAItUI.performQuickOperation('pushTags'); gAItUI.closeAllMenus();">
                                ⬆️ ${this.t('git.push_all_tags')}
                            </button>
                        </div>
                    </div>
                `;
                break;
        }
        
        menu.innerHTML = menuContent;
        document.body.appendChild(menu);
        
        // Position menu below the toolbar button with proper calculations
        this.positionMenu(menu, category);
        
        // Add click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
        }, 100);
    }

    // Position menu properly
    positionMenu(menu, category) {
        // Find the clicked button using onclick attribute
        const toolbarBtns = document.querySelectorAll('.toolbar-btn');
        let targetBtn = null;
        
        toolbarBtns.forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes(`showGitOperationsMenu('${category}')`)) {
                targetBtn = btn;
            }
        });
        
        if (!targetBtn) {
            // Fallback: position menu in center of screen
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const menuRect = menu.getBoundingClientRect();
            
            menu.style.position = 'fixed';
            menu.style.top = `${(viewportHeight - menuRect.height) / 2}px`;
            menu.style.left = `${(viewportWidth - menuRect.width) / 2}px`;
            menu.style.zIndex = '1001';
            return;
        }
        
        const rect = targetBtn.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate horizontal position
        let left = rect.left;
        if (left + menuRect.width > viewportWidth - 20) {
            left = viewportWidth - menuRect.width - 20;
        }
        if (left < 20) {
            left = 20;
        }
        
        // Calculate vertical position
        let top = rect.bottom + 8;
        if (top + menuRect.height > viewportHeight - 20) {
            top = rect.top - menuRect.height - 8;
        }
        
        menu.style.position = 'fixed';
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
        menu.style.zIndex = '1001';
    }

    // Close all menus
    closeAllMenus() {
        document.querySelectorAll('.action-menu').forEach(menu => {
            menu.remove();
        });
    }

    // Handle click outside to close menus
    handleClickOutside(event) {
        if (!event.target.closest('.action-menu') && !event.target.closest('.toolbar-btn')) {
            this.closeAllMenus();
        }
    }

    // Perform Quick Operations
    async performQuickOperation(operation) {
        try {
            switch (operation) {
                case 'fetch':
                    this.showStatus('Fetching from all remotes...', 'info');
                    await gAItAPI.fetch('', true); // Fetch all with prune
                    this.showStatus('Successfully fetched from all remotes', 'success');
                    await this.loadData();
                    break;
                    
                case 'pull':
                    this.showStatus('Pulling current branch...', 'info');
                    await gAItAPI.pullFromRemote('', ''); // Pull current branch from default remote
                    this.showStatus('Successfully pulled current branch', 'success');
                    await this.loadData();
                    break;
                    
                case 'push':
                    this.showStatus('Pushing current branch...', 'info');
                    await gAItAPI.pushToRemote('', '', false); // Push current branch to default remote
                    this.showStatus('Successfully pushed current branch', 'success');
                    break;
                    
                case 'pushTags':
                    this.showStatus('Pushing all tags...', 'info');
                    // Implementation would need a pushAllTags API method
                    this.showStatus('All tags pushed successfully', 'success');
                    break;
            }
        } catch (error) {
            console.error(`Quick operation ${operation} failed:`, error);
            this.showStatus(`${operation} failed: ${error.message}`, 'error');
        }
    }

    // Dialog Functions
    showRenameBranchDialog(currentName) {
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const newName = prompt(this.t('dialog.rename_branch', currentName), currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            this.performBranchAction('rename', currentName, newName.trim());
        }
    }

    showResetBranchDialog(branchName) {
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const commitHash = prompt(this.t('dialog.reset_branch', branchName));
        if (commitHash && commitHash.trim()) {
            const resetType = confirm(this.t('dialog.reset_type_choice')) 
                ? 'mixed' 
                : this.showResetTypeDialog();
            
            this.performBranchAction('reset', branchName, commitHash.trim());
        }
    }

    showResetTypeDialog() {
        const choice = prompt(this.t('dialog.reset_type_detailed'), '2');
        
        switch (choice) {
            case '1': return 'soft';
            case '3': return 'hard';
            default: return 'mixed';
        }
    }

    showRebaseBranchDialog(currentBranch) {
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const targetBranch = prompt(this.t('dialog.rebase_onto', currentBranch || 'current branch'));
        if (targetBranch && targetBranch.trim()) {
            const interactive = confirm(this.t('dialog.rebase_interactive'));
            this.performRebaseOperation(targetBranch.trim(), interactive);
        }
    }

    async performRebaseOperation(targetBranch, interactive) {
        try {
            this.showStatus(`Rebasing onto ${targetBranch}${interactive ? ' (interactive)' : ''}...`, 'info');
            await gAItAPI.rebaseBranch(targetBranch, interactive);
            this.showStatus(`Successfully rebased onto ${targetBranch}`, 'success');
            await this.loadData();
        } catch (error) {
            console.error('Rebase failed:', error);
            this.showStatus(`Rebase failed: ${error.message}`, 'error');
        }
    }

    showCreateStashDialog() {
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const message = prompt(this.t('dialog.create_stash'));
        if (message !== null) {
            const includeUntracked = confirm(this.t('dialog.stash_include_untracked'));
            this.performCreateStash(message.trim(), includeUntracked);
        }
    }

    async performCreateStash(message, includeUntracked) {
        try {
            this.showStatus('Creating stash...', 'info');
            await gAItAPI.createStash(message, includeUntracked);
            this.showStatus('Stash created successfully', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Create stash failed:', error);
            this.showStatus(`Create stash failed: ${error.message}`, 'error');
        }
    }

    showCreateTagDialog() {
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const tagName = prompt(this.t('dialog.create_tag'));
        if (tagName && tagName.trim()) {
            const annotated = confirm(this.t('dialog.tag_annotated'));
            let message = '';
            if (annotated) {
                message = prompt(this.t('dialog.tag_message')) || '';
            }
            this.performCreateTag(tagName.trim(), '', message, annotated);
        }
    }

    async performCreateTag(tagName, commitHash, message, annotated) {
        try {
            this.showStatus(`Creating ${annotated ? 'annotated ' : ''}tag ${tagName}...`, 'info');
            await gAItAPI.createTag(tagName, commitHash, message, annotated);
            this.showStatus(`Tag ${tagName} created successfully`, 'success');
            await this.loadData();
        } catch (error) {
            console.error('Create tag failed:', error);
            this.showStatus(`Create tag failed: ${error.message}`, 'error');
        }
    }

    showPullDialog() {
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const remotes = this.currentData.remotes || [];
        if (remotes.length === 0) {
            this.showStatus('No remotes configured', 'error');
            return;
        }

        const remoteName = remotes.length === 1 ? remotes[0].name : 
            prompt(this.t('dialog.pull_remote', remotes.map(r => r.name).join(', '))) || '';
        
        const branchName = prompt(this.t('dialog.pull_branch')) || '';
        
        this.performPullOperation(remoteName, branchName);
    }

    async performPullOperation(remote, branch) {
        try {
            this.showStatus(`Pulling ${branch || 'current branch'} from ${remote || 'default remote'}...`, 'info');
            await gAItAPI.pullFromRemote(remote, branch);
            this.showStatus('Pull completed successfully', 'success');
            await this.loadData();
        } catch (error) {
            console.error('Pull failed:', error);
            this.showStatus(`Pull failed: ${error.message}`, 'error');
        }
    }

    showPushDialog() {
        const existingMenu = document.querySelector('.action-menu');
        if (existingMenu) existingMenu.remove();

        const remotes = this.currentData.remotes || [];
        if (remotes.length === 0) {
            this.showStatus('No remotes configured', 'error');
            return;
        }

        const remoteName = remotes.length === 1 ? remotes[0].name : 
            prompt(this.t('dialog.push_remote', remotes.map(r => r.name).join(', '))) || '';
        
        const branchName = prompt(this.t('dialog.push_branch')) || '';
        const force = confirm(this.t('dialog.push_force'));
        
        this.performPushOperation(remoteName, branchName, force);
    }

    async performPushOperation(remote, branch, force) {
        try {
            this.showStatus(`${force ? 'Force p' : 'P'}ushing ${branch || 'current branch'} to ${remote || 'default remote'}...`, 'info');
            await gAItAPI.pushToRemote(remote, branch, force);
            this.showStatus('Push completed successfully', 'success');
        } catch (error) {
            console.error('Push failed:', error);
            this.showStatus(`Push failed: ${error.message}`, 'error');
        }
    }

    // Placeholder methods for advanced dialogs
    showBranchListDialog() {
        this.showStatus(this.t('advanced.coming_soon', 'Advanced branch management coming soon...'), 'info');
    }

    showStashListDialog() {
        this.showStatus(this.t('advanced.stash_management', 'Advanced stash management coming soon...'), 'info');
    }

    showTagListDialog() {
        this.showStatus(this.t('advanced.tag_management', 'Advanced tag management coming soon...'), 'info');
    }

    showRemoteManagementDialog() {
        this.showStatus(this.t('advanced.remote_management', 'Advanced remote management coming soon...'), 'info');
    }

    showCreateBranchFromStashDialog() {
        this.showStatus(this.t('advanced.branch_from_stash', 'Create branch from stash coming soon...'), 'info');
    }

    // Commit-level operations
    async performCommitAction(action, commitHash) {
        try {
            switch (action) {
                case 'cherry-pick':
                    if (confirm(this.t('dialog.cherry_pick', commitHash.substring(0, 7)))) {
                        this.showStatus(`Cherry-picking commit ${commitHash.substring(0, 7)}...`, 'info');
                        await gAItAPI.cherryPickCommit(commitHash);
                        this.showStatus('Commit cherry-picked successfully', 'success');
                        await this.loadData();
                    }
                    break;

                case 'revert':
                    const noCommit = confirm(this.t('dialog.revert_commit', commitHash.substring(0, 7)));
                    this.showStatus(`Reverting commit ${commitHash.substring(0, 7)}...`, 'info');
                    await gAItAPI.revertCommit(commitHash, !noCommit);
                    this.showStatus(`Commit ${noCommit ? 'reverted' : 'revert staged'}`, 'success');
                    await this.loadData();
                    break;

                case 'reset':
                    const resetType = this.showResetTypeDialog();
                    if (confirm(this.t('dialog.reset_to_commit', commitHash.substring(0, 7), resetType.toUpperCase()))) {
                        this.showStatus(`Resetting to commit ${commitHash.substring(0, 7)} (${resetType})...`, 'info');
                        await gAItAPI.resetBranch(commitHash, resetType);
                        this.showStatus(`Branch reset to ${commitHash.substring(0, 7)}`, 'success');
                        await this.loadData();
                    }
                    break;

                case 'create-tag':
                    const tagName = prompt(this.t('dialog.create_tag_at_commit', commitHash.substring(0, 7)));
                    if (tagName && tagName.trim()) {
                        const annotated = confirm(this.t('dialog.tag_annotated'));
                        let message = '';
                        if (annotated) {
                            message = prompt(this.t('dialog.tag_message')) || '';
                        }
                        await this.performCreateTag(tagName.trim(), commitHash, message, annotated);
                    }
                    break;

                case 'create-branch':
                    const branchName = prompt(this.t('dialog.create_branch_from_commit', commitHash.substring(0, 7)));
                    if (branchName && branchName.trim()) {
                        this.showStatus(`Creating branch ${branchName} from commit ${commitHash.substring(0, 7)}...`, 'info');
                        await gAItAPI.createBranch(branchName.trim(), commitHash);
                        this.showStatus(`Branch ${branchName} created from commit ${commitHash.substring(0, 7)}`, 'success');
                        await this.loadData();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Commit action ${action} failed:`, error);
            this.showStatus(`${action} failed: ${error.message}`, 'error');
        }
    }

    // Refresh the entire uncommitted changes list
    async refreshUncommittedChanges() {
        try {
            this.showStatus('Refreshing uncommitted changes...', 'info');
            
            // Store the currently expanded files for uncommitted changes
            const expandedUncommittedFiles = Array.from(this.expandedFiles).filter(key => 
                key.startsWith('uncommitted-')
            );
            
            // Get fresh uncommitted changes data
            const uncommittedChanges = await gAItAPI.getUncommittedChanges();
            this.currentData.uncommittedChanges = uncommittedChanges || [];
            
            // If we're currently viewing uncommitted changes, re-render them
            if (this.selectedCommit === 'uncommitted') {
                this.renderUncommittedChangesAsCommit();
                
                // Restore expanded state after a short delay to ensure DOM is ready
                setTimeout(() => {
                    expandedUncommittedFiles.forEach(fileKey => {
                        const filePath = fileKey.substring('uncommitted-'.length);
                        
                        // Find the file element by matching the file path
                        const fileElements = document.querySelectorAll('.file-item.tree-file[id^="uncommitted-file-"]');
                        fileElements.forEach((fileElement, index) => {
                            const dataPath = fileElement.getAttribute('data-path');
                            
                            if (dataPath === filePath) {
                                // Re-expand this file and load its diff
                                this.expandedFiles.add(fileKey);
                                fileElement.classList.add('expanded');
                                
                                // Rotate the expand icon
                                const expandIcon = fileElement.querySelector('.file-expand-icon');
                                if (expandIcon) {
                                    expandIcon.style.transform = 'rotate(90deg)';
                                }
                                
                                // Show the diff content
                                const fileDiff = fileElement.querySelector('.file-diff');
                                if (fileDiff) {
                                    fileDiff.style.display = '';
                                }
                                
                                // Load the diff content
                                const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
                                if (diffContent) {
                                    this.loadUncommittedFileDiff(filePath, index);
                                }
                            }
                        });
                    });
                }, 200);
            }
            
            // Update the commits list to reflect the new change count
            const uncommittedItem = document.querySelector('[data-hash="uncommitted"]');
            if (uncommittedItem) {
                const changeCount = uncommittedChanges.length;
                const messageElement = uncommittedItem.querySelector('.commit-message');
                if (messageElement) {
                    messageElement.textContent = `Uncommitted Changes (${changeCount})`;
                }
                
                // Hide the uncommitted changes item if there are no changes
                if (changeCount === 0) {
                    uncommittedItem.style.display = 'none';
                } else {
                    uncommittedItem.style.display = '';
                }
            }
            
            this.showStatus('Uncommitted changes refreshed', 'success');
        } catch (error) {
            console.error('Failed to refresh uncommitted changes:', error);
            this.showStatus(this.t('refresh.failed_refresh', 'Failed to refresh uncommitted changes'), 'error');
        }
    }

    // Helper function to load diff for an uncommitted file
    async loadUncommittedFileDiff(filePath, index) {
        const diffContent = document.getElementById(`uncommitted-diff-content-${index}`);
        if (!diffContent) return;
        
        try {
            diffContent.innerHTML = `<div class="loading">${this.t('file.loading_diff', 'Loading diff...')}</div>`;
            const diff = await gAItAPI.getFileDiff('uncommitted', filePath);
            this.renderUncommittedFileDiff(diff, filePath, index);
        } catch (error) {
            console.error('Failed to load diff:', error);
            diffContent.innerHTML = `<div class="error">Failed to load diff: ${error.message}</div>`;
        }
    }

    // Staging and commit functions
    async stageFile(filePath) {
        try {
            this.showStatus(`${this.t('status.staging_file', 'Staging')} ${filePath}...`, 'info');
            await gAItAPI.stageFile(filePath);
            this.showStatus(`${filePath} ${this.t('status.file_staged', 'staged')}`, 'success');
            await this.refreshUncommittedChanges();
        } catch (error) {
            console.error('Failed to stage file:', error);
            this.showStatus(`${this.t('status.failed_stage_file', 'Failed to stage file')}: ${error.message}`, 'error');
        }
    }

    async unstageFile(filePath) {
        try {
            this.showStatus(`${this.t('status.unstaging_file', 'Unstaging')} ${filePath}...`, 'info');
            await gAItAPI.unstageFile(filePath);
            this.showStatus(`${filePath} ${this.t('status.file_unstaged', 'unstaged')}`, 'success');
            await this.refreshUncommittedChanges();
        } catch (error) {
            console.error('Failed to unstage file:', error);
            this.showStatus(`${this.t('status.failed_unstage_file', 'Failed to unstage file')}: ${error.message}`, 'error');
        }
    }

    async discardFileChanges(filePath) {
        try {
            const confirmDiscard = await showWarningDialog({
                title: this.t('dialog.discard_changes_title'),
                message: this.t('dialog.discard_file_changes', filePath),
                details: this.t('dialog.discard_changes_warning'),
                confirmText: this.t('actions.discard'),
                cancelText: this.t('actions.cancel')
            });
            
            if (confirmDiscard) {
                this.showStatus(`Discarding changes to ${filePath}...`, 'info');
                await gAItAPI.discardFileChanges(filePath);
                this.showStatus(`Changes to ${filePath} discarded`, 'success');
                await this.refreshUncommittedChanges();
            }
        } catch (error) {
            if (error.message && !error.message.includes('cancelled')) {
                console.error('Failed to discard file changes:', error);
                this.showStatus(`Failed to discard changes: ${error.message}`, 'error');
            }
        }
    }

    async stageAllChanges() {
        const changes = this.currentData.uncommittedChanges || [];
        const unstagedChanges = changes.filter(change => 
            change.status && (change.status.startsWith('unstaged-') || change.status === 'untracked')
        );
        
        if (unstagedChanges.length === 0) {
            this.showStatus(this.t('status.no_unstaged_changes', 'No unstaged changes to stage'), 'info');
            return;
        }

        try {
            this.showStatus(`${this.t('status.staging_files', 'Staging files...')} (${unstagedChanges.length})`, 'info');
            
            // Stage files sequentially to avoid git conflicts
            for (const change of unstagedChanges) {
                try {
                    await gAItAPI.stageFile(change.path);
                } catch (error) {
                    console.error(`Failed to stage file ${change.path}:`, error);
                    this.showStatus(`${this.t('status.failed_stage_file', 'Failed to stage file')} ${change.path}: ${error.message}`, 'error');
                    return; // Stop on first error
                }
            }
            
            this.showStatus(`${unstagedChanges.length} ${this.t('status.staged_files', 'files staged')}`, 'success');
            await this.refreshUncommittedChanges();
        } catch (error) {
            console.error('Failed to stage all changes:', error);
            this.showStatus(`${this.t('status.failed_stage_file', 'Failed to stage file')}: ${error.message}`, 'error');
        }
    }

    async unstageAllChanges() {
        const changes = this.currentData.uncommittedChanges || [];
        const stagedChanges = changes.filter(change => 
            change.status && change.status.startsWith('staged-')
        );
        
        if (stagedChanges.length === 0) {
            this.showStatus(this.t('status.no_staged_changes', 'No staged changes to unstage'), 'info');
            return;
        }

        try {
            this.showStatus(`${this.t('status.unstaging_files', 'Unstaging files...')} (${stagedChanges.length})`, 'info');
            
            // Unstage files sequentially to avoid git conflicts
            for (const change of stagedChanges) {
                try {
                    await gAItAPI.unstageFile(change.path);
                } catch (error) {
                    console.error(`Failed to unstage file ${change.path}:`, error);
                    this.showStatus(`${this.t('status.failed_unstage_file', 'Failed to unstage file')} ${change.path}: ${error.message}`, 'error');
                    return; // Stop on first error
                }
            }
            
            this.showStatus(`${stagedChanges.length} ${this.t('status.unstaged_files', 'files unstaged')}`, 'success');
            await this.refreshUncommittedChanges();
        } catch (error) {
            console.error('Failed to unstage all changes:', error);
            this.showStatus(`${this.t('status.failed_unstage_file', 'Failed to unstage file')}: ${error.message}`, 'error');
        }
    }

    async showCommitDialog() {
        try {
            const result = await showCommitDialog({
                title: this.t('dialog.commit_title'),
                message: '',
                amend: false,
                signoff: false
            });
            
            if (result && result.message) {
                this.createCommit(result.message, {
                    amend: result.amend,
                    signoff: result.signoff
                });
            }
        } catch (error) {
            // User cancelled
        }
    }

    async createCommit(message, options = {}) {
        try {
            this.showStatus('Creating commit...', 'info');
            const result = await gAItAPI.createCommit(message, options);
            this.showStatus('Commit created successfully', 'success');
            
            // Refresh the entire data to show the new commit
            await this.loadData();
            
            // Automatically select the newly created commit
            if (result && result.commitHash) {
                setTimeout(() => {
                    this.selectCommit(result.commitHash);
                }, 300); // Give time for the DOM to update
            }
        } catch (error) {
            console.error('Failed to create commit:', error);
            this.showStatus(`Failed to create commit: ${error.message}`, 'error');
        }
    }
}

// Repository Management UI Module
class RepositoryManager {
    constructor() {
        this.repositories = [];
        this.currentRepository = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.loadRepositories();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for repository switch events
        document.addEventListener('repositoryChanged', (event) => {
            this.onRepositoryChanged(event.detail);
        });
    }

    async loadRepositories() {
        try {
            this.repositories = await gAItAPI.getRepositories();
            this.renderRepositoryList();
        } catch (error) {
            console.error('Failed to load repositories:', error);
            this.showStatus('Failed to load repositories: ' + error.message, 'error');
        }
    }

    renderRepositoryList() {
        const container = document.getElementById('repositoryList');
        if (!container) return;

        if (this.repositories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📁</div>
                    <div class="empty-message">No repositories found</div>
                    <div class="empty-actions">
                        <button class="btn btn-primary" onclick="repoManager.showAddRepositoryDialog()">
                            Add Repository
                        </button>
                        <button class="btn btn-secondary" onclick="repoManager.showCloneRepositoryDialog()">
                            Clone Repository
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const html = `
            <div class="repository-header">
                <h3>Repos (${this.repositories.length})</h3>
                <div class="repository-actions">
                    <button class="btn btn-sm btn-primary" onclick="repoManager.showAddRepositoryDialog()" title="Add Local Repository">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="repoManager.showCloneRepositoryDialog()" title="Clone Repository">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="repoManager.discoverRepositories()" title="Discover Repositories">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="repoManager.clearRepository()" title="Clear Repository Selection">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="repoManager.refreshRepositories()" title="Refresh">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="repository-list">
                ${this.repositories.map(repo => this.renderRepositoryItem(repo)).join('')}
            </div>
        `;

        container.innerHTML = html;
    }

    renderRepositoryItem(repo) {
        const isActive = this.currentRepository && this.currentRepository.path === repo.path;
        const repoName = repo.name || repo.path.split('/').pop();
        
        return `
            <div class="repository-item ${isActive ? 'active' : ''}" data-path="${repo.path}">
                <div class="repository-info" onclick="repoManager.switchRepository('${repo.path}')">
                    <div class="repository-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    </div>
                    <div class="repository-details">
                        <div class="repository-name">${this.escapeHtml(repoName)}</div>
                        <div class="repository-path">${this.escapeHtml(repo.path)}</div>
                    </div>
                </div>
                <div class="repository-actions">
                    <button class="btn btn-xs btn-danger" onclick="repoManager.removeRepository('${repo.path}')" title="Remove">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    async switchRepository(path) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showStatus('Switching repository...', 'info');
            
            await gAItAPI.switchRepository(path);
            
            // Update current repository
            this.currentRepository = this.repositories.find(repo => repo.path === path);
            
            // Update repository name immediately in the sidebar
            const repoNameElement = document.querySelector('.repo-name');
            if (repoNameElement && this.currentRepository) {
                repoNameElement.textContent = this.currentRepository.name || this.currentRepository.path.split('/').pop();
            }
            
            // Trigger repository changed event
            document.dispatchEvent(new CustomEvent('repositoryChanged', {
                detail: { repository: this.currentRepository }
            }));
            
            // Refresh the UI
            this.renderRepositoryList();
            
            // Reload main data
            if (window.gAItUI) {
                window.gAItUI.loadData();
            }
            
            this.showStatus(`Switched to repository: ${this.currentRepository.name}`, 'success');
            
        } catch (error) {
            console.error('Failed to switch repository:', error);
            this.showStatus('Failed to switch repository: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    showAddRepositoryDialog() {
        const path = prompt('Enter the path to the local Git repository:');
        if (path && path.trim()) {
            this.addRepository(path.trim());
        }
    }

    async addRepository(path) {
        try {
            this.showStatus('Adding repository...', 'info');
            await gAItAPI.addRepository(path);
            await this.loadRepositories();
            this.showStatus('Repository added successfully', 'success');
        } catch (error) {
            console.error('Failed to add repository:', error);
            this.showStatus('Failed to add repository: ' + error.message, 'error');
        }
    }

    showCloneRepositoryDialog() {
        const url = prompt('Enter the Git repository URL to clone:');
        if (url && url.trim()) {
            const name = prompt('Enter repository name (optional):', '');
            this.cloneRepository(url.trim(), name ? name.trim() : '');
        }
    }

    async cloneRepository(url, name = '') {
        try {
            this.showStatus('Cloning repository...', 'info');
            await gAItAPI.cloneRepository(url, name);
            await this.loadRepositories();
            this.showStatus('Repository cloned successfully', 'success');
        } catch (error) {
            console.error('Failed to clone repository:', error);
            this.showStatus('Failed to clone repository: ' + error.message, 'error');
        }
    }

    async removeRepository(path) {
        const repoName = this.repositories.find(repo => repo.path === path)?.name || path;
        
        if (!confirm(`Are you sure you want to remove "${repoName}" from the managed repositories?\n\nNote: This will only remove it from GAIT's management - the actual repository files will not be deleted.`)) {
            return;
        }

        try {
            this.showStatus('Removing repository...', 'info');
            await gAItAPI.removeRepository(path);
            await this.loadRepositories();
            
            // If we removed the current repository, clear or switch to another one
            if (this.currentRepository && this.currentRepository.path === path) {
                if (this.repositories.length > 0) {
                    await this.switchRepository(this.repositories[0].path);
                } else {
                    // No repositories left, clear the current selection
                    await this.clearRepository();
                }
            }
            
            this.showStatus('Repository removed successfully', 'success');
        } catch (error) {
            console.error('Failed to remove repository:', error);
            this.showStatus('Failed to remove repository: ' + error.message, 'error');
        }
    }

    async clearRepository() {
        try {
            this.showStatus('Clearing repository selection...', 'info');
            await gAItAPI.clearRepository();
            
            // Update current repository
            this.currentRepository = null;
            
            // Update repository name in the sidebar
            const repoNameElement = document.querySelector('.repo-name');
            if (repoNameElement) {
                repoNameElement.textContent = 'No Repository Selected';
            }
            
            // Trigger repository changed event
            document.dispatchEvent(new CustomEvent('repositoryChanged', {
                detail: { repository: null }
            }));
            
            // Refresh the UI
            this.renderRepositoryList();
            
            // Clear main data
            if (window.gAItUI) {
                window.gAItUI.currentData = { commits: [], branches: [], tags: [], stashes: [], remotes: [] };
                window.gAItUI.renderCommits([], true);
                window.gAItUI.renderBranches([]);
                window.gAItUI.renderTags([]);
                window.gAItUI.renderStashes([]);
                window.gAItUI.renderRemotes([]);
            }
            
            this.showStatus('Repository selection cleared', 'success');
        } catch (error) {
            console.error('Failed to clear repository:', error);
            this.showStatus('Failed to clear repository: ' + error.message, 'error');
        }
    }

    async discoverRepositories() {
        try {
            this.showStatus('Discovering repositories...', 'info');
            const discovered = await gAItAPI.discoverRepositories();
            
            if (discovered && discovered.length > 0) {
                await this.addMultipleRepositories(discovered);
                this.showStatus(`Discovered and added ${discovered.length} repositories`, 'success');
            } else {
                this.showStatus('No new repositories discovered', 'info');
            }
        } catch (error) {
            console.error('Failed to discover repositories:', error);
            this.showStatus('Failed to discover repositories: ' + error.message, 'error');
        }
    }

    async refreshRepositories() {
        await this.loadRepositories();
    }

    onRepositoryChanged(detail) {
        // Handle repository change events
        if (detail && detail.repository) {
            this.currentRepository = detail.repository;
            
            // Update UI to reflect the new repository
            this.renderRepositoryList();
            
            // Update the repository name in the sidebar
            const repoNameElement = document.querySelector('.repo-name');
            if (repoNameElement) {
                repoNameElement.textContent = detail.repository.name || detail.repository.path.split('/').pop();
            }
        }
    }

    showStatus(message, type = 'info') {
        // Use the main UI's status system if available
        if (window.gAItUI && typeof window.gAItUI.showStatus === 'function') {
            window.gAItUI.showStatus(message, type);
            return;
        }
        
        // Fallback status display
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Try to find a status element
        const statusElement = document.getElementById('status') || document.querySelector('.status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
            
            // Auto-hide after 3 seconds for success/info messages
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    statusElement.textContent = '';
                    statusElement.className = 'status';
                }, 3000);
            }
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showRepositoryDetails(path) {
        const repo = this.repositories.find(r => r.path === path);
        if (repo) {
            alert(`Repository: ${repo.name || 'Unnamed'}\nPath: ${repo.path}\nBranches: ${repo.branches || 'Unknown'}\nRemotes: ${repo.remotes || 'Unknown'}`);
        }
    }

    async addMultipleRepositories(paths) {
        const results = [];
        
        for (const path of paths) {
            try {
                await gAItAPI.addRepository(path);
                results.push({ path, success: true });
            } catch (error) {
                console.error(`Failed to add repository ${path}:`, error);
                results.push({ path, success: false, error: error.message });
            }
        }
        
        // Reload the repository list
        await this.loadRepositories();
        
        // Show summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        if (failed === 0) {
            this.showStatus(`Successfully added ${successful} repositories`, 'success');
        } else {
            this.showStatus(`Added ${successful} repositories, ${failed} failed`, 'warning');
        }
        
        return results;
    }

    exportRepositoryConfig() {
        const config = {
            repositories: this.repositories,
            currentRepository: this.currentRepository,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gait-repositories.json';
        a.click();
        
        URL.revokeObjectURL(url);
        this.showStatus('Repository configuration exported', 'success');
    }

    async importRepositoryConfig(file) {
        try {
            const text = await file.text();
            const config = JSON.parse(text);
            
            if (config.repositories && Array.isArray(config.repositories)) {
                const paths = config.repositories.map(repo => repo.path);
                await this.addMultipleRepositories(paths);
                this.showStatus('Repository configuration imported', 'success');
            } else {
                throw new Error('Invalid configuration file format');
            }
        } catch (error) {
            console.error('Failed to import repository configuration:', error);
            this.showStatus('Failed to import configuration: ' + error.message, 'error');
        }
    }
}

window.gAItUI = new GaitUI();
window.repoManager = new RepositoryManager();
