/**
 * Clipboard utilities for copying Git-related data
 */

class ClipboardManager {
    constructor() {
        this.fallbackTextArea = null;
    }

    async copyToClipboard(text, type = 'text') {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                this.showSuccessMessage(`${type} copied to clipboard`);
                return true;
            } else {
                return this.fallbackCopyToClipboard(text, type);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showErrorMessage(`Failed to copy ${type}`);
            return false;
        }
    }

    fallbackCopyToClipboard(text, type) {
        try {
            if (!this.fallbackTextArea) {
                this.fallbackTextArea = document.createElement('textarea');
                this.fallbackTextArea.style.position = 'fixed';
                this.fallbackTextArea.style.left = '-999999px';
                this.fallbackTextArea.style.top = '-999999px';
                document.body.appendChild(this.fallbackTextArea);
            }

            this.fallbackTextArea.value = text;
            this.fallbackTextArea.focus();
            this.fallbackTextArea.select();

            const successful = document.execCommand('copy');
            if (successful) {
                this.showSuccessMessage(`${type} copied to clipboard`);
                return true;
            } else {
                this.showErrorMessage(`Failed to copy ${type}`);
                return false;
            }
        } catch (error) {
            console.error('Fallback copy failed:', error);
            this.showErrorMessage(`Failed to copy ${type}`);
            return false;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.textContent = message;
        
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word',
            backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'
        });

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    async copyCommitHash(hash, useShort = false) {
        const hashToCopy = useShort ? hash.substring(0, 7) : hash;
        const type = useShort ? 'Short commit hash' : 'Commit hash';
        return await this.copyToClipboard(hashToCopy, type);
    }

    async copyBranchName(branchName) {
        return await this.copyToClipboard(branchName, 'Branch name');
    }

    async copyTagName(tagName) {
        return await this.copyToClipboard(tagName, 'Tag name');
    }

    async copyStashName(stashName) {
        return await this.copyToClipboard(stashName, 'Stash name');
    }
}

// Create global instance
window.clipboardManager = new ClipboardManager();
