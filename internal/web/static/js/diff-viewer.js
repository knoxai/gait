// Diff viewer module for handling diff display functionality
class GaitDiffViewer {
    constructor() {
        this.fullscreenDiffData = null;
        this.fullscreenCurrentView = 'split';
        this.wrapEnabled = true;
    }

    // Render file diff
    renderFileDiff(diff, filePath, index) {
        const diffContent = document.getElementById(`diff-content-${index}`);
        this.renderSplitDiff(diff, diffContent);
    }

    // Switch between split and unified diff views
    switchDiffView(index, viewType) {
        const buttons = document.querySelectorAll(`#file-${index} .diff-view-btn`);
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = Array.from(buttons).find(btn => btn.textContent.toLowerCase() === viewType);
        if (activeBtn) activeBtn.classList.add('active');
        
        const diffContent = document.getElementById(`diff-content-${index}`);
        const currentDiff = diffContent.querySelector('.diff-split-view, .diff-unified-view');
        
        if (currentDiff && currentDiff.diffData) {
            if (viewType === 'split') {
                this.renderSplitDiff(currentDiff.diffData, diffContent);
            } else {
                this.renderUnifiedDiff(currentDiff.diffData, diffContent);
            }
        }
    }

    // Render split diff view
    renderSplitDiff(diff, container) {
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
        container.querySelector('.diff-split-view').diffData = diff;
        
        // Apply current wrap setting
        this.applyWrapSetting(container, true);
    }

    // Render unified diff view
    renderUnifiedDiff(diff, container) {
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
        container.querySelector('.diff-unified-view').diffData = diff;
        
        // Apply current wrap setting
        this.applyWrapSetting(container, true);
    }

    // Fullscreen diff functionality
    openFullscreenDiff(hash, filePath, index) {
        const diffContent = document.getElementById(`diff-content-${index}`);
        const currentDiff = diffContent.querySelector('.diff-split-view, .diff-unified-view');
        
        if (currentDiff && currentDiff.diffData) {
            this.fullscreenDiffData = currentDiff.diffData;
            const overlay = document.getElementById('fullscreenOverlay');
            const title = document.getElementById('fullscreenTitle');
            
            title.textContent = `${filePath} - ${hash.substring(0, 7)}`;
            overlay.classList.add('active');
            
            // Render the diff in fullscreen
            this.renderFullscreenDiff(this.fullscreenDiffData, this.fullscreenCurrentView);
            
            // Focus for keyboard events
            overlay.focus();
        }
    }

    closeFullscreenDiff() {
        const overlay = document.getElementById('fullscreenOverlay');
        overlay.classList.remove('active');
        this.fullscreenDiffData = null;
    }

    switchFullscreenDiffView(viewType) {
        this.fullscreenCurrentView = viewType;
        
        // Update button states
        document.getElementById('fullscreenSplitBtn').classList.toggle('active', viewType === 'split');
        document.getElementById('fullscreenUnifiedBtn').classList.toggle('active', viewType === 'unified');
        
        if (this.fullscreenDiffData) {
            this.renderFullscreenDiff(this.fullscreenDiffData, viewType);
        }
    }

    renderFullscreenDiff(diff, viewType) {
        const container = document.getElementById('fullscreenDiffContent');
        
        if (viewType === 'split') {
            this.renderSplitDiff(diff, container);
        } else {
            this.renderUnifiedDiff(diff, container);
        }
        
        // Add fullscreen class for styling
        const diffView = container.querySelector('.diff-split-view, .diff-unified-view');
        if (diffView) {
            diffView.classList.add('fullscreen-diff-content');
        }
        
        // Apply current wrap setting
        this.applyWrapSetting(container, this.wrapEnabled);
    }

    // Toggle wrap functionality
    toggleWrap(index) {
        const wrapBtn = document.getElementById(`wrap-btn-${index}`);
        const diffContent = document.getElementById(`diff-content-${index}`);
        const isWrapped = wrapBtn.classList.contains('active');
        
        if (isWrapped) {
            wrapBtn.classList.remove('active');
            wrapBtn.textContent = 'No Wrap';
            this.applyWrapSetting(diffContent, false);
        } else {
            wrapBtn.classList.add('active');
            wrapBtn.textContent = 'Wrap';
            this.applyWrapSetting(diffContent, true);
        }
    }

    toggleFullscreenWrap() {
        const wrapBtn = document.getElementById('fullscreenWrapBtn');
        const diffContent = document.getElementById('fullscreenDiffContent');
        const isWrapped = wrapBtn.classList.contains('active');
        
        this.wrapEnabled = !isWrapped;
        
        if (this.wrapEnabled) {
            wrapBtn.classList.add('active');
            wrapBtn.textContent = 'Wrap';
            this.applyWrapSetting(diffContent, true);
        } else {
            wrapBtn.classList.remove('active');
            wrapBtn.textContent = 'No Wrap';
            this.applyWrapSetting(diffContent, false);
        }
    }

    applyWrapSetting(container, wrap) {
        const diffLines = container.querySelectorAll('.diff-line-content');
        diffLines.forEach(line => {
            if (wrap) {
                line.classList.remove('no-wrap');
            } else {
                line.classList.add('no-wrap');
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global diff viewer instance
window.gAItDiffViewer = new GaitDiffViewer(); 