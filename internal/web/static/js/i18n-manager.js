/**
 * Modern Internationalization (i18n) JavaScript Module
 * Handles client-side language switching with category-based translation files
 */

class ModernI18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.categories = [
            'dashboard', 'navigation', 'stats', 'actions', 'git', 
            'commit', 'file', 'status', 'notifications', 'semantic',
            'graph', 'timeline', 'insights', 'chart', 'error', 
            'branch', 'sidebar', 'loading', 'analysis', 'advanced',
            'editor', 'refresh', 'language', 'lang'
        ];
        this.init();
    }

    async init() {
        // Load current language from server
        try {
            const response = await fetch('/api/language');
            const data = await response.json();
            this.currentLanguage = data.current;
            // console.log('Current language:', this.currentLanguage);
        } catch (error) {
            console.error('Failed to load current language:', error);
            // Fall back to browser language or default
            this.currentLanguage = this.detectBrowserLanguage();
        }
        
        // Load translations
        await this.loadTranslations();
    }

    // Detect browser language
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('zh')) {
            return 'zh';
        }
        return 'en'; // Default to English
    }

    // Load all translation categories
    async loadTranslations() {
        this.translations[this.currentLanguage] = {};
        
        // Load all categories in parallel
        const loadPromises = this.categories.map(category => 
            this.loadCategoryTranslations(this.currentLanguage, category)
        );
        
        try {
            await Promise.all(loadPromises);
            console.log('Loaded translations for language:', this.currentLanguage);
        } catch (error) {
            console.error('Failed to load some translation categories:', error);
            // Fall back to hardcoded translations
            this.loadFallbackTranslations();
        }
    }

    // Load translations for a specific category
    async loadCategoryTranslations(language, category) {
        try {
            const response = await fetch('/api/i18n/' + language + '/' + category);
            if (!response.ok) {
                throw new Error('Failed to fetch ' + category + ' translations');
            }
            
            const categoryTranslations = await response.json();
            
            // Add category prefix to keys
            for (const key in categoryTranslations) {
                if (categoryTranslations.hasOwnProperty(key)) {
                    const fullKey = category + '.' + key;
                    this.translations[language][fullKey] = categoryTranslations[key];
                }
            }
        } catch (error) {
            console.warn('Failed to load ' + category + ' translations for ' + language + ':', error);
        }
    }

    // Load fallback translations (from the original i18n.js structure)
    loadFallbackTranslations() {
        // English fallback translations
        this.translations.en = {
            // Dashboard
            'dashboard.title': 'ADES Dashboard',
            'dashboard.repository_stats': 'Repository Statistics',
            'dashboard.commit_activity': 'Commit Activity',
            
            // Navigation
            'navigation.dashboard': 'ADES Dashboard',
            'navigation.git_view': 'Git View',
            'navigation.search': 'Search',
            
            // Stats
            'stats.total_commits': 'Total Commits',
            'stats.active_developers': 'Active Developers',
            'stats.code_quality_score': 'Code Quality Score',
            
            // Actions
            'actions.analyze_repository': 'Analyze Repository',
            'actions.export_insights': 'Export Insights',
            'actions.refresh': 'Refresh',
            
            // Status
            'status.loading': 'Loading...',
            'status.ready': 'Ready',
            'status.error': 'Error',
            
            // Notifications
            'notifications.language_changed': 'Language changed successfully'
        };

        // Chinese fallback translations
        this.translations.zh = {
            // Dashboard
            'dashboard.title': 'ADES 仪表板',
            'dashboard.repository_stats': '仓库统计',
            'dashboard.commit_activity': '提交动态',
            
            // Navigation
            'navigation.dashboard': 'ADES 仪表板',
            'navigation.git_view': 'Git 视图',
            'navigation.search': '搜索',
            
            // Stats
            'stats.total_commits': '总提交数',
            'stats.active_developers': '活跃开发者',
            'stats.code_quality_score': '代码质量评分',
            
            // Actions
            'actions.analyze_repository': '分析仓库',
            'actions.export_insights': '导出洞察',
            'actions.refresh': '刷新',
            
            // Status
            'status.loading': '加载中...',
            'status.ready': '就绪',
            'status.error': '错误',
            
            // Notifications
            'notifications.language_changed': '语言切换成功'
        };
    }

    // Translate a key
    t(key) {
        const translations = this.translations[this.currentLanguage];
        if (translations && translations[key]) {
            return translations[key];
        }
        
        // Fallback to English
        if (this.currentLanguage !== 'en' && this.translations.en && this.translations.en[key]) {
            return this.translations.en[key];
        }
        
        // Return key if no translation found (for debugging)
        console.warn('Translation not found for key: ' + key);
        return key;
    }

    // Switch language
    async switchLanguage(language) {
        if (language === this.currentLanguage) {
            return;
        }

        try {
            // Notify server about language change
            const response = await fetch('/api/language/switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ language: language })
            });

            if (!response.ok) {
                throw new Error('Failed to switch language');
            }

            const data = await response.json();
            this.currentLanguage = data.language;
            
            // Load translations for the new language
            if (!this.translations[this.currentLanguage]) {
                await this.loadTranslations();
            }
            
            // Update dynamic content
            this.updateDynamicContent();
            
            // Show notification
            this.showNotification(data.message || this.t('notifications.language_changed'), 'success');
            
            // Reload page to apply server-side translations
            setTimeout(function() {
                window.location.reload();
            }, 500);
            
        } catch (error) {
            console.error('Language switch failed:', error);
            this.showNotification('Language switch failed', 'error');
        }
    }

    // Update dynamic content with new translations
    updateDynamicContent() {
        var self = this;
        
        // Update elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(function(element) {
            const key = element.getAttribute('data-i18n');
            const translation = self.t(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
                element.value = translation;
            } else if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update chart loading messages
        document.querySelectorAll('.chart-loading span').forEach(function(span) {
            const text = span.textContent;
            if (text.includes('Loading commit trends') || text.includes('加载提交趋势')) {
                span.textContent = self.t('status.loading_commits');
            } else if (text.includes('Analyzing languages') || text.includes('分析语言')) {
                span.textContent = self.t('status.analyzing');
            }
        });
    }

    // Show notification
    showNotification(message, type) {
        type = type || 'info';
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification notification-' + type + ' show';
        notification.textContent = message;
        
        var bgColor = '#2196F3';
        if (type === 'success') bgColor = '#4CAF50';
        if (type === 'error') bgColor = '#f44336';
        
        notification.style.cssText = 
            'position: fixed;' +
            'top: 20px;' +
            'right: 20px;' +
            'background: ' + bgColor + ';' +
            'color: white;' +
            'padding: 12px 24px;' +
            'border-radius: 4px;' +
            'z-index: 10000;' +
            'transform: translateX(100%);' +
            'transition: transform 0.3s ease;' +
            'box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(function() {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(function() {
            notification.style.transform = 'translateX(100%)';
            setTimeout(function() {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Get available languages
    getAvailableLanguages() {
        return ['en', 'zh'];
    }

    // Reload translations (useful for development)
    async reloadTranslations() {
        await this.loadTranslations();
        this.updateDynamicContent();
    }
}

// Global instance
var modernI18nManager = new ModernI18nManager();

// Global functions for templates (backward compatibility)
function switchLanguage(language) {
    modernI18nManager.switchLanguage(language);
}

function t(key) {
    return modernI18nManager.t(key);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModernI18nManager: ModernI18nManager, modernI18nManager: modernI18nManager, switchLanguage: switchLanguage, t: t };
}

// Make available globally
window.i18nManager = modernI18nManager;
window.switchLanguage = switchLanguage;
window.t = t; 