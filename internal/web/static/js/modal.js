/**
 * Custom Modal System
 * Provides beautiful, dark-themed modals for various interactions
 */

class ModalSystem {
    constructor() {
        this.overlay = document.getElementById('modalOverlay');
        this.container = document.getElementById('modalContainer');
        this.title = document.getElementById('modalTitle');
        this.body = document.getElementById('modalBody');
        this.footer = document.getElementById('modalFooter');
        this.cancelBtn = document.getElementById('modalCancel');
        this.confirmBtn = document.getElementById('modalConfirm');
        
        this.currentModal = null;
        this.currentResolve = null;
        this.currentReject = null;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Close modal on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close(false);
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close(false);
            }
        });
        
        // Handle enter key for single-input modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isOpen() && e.target.matches('input, textarea')) {
                if (e.ctrlKey || e.metaKey) {
                    this.confirm();
                }
            }
        });
    }
    
    isOpen() {
        return this.overlay.classList.contains('show');
    }
    
    show() {
        this.overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus the first input element
        setTimeout(() => {
            const firstInput = this.body.querySelector('input, textarea, button');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
    
    hide() {
        this.overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    close(result = false) {
        this.hide();
        if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
            this.currentReject = null;
        }
        this.currentModal = null;
    }
    
    confirm() {
        if (this.currentModal === 'commit') {
            this.handleCommitConfirm();
        } else if (this.currentModal === 'input') {
            this.handleInputConfirm();
        } else {
            this.close(true);
        }
    }
    
    // Commit Dialog
    showCommitDialog(options = {}) {
        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
            this.currentModal = 'commit';
            
            this.title.textContent = options.title || 'Create Commit';
            
            // Load commit dialog template
            const template = document.getElementById('commitDialogTemplate');
            const content = template.content.cloneNode(true);
            
            this.body.innerHTML = '';
            this.body.appendChild(content);
            
            // Setup form elements
            const messageTextarea = document.getElementById('commitMessage');
            const charCounter = this.body.querySelector('.char-counter');
            const amendCheckbox = document.getElementById('amendCommit');
            const signoffCheckbox = document.getElementById('signoffCommit');
            
            // Set initial values
            if (options.message) {
                messageTextarea.value = options.message;
            }
            if (options.amend) {
                amendCheckbox.checked = true;
            }
            if (options.signoff) {
                signoffCheckbox.checked = true;
            }
            
            // Character counter
            const updateCharCounter = () => {
                const length = messageTextarea.value.length;
                const max = 500;
                charCounter.textContent = `${length} / ${max}`;
                
                charCounter.classList.remove('warning', 'error');
                if (length > max * 0.8) {
                    charCounter.classList.add('warning');
                }
                if (length > max) {
                    charCounter.classList.add('error');
                }
                
                this.confirmBtn.disabled = length === 0 || length > max;
            };
            
            messageTextarea.addEventListener('input', updateCharCounter);
            updateCharCounter();
            
            // Auto-resize textarea
            const autoResize = () => {
                messageTextarea.style.height = 'auto';
                messageTextarea.style.height = messageTextarea.scrollHeight + 'px';
            };
            
            messageTextarea.addEventListener('input', autoResize);
            autoResize();
            
            // Setup buttons
            this.confirmBtn.textContent = 'Create Commit';
            this.confirmBtn.onclick = () => this.handleCommitConfirm();
            
            this.show();
            messageTextarea.focus();
        });
    }
    
    handleCommitConfirm() {
        const messageTextarea = document.getElementById('commitMessage');
        const amendCheckbox = document.getElementById('amendCommit');
        const signoffCheckbox = document.getElementById('signoffCommit');
        
        const message = messageTextarea.value.trim();
        if (!message) {
            this.showFieldError(messageTextarea, 'This field is required');
            return;
        }
        
        if (message.length > 500) {
            this.showFieldError(messageTextarea, 'Text is too long');
            return;
        }
        
        const result = {
            message: message,
            amend: amendCheckbox.checked,
            signoff: signoffCheckbox.checked
        };
        
        this.close(result);
    }
    
    // Input Dialog
    showInputDialog(options = {}) {
        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
            this.currentModal = 'input';
            
            this.title.textContent = options.title || 'Input Required';
            
            // Load input dialog template
            const template = document.getElementById('inputDialogTemplate');
            const content = template.content.cloneNode(true);
            
            this.body.innerHTML = '';
            this.body.appendChild(content);
            
            // Setup form elements
            const input = document.getElementById('dialogInput');
            const label = document.getElementById('inputLabel');
            const helpDiv = document.getElementById('inputHelp');
            const tipSpan = document.getElementById('inputTip');
            
            label.textContent = options.label || 'Input';
            input.placeholder = options.placeholder || '';
            input.value = options.value || '';
            
            if (options.tip) {
                tipSpan.textContent = options.tip;
                helpDiv.style.display = 'block';
            }
            
            // Validation
            const validate = () => {
                const value = input.value.trim();
                let isValid = true;
                
                if (options.required && !value) {
                    isValid = false;
                }
                
                if (options.pattern && value && !options.pattern.test(value)) {
                    isValid = false;
                }
                
                this.confirmBtn.disabled = !isValid;
                return isValid;
            };
            
            input.addEventListener('input', validate);
            validate();
            
            // Setup buttons
            this.confirmBtn.textContent = options.confirmText || 'OK';
            this.confirmBtn.onclick = () => this.handleInputConfirm();
            
            this.show();
            input.focus();
            input.select();
        });
    }
    
    handleInputConfirm() {
        const input = document.getElementById('dialogInput');
        const value = input.value.trim();
        
        this.close(value);
    }
    
    // Confirmation Dialog
    showConfirmDialog(options = {}) {
        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
            this.currentModal = 'confirm';
            
            this.title.textContent = options.title || 'Confirm Action';
            
            // Load confirmation dialog template
            const template = document.getElementById('confirmDialogTemplate');
            const content = template.content.cloneNode(true);
            
            this.body.innerHTML = '';
            this.body.appendChild(content);
            
            // Setup content
            const messageEl = document.getElementById('confirmMessage');
            const detailsEl = document.getElementById('confirmDetails');
            
            messageEl.textContent = options.message || 'Are you sure?';
            
            if (options.details) {
                detailsEl.textContent = options.details;
                detailsEl.style.display = 'block';
            }
            
            // Setup buttons
            this.confirmBtn.textContent = options.confirmText || 'Confirm';
            this.cancelBtn.textContent = options.cancelText || 'Cancel';
            this.confirmBtn.onclick = () => this.close(true);
            
            this.show();
            this.confirmBtn.focus();
        });
    }
    
    // Warning Dialog
    showWarningDialog(options = {}) {
        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
            this.currentModal = 'warning';
            
            this.title.textContent = options.title || 'Warning';
            
            // Load warning dialog template
            const template = document.getElementById('warningDialogTemplate');
            const content = template.content.cloneNode(true);
            
            this.body.innerHTML = '';
            this.body.appendChild(content);
            
            // Setup content
            const messageEl = document.getElementById('warningMessage');
            const detailsEl = document.getElementById('warningDetails');
            
            messageEl.textContent = options.message || 'Warning!';
            
            if (options.details) {
                detailsEl.textContent = options.details;
                detailsEl.style.display = 'block';
            }
            
            // Setup buttons
            this.confirmBtn.textContent = options.confirmText || 'Continue';
            this.cancelBtn.textContent = options.cancelText || 'Cancel';
            this.confirmBtn.onclick = () => this.close(true);
            
            this.show();
            this.cancelBtn.focus(); // Focus cancel for safety
        });
    }
    
    // Utility Methods
    showFieldError(field, message) {
        field.classList.add('error');
        
        // Remove existing error
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
        
        // Remove error on next input
        const removeError = () => {
            field.classList.remove('error');
            errorDiv.remove();
            field.removeEventListener('input', removeError);
        };
        field.addEventListener('input', removeError);
        
        field.focus();
    }
    
    showLoading(message = 'Loading...') {
        this.body.innerHTML = `<div class="modal-loading">${message}</div>`;
    }
}

// Global modal instance
window.modalSystem = new ModalSystem();

// Global helper functions
window.closeModal = () => {
    window.modalSystem.close(false);
};

// Enhanced prompt replacement
window.showCommitDialog = (options) => {
    return window.modalSystem.showCommitDialog(options);
};

window.showInputDialog = (options) => {
    return window.modalSystem.showInputDialog(options);
};

window.showConfirmDialog = (options) => {
    return window.modalSystem.showConfirmDialog(options);
};

window.showWarningDialog = (options) => {
    return window.modalSystem.showWarningDialog(options);
};

// Backward compatibility
window.customPrompt = (message, defaultValue = '') => {
    return window.modalSystem.showInputDialog({
        title: 'Input Required',
        message: message,
        value: defaultValue
    });
};

window.customConfirm = (message, details = null) => {
    return window.modalSystem.showConfirmDialog({
        message: message,
        details: details
    });
}; 