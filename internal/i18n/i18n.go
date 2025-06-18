package i18n

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
)

// Locale represents a language locale
type Locale string

const (
	English Locale = "en"
	Chinese Locale = "zh"
)

// I18n manages internationalization
type I18n struct {
	currentLocale Locale
	translations  map[Locale]map[string]string
	loader        *TranslationLoader
	mutex         sync.RWMutex
}

// Global i18n instance
var instance *I18n
var once sync.Once

// GetInstance returns the singleton i18n instance
func GetInstance() *I18n {
	once.Do(func() {
		// Get the path to translations directory
		translationsPath := getTranslationsPath()
		
		instance = &I18n{
			currentLocale: English,
			translations:  make(map[Locale]map[string]string),
			loader:        NewTranslationLoader(translationsPath),
		}
		instance.loadTranslations()
	})
	return instance
}

// getTranslationsPath returns the path to the translations directory
func getTranslationsPath() string {
	// Try to find the translations directory relative to the current working directory
	wd, err := os.Getwd()
	if err != nil {
		return "internal/i18n/translations"
	}
	
	// Check common paths
	paths := []string{
		filepath.Join(wd, "internal/i18n/translations"),
		filepath.Join(wd, "../i18n/translations"),
		filepath.Join(wd, "../../internal/i18n/translations"),
		"internal/i18n/translations",
	}
	
	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	
	// Default fallback
	return "internal/i18n/translations"
}

// SetLocale changes the current locale
func (i *I18n) SetLocale(locale Locale) {
	i.mutex.Lock()
	defer i.mutex.Unlock()
	i.currentLocale = locale
}

// GetLocale returns the current locale
func (i *I18n) GetLocale() Locale {
	i.mutex.RLock()
	defer i.mutex.RUnlock()
	return i.currentLocale
}

// T translates a key to the current locale
func (i *I18n) T(key string) string {
	i.mutex.RLock()
	defer i.mutex.RUnlock()
	
	if translations, ok := i.translations[i.currentLocale]; ok {
		if translation, exists := translations[key]; exists {
			return translation
		}
	}
	
	// Fallback to English if translation not found
	if i.currentLocale != English {
		if translations, ok := i.translations[English]; ok {
			if translation, exists := translations[key]; exists {
				return translation
			}
		}
	}
	
	// Return the key itself if no translation found
	return key
}

// Tf translates a key with formatting
func (i *I18n) Tf(key string, args ...interface{}) string {
	translation := i.T(key)
	return fmt.Sprintf(translation, args...)
}

// loadTranslations loads all translation files
func (i *I18n) loadTranslations() {
	// Try to load from separate files first
	if err := i.loader.LoadTranslations(); err == nil {
		// Successfully loaded from files
		i.translations = i.loader.GetAllTranslations()
		return
	}
	
	// Fallback to hardcoded translations if files are not available
	i.loadFallbackTranslations()
}

// loadFallbackTranslations loads hardcoded translations as fallback
func (i *I18n) loadFallbackTranslations() {
	// Load English translations
	i.translations[English] = map[string]string{
		// Header and Navigation
		"app.title":                "GAIT - Git AI Tool",
		"navigation.dashboard":     "ADES Dashboard",
		"navigation.git_view":      "Git View",
		"navigation.search":        "Search",
		"navigation.refresh":       "Refresh",
		"navigation.toggle_sidebar": "Toggle Sidebar",
		
		// Dashboard
		"dashboard.title":                "ADES Dashboard",
		"dashboard.repository_stats":     "Repository Statistics",
		"dashboard.commit_activity":      "Commit Activity",
		"dashboard.language_distribution": "Language Distribution",
		"dashboard.developer_contributions": "Developer Contributions",
		"dashboard.semantic_trends":      "Semantic Trends",
		"dashboard.knowledge_graph":      "Knowledge Graph",
		"dashboard.development_timeline": "Development Timeline",
		"dashboard.ai_insights":          "AI Insights",
		"dashboard.quick_actions":        "Quick Actions",
		"dashboard.real_time":            "Live",
		"dashboard.offline":              "Offline",
		
		// Statistics
		"stats.total_commits":      "Total Commits",
		"stats.active_developers":  "Active Developers", 
		"stats.code_quality_score": "Code Quality Score",
		"stats.technical_debt":     "Technical Debt",
		"stats.commits_per_day":    "Commits per Day",
		"stats.current_period":     "Current Period",
		
		// Actions
		"actions.analyze_repository":    "Analyze Repository",
		"actions.export_insights":       "Export Insights",
		"actions.view_patterns":         "View Patterns",
		"actions.export_knowledge_graph": "Export Knowledge Graph",
		"actions.view_details":          "View Details",
		"actions.refresh":               "Refresh",
		"actions.zoom_in":               "Zoom In",
		"actions.zoom_out":              "Zoom Out",
		"actions.reset_view":            "Reset View",
		
		// Git Operations
		"git.branch":     "Branch",
		"git.remote":     "Remote", 
		"git.stash":      "Stash",
		"git.tag":        "Tag",
		"git.fetch":      "Fetch",
		"git.pull":       "Pull",
		"git.push":       "Push",
		"git.branches":   "Branches",
		"git.tags":       "Tags",
		"git.stashes":    "Stashes",
		"git.remotes":    "Remotes",
		"git.operations":              "Operations",
		"git.branch_operations":       "Branch Operations",
		"git.remote_operations":       "Remote Operations",
		"git.stash_operations":        "Stash Operations",
		"git.tag_operations":          "Tag Operations",
		"git.create_new_branch":       "Create New Branch",
		"git.manage_branches":         "Manage Branches",
		"git.rebase_current_branch":   "Rebase Current Branch",
		"git.reset_current_branch":    "Reset Current Branch",
		"git.fetch_all_remotes":       "Fetch All Remotes",
		"git.pull_from_remote":        "Pull from Remote",
		"git.push_to_remote":          "Push to Remote",
		"git.manage_remotes":          "Manage Remotes",
		"git.create_stash":            "Create Stash",
		"git.manage_stashes":          "Manage Stashes",
		"git.create_branch_from_stash": "Create Branch from Stash",
		"git.create_tag":              "Create Tag",
		"git.manage_tags":             "Manage Tags",
		"git.push_all_tags":           "Push All Tags",
		
		// Commit Details
		"commit.details":        "Commit Details",
		"commit.select_message": "Select a commit to view details",
		"commit.author":         "Author",
		"commit.date":           "Date",
		"commit.hash":           "Hash",
		"commit.message":        "Message",
		"commit.files_changed":  "Files Changed",
		"commit.file_changed":   "File Changed",
		"commit.changed_files":  "Changed Files",
		"commit.additions":      "additions",
		"commit.deletions":      "deletions",
		"commit.uncommitted":    "Uncommitted Changes",
		"commit.uncommitted_changes": "Uncommitted Changes",
		"commit.working_directory": "Working Directory",
		"commit.cherry_pick":     "Cherry Pick",
		"commit.cherry_pick_action": "Cherry-pick",
		"commit.revert":          "Revert",
		"commit.revert_action":   "Revert",
		"commit.view_diff":       "View Diff",
		"commit.copy_hash":       "Copy Hash",
		"commit.copy_hash_action": "Copy Hash",
		"commit.staged_changes":  "Staged Changes",
		"commit.stage_all":       "Stage All Changes",
		"commit.commit_staged":   "Commit Staged Changes",
		"commit.displaying":      "Displaying all uncommitted changes",
		"commit.parents":         "Parents",
		"commit.no_message":      "No message",
		"commit.unknown_author":  "Unknown",
		"commit.reset_to_here":   "Reset to Here",
		"commit.create_tag":      "Tag",
		"commit.create_branch":   "Branch",
		"commit.no_uncommitted":  "No Uncommitted Changes",
		"commit.working_clean":   "Working directory is clean",
		"commit.details_title":   "Commit Details",
		"commit.unstage_all":     "Unstage All Changes",
		"commit.discard_changes": "Discard Changes",
		"commit.show_diff":       "Show Diff",
		"commit.view_file":       "View File",
		"commit.edit_file":       "Edit File",
		"commit.blame":           "Blame",
		"commit.history":         "History",
		"commit.log":             "Log",
		"commit.graph":           "Graph",
		"commit.stats":           "Statistics",
		"commit.summary":         "Summary",
		"commit.full_diff":       "Full Diff",
		"commit.patch":           "Patch",
		"commit.raw":             "Raw",
		"commit.tree":            "Tree",
		"commit.blob":            "Blob",
		"commit.compare":         "Compare",
		"commit.bisect":          "Bisect",
		"commit.annotate":        "Annotate",
		"commit.describe":        "Describe",
		"commit.show":            "Show",
		"commit.format":          "Format",
		"commit.pretty":          "Pretty",
		"commit.oneline":         "One Line",
		"commit.short":           "Short",
		"commit.medium":          "Medium",
		"commit.full":            "Full",
		"commit.fuller":          "Fuller",
		"commit.email":           "Email",
		"commit.mbox":            "Mbox",
		"commit.since":           "Since",
		"commit.until":           "Until",
		"commit.before":          "Before",
		"commit.after":           "After",
		"commit.author_filter":   "Author Filter",
		"commit.grep":            "Grep",
		"commit.pickaxe":         "Pickaxe",
		"commit.follow":          "Follow",
		"commit.all":             "All",
		"commit.branches":        "Branches",
		"commit.tags":            "Tags",
		"commit.remotes":         "Remotes",
		"commit.first_parent":    "First Parent",
		"commit.merge_commits":   "Merge Commits",
		"commit.no_merges":       "No Merges",
		"commit.reverse":         "Reverse",
		"commit.topo_order":      "Topological Order",
		"commit.date_order":      "Date Order",
		"commit.author_date_order": "Author Date Order",
		
		// Timeline
		"timeline.no_data":          "No Timeline Data",
		"timeline.run_analysis":     "Run repository analysis to generate timeline",
		"timeline.unknown_event":    "Unknown Event",
		"timeline.no_description":   "No description available",
		"timeline.unknown_date":     "Unknown date",
		
		// Insights
		"insights.no_available":     "No Insights Available",
		"insights.run_analysis":     "Run repository analysis to generate insights",
		"insights.frequency":        "Frequency",
		"insights.reusability":      "Reusability",
		
		// Semantic Trends
		"semantic.features":       "Features",
		"semantic.fixes":          "Fixes", 
		"semantic.refactoring":    "Refactoring",
		"semantic.documentation":  "Documentation",
		"semantic.testing":        "Testing",
		"semantic.performance":    "Performance",
		
		// Knowledge Graph
		"graph.data_model":     "Data Model",
		"graph.api_layer":      "API Layer",
		"graph.database":       "Database",
		"graph.http_handlers":  "HTTP Handlers",
		
		// Status and Messages
		"status.ready":          "Ready",
		"status.loading":        "Loading...",
		"status.error":          "Error",
		"status.success":        "Success",
		"status.analyzing":      "Analyzing...",
		"status.loading_commits": "Loading commits...",
		"status.loading_more":   "Loading more commits...",
		"status.all_loaded":     "📜 All commits loaded",
		
		// File Operations
		"file.edit":        "Edit",
		"file.stage":       "Stage",
		"file.unstage":     "Unstage", 
		"file.discard":     "Discard",
		"file.fullscreen":  "Fullscreen",
		"file.split_view":  "Split",
		"file.unified_view": "Unified",
		"file.wrap":        "Wrap",
		"file.diff_viewer": "Diff Viewer",
		"file.close":       "Close (Esc)",
		
		// Language Switcher
		"language.switch":    "Language",
		"language.english":   "English",
		"language.chinese":   "中文",
		
		// Notifications
		"notifications.dashboard_refreshed":  "Dashboard refreshed",
		"notifications.analysis_started":     "Repository analysis started",
		"notifications.analysis_failed":      "Analysis failed",
		"notifications.export_success":       "Export completed successfully",
		"notifications.export_failed":        "Export failed",
		"notifications.language_changed":     "Language changed successfully",
		
		// Sidebar sections
		"sidebar.branches":    "Branches",
		"sidebar.tags":        "Tags", 
		"sidebar.stashes":     "Stashes",
		"sidebar.remotes":     "Remotes",
		"sidebar.no_tags":     "No tags found",
		"sidebar.no_stashes":  "No stashes found",
		"sidebar.no_remotes":  "No remotes found",
		
		// File status indicators
		"file.status.staged":     "staged",
		"file.status.unstaged":   "unstaged", 
		"file.status.untracked":  "untracked",
		
		// Status messages for staging operations
		"status.staging_file":           "Staging",
		"status.file_staged":            "staged",
		"status.unstaging_file":         "Unstaging",
		"status.file_unstaged":          "unstaged",
		"status.staging_files":          "Staging files...",
		"status.staged_files":           "files staged",
		"status.unstaging_files":        "Unstaging files...",
		"status.unstaged_files":         "files unstaged",
		"status.no_unstaged_changes":    "No unstaged changes to stage",
		"status.no_staged_changes":      "No staged changes to unstage",
		"status.failed_stage_file":      "Failed to stage file",
		"status.failed_unstage_file":    "Failed to unstage file",
		
		// Actions and buttons
		"actions.analyze_now":        "Analyze Now",
		"actions.view_trend":         "View Trend",
		"actions.stage_all_changes":  "Stage All Changes",
		"actions.commit_changes":     "Commit Changes",
		"actions.refresh_dashboard":  "Refresh Dashboard",
		
		// Chart and graph labels
		"chart.frequency":       "Frequency",
		"chart.reusability":     "Reusability",
		"chart.confidence":      "Confidence",
		"chart.trend":           "Trend",
		"chart.pattern":         "Pattern",
		
		// Analysis results
		"analysis.api_implementation":    "API Implementation",
		"analysis.database_migration":   "Database Migration", 
		"analysis.error_handling":       "Error Handling",
		"analysis.authentication_logic": "Authentication Logic",
		"analysis.authentication_system": "Authentication System",
		"analysis.api_handler_implementation": "API Handler Implementation",
		"analysis.added_new_rest_api": "Added new REST API endpoints for user management",
		"analysis.updated_database_schema": "Updated database schema for better performance",
		"analysis.implemented_jwt_auth": "Implemented JWT based authentication",
		
		// Loading and status messages
		"loading.analyzing_semantic": "Analyzing semantic patterns...",
		"loading.loading_diff":       "Loading diff...",
		"loading.chart_data":         "Loading chart data...",
		
		// Advanced features
		"advanced.coming_soon":       "Advanced management coming soon...",
		"advanced.stash_management":  "Advanced stash management coming soon...",
		"advanced.tag_management":    "Advanced tag management coming soon...",
		"advanced.remote_management": "Advanced remote management coming soon...",
		"advanced.branch_from_stash": "Create branch from stash coming soon...",
		
		// Additional UI elements
		"file.no_wrap":                 "No Wrap",
		"error.failed_load_commit":     "Failed to load commit details",
		"error.failed_fetch":           "Failed to fetch",
		"refresh.title":                "Refresh uncommitted changes",
		
		// Branch operations
		"branch.checkout":              "Checkout",
		"branch.merge_into_current":    "Merge into Current",
		"branch.rebase_current":        "Rebase Current onto This",
		"branch.rename":                "Rename Branch",
		"branch.delete":                "Delete Branch",
		"branch.create_new":            "Create New Branch",
		"branch.rename_current":        "Rename Current Branch",
		"branch.reset":                 "Reset Branch",
		"branch.rebase":                "Rebase Branch",
		"branch.exit_tag_checkout":     "Exit Tag Mode & Checkout",
	}
	
	// Load Chinese translations
	i.translations[Chinese] = map[string]string{
		// Header and Navigation
		"app.title":                "GAIT - Git AI 工具",
		"navigation.dashboard":     "ADES 仪表板",
		"navigation.git_view":      "Git 视图",
		"navigation.search":        "搜索",
		"navigation.refresh":       "刷新",
		"navigation.toggle_sidebar": "切换侧边栏",
		
		// Dashboard
		"dashboard.title":                "ADES 仪表板",
		"dashboard.repository_stats":     "仓库统计",
		"dashboard.commit_activity":      "提交动态",
		"dashboard.language_distribution": "语言分布",
		"dashboard.developer_contributions": "开发者贡献",
		"dashboard.semantic_trends":      "语义趋势",
		"dashboard.knowledge_graph":      "知识图谱",
		"dashboard.development_timeline": "开发时间轴",
		"dashboard.ai_insights":          "AI 洞察",
		"dashboard.quick_actions":        "快捷操作",
		"dashboard.real_time":            "实时",
		"dashboard.offline":              "离线",
		
		// Statistics
		"stats.total_commits":      "总提交数",
		"stats.active_developers":  "活跃开发者",
		"stats.code_quality_score": "代码质量评分",
		"stats.technical_debt":     "技术债务",
		"stats.commits_per_day":    "每日提交数",
		"stats.current_period":     "当前周期",
		
		// Actions
		"actions.analyze_repository":    "分析仓库",
		"actions.export_insights":       "导出洞察",
		"actions.view_patterns":         "查看模式",
		"actions.export_knowledge_graph": "导出知识图谱",
		"actions.view_details":          "查看详情",
		"actions.refresh":               "刷新",
		"actions.zoom_in":               "放大",
		"actions.zoom_out":              "缩小",
		"actions.reset_view":            "重置视图",
		
		// Git Operations
		"git.branch":     "分支",
		"git.remote":     "远程",
		"git.stash":      "暂存",
		"git.tag":        "标签",
		"git.fetch":      "提取",
		"git.pull":       "拉取",
		"git.push":       "推送",
		"git.branches":   "分支",
		"git.tags":       "标签",
		"git.stashes":    "暂存",
		"git.remotes":    "远程",
		"git.operations":              "操作",
		"git.branch_operations":       "分支操作",
		"git.remote_operations":       "远程操作",
		"git.stash_operations":        "暂存操作",
		"git.tag_operations":          "标签操作",
		"git.create_new_branch":       "创建新分支",
		"git.manage_branches":         "管理分支",
		"git.rebase_current_branch":   "变基当前分支",
		"git.reset_current_branch":    "重置当前分支",
		"git.fetch_all_remotes":       "提取所有远程",
		"git.pull_from_remote":        "从远程拉取",
		"git.push_to_remote":          "推送到远程",
		"git.manage_remotes":          "管理远程",
		"git.create_stash":            "创建暂存",
		"git.manage_stashes":          "管理暂存",
		"git.create_branch_from_stash": "从暂存创建分支",
		"git.create_tag":              "创建标签",
		"git.manage_tags":             "管理标签",
		"git.push_all_tags":           "推送所有标签",
		
		// Commit Details
		"commit.details":        "提交详情",
		"commit.select_message": "选择一个提交查看详情",
		"commit.author":         "作者",
		"commit.date":           "日期",
		"commit.hash":           "哈希",
		"commit.message":        "消息",
		"commit.files_changed":  "文件变更",
		"commit.file_changed":   "文件变更",
		"commit.changed_files":  "变更文件",
		"commit.additions":      "新增",
		"commit.deletions":      "删除",
		"commit.uncommitted":    "未提交变更",
		"commit.uncommitted_changes": "未提交变更",
		"commit.working_directory": "工作目录",
		"commit.cherry_pick":     "挑选提交",
		"commit.cherry_pick_action": "挑选提交",
		"commit.revert":          "撤销提交",
		"commit.revert_action":   "撤销提交",
		"commit.view_diff":       "查看差异",
		"commit.copy_hash":       "复制哈希",
		"commit.copy_hash_action": "复制哈希",
		"commit.staged_changes":  "暂存变更",
		"commit.stage_all":       "暂存所有变更",
		"commit.commit_staged":   "提交已暂存变更",
		"commit.displaying":      "显示所有未提交变更",
		"commit.parents":         "父提交",
		"commit.no_message":      "无消息",
		"commit.unknown_author":  "未知",
		"commit.reset_to_here":   "重置到此处",
		"commit.create_tag":      "标签",
		"commit.create_branch":   "分支",
		"commit.no_uncommitted":  "无未提交变更",
		"commit.working_clean":   "工作目录是干净的",
		"commit.details_title":   "提交详情",
		"commit.unstage_all":     "取消暂存所有变更",
		"commit.discard_changes": "丢弃变更",
		"commit.show_diff":       "显示差异",
		"commit.view_file":       "查看文件",
		"commit.edit_file":       "编辑文件",
		"commit.blame":           "责任追踪",
		"commit.history":         "历史记录",
		"commit.log":             "日志",
		"commit.graph":           "图表",
		"commit.stats":           "统计",
		"commit.summary":         "摘要",
		"commit.full_diff":       "完整差异",
		"commit.patch":           "补丁",
		"commit.raw":             "原始",
		"commit.tree":            "树",
		"commit.blob":            "数据对象",
		"commit.compare":         "比较",
		"commit.bisect":          "二分查找",
		"commit.annotate":        "注释",
		"commit.describe":        "描述",
		"commit.show":            "显示",
		"commit.format":          "格式",
		"commit.pretty":          "美化",
		"commit.oneline":         "单行",
		"commit.short":           "简短",
		"commit.medium":          "中等",
		"commit.full":            "完整",
		"commit.fuller":          "更完整",
		"commit.email":           "邮件",
		"commit.mbox":            "邮箱",
		"commit.since":           "自从",
		"commit.until":           "直到",
		"commit.before":          "之前",
		"commit.after":           "之后",
		"commit.author_filter":   "作者过滤",
		"commit.grep":            "搜索",
		"commit.pickaxe":         "选择",
		"commit.follow":          "跟踪",
		"commit.all":             "全部",
		"commit.branches":        "分支",
		"commit.tags":            "标签",
		"commit.remotes":         "远程",
		"commit.first_parent":    "第一父提交",
		"commit.merge_commits":   "合并提交",
		"commit.no_merges":       "无合并",
		"commit.reverse":         "反向",
		"commit.topo_order":      "拓扑顺序",
		"commit.date_order":      "日期顺序",
		"commit.author_date_order": "作者日期顺序",
		
		// Timeline
		"timeline.no_data":          "无时间线数据",
		"timeline.run_analysis":     "运行仓库分析以生成时间线",
		"timeline.unknown_event":    "未知事件",
		"timeline.no_description":   "无描述",
		"timeline.unknown_date":     "未知日期",
		
		// Insights
		"insights.no_available":     "无可用洞察",
		"insights.run_analysis":     "运行仓库分析以生成洞察",
		"insights.frequency":        "频率",
		"insights.reusability":      "可重用性",
		
		// Semantic Trends
		"semantic.features":       "功能",
		"semantic.fixes":          "修复",
		"semantic.refactoring":    "重构",
		"semantic.documentation":  "文档",
		"semantic.testing":        "测试",
		"semantic.performance":    "性能",
		
		// Knowledge Graph
		"graph.data_model":     "数据模型",
		"graph.api_layer":      "API 层",
		"graph.database":       "数据库",
		"graph.http_handlers":  "HTTP 处理器",
		
		// Status and Messages
		"status.ready":          "就绪",
		"status.loading":        "加载中...",
		"status.error":          "错误",
		"status.success":        "成功",
		"status.analyzing":      "分析中...",
		"status.loading_commits": "加载提交中...",
		"status.loading_more":   "加载更多提交...",
		"status.all_loaded":     "📜 所有提交已加载",
		
		// File Operations
		"file.edit":        "编辑",
		"file.stage":       "暂存",
		"file.unstage":     "取消暂存",
		"file.discard":     "丢弃",
		"file.fullscreen":  "全屏",
		"file.split_view":  "分页视图",
		"file.unified_view": "统一视图",
		"file.wrap":        "换行",
		"file.diff_viewer": "差异查看器",
		"file.close":       "关闭 (Esc)",
		
		// Language Switcher
		"language.switch":    "语言",
		"language.english":   "English",
		"language.chinese":   "中文",
		
		// Notifications
		"notifications.dashboard_refreshed":  "仪表板已刷新",
		"notifications.analysis_started":     "仓库分析已开始",
		"notifications.analysis_failed":      "分析失败",
		"notifications.export_success":       "导出成功完成",
		"notifications.export_failed":        "导出失败",
		"notifications.language_changed":     "语言切换成功",
		
		// Sidebar sections
		"sidebar.branches":    "分支",
		"sidebar.tags":        "标签", 
		"sidebar.stashes":     "暂存",
		"sidebar.remotes":     "远程",
		"sidebar.no_tags":     "未找到标签",
		"sidebar.no_stashes":  "未找到暂存",
		"sidebar.no_remotes":  "未找到远程",
		
		// File status indicators
		"file.status.staged":     "已暂存",
		"file.status.unstaged":   "未暂存", 
		"file.status.untracked":  "未跟踪",
		
		// Status messages for staging operations
		"status.staging_file":           "暂存中",
		"status.file_staged":            "已暂存",
		"status.unstaging_file":         "取消暂存中",
		"status.file_unstaged":          "已取消暂存",
		"status.staging_files":          "暂存文件中...",
		"status.staged_files":           "个文件已暂存",
		"status.unstaging_files":        "取消暂存文件中...",
		"status.unstaged_files":         "个文件已取消暂存",
		"status.no_unstaged_changes":    "没有未暂存的变更需要暂存",
		"status.no_staged_changes":      "没有已暂存的变更需要取消暂存",
		"status.failed_stage_file":      "暂存文件失败",
		"status.failed_unstage_file":    "取消暂存文件失败",
		
		// Actions and buttons
		"actions.analyze_now":        "立即分析",
		"actions.view_trend":         "查看趋势",
		"actions.stage_all_changes":  "暂存所有变更",
		"actions.commit_changes":     "提交变更",
		"actions.refresh_dashboard":  "刷新仪表板",
		
		// Chart and graph labels
		"chart.frequency":       "频率",
		"chart.reusability":     "可重用性",
		"chart.confidence":      "置信度",
		"chart.trend":           "趋势",
		"chart.pattern":         "模式",
		
		// Analysis results
		"analysis.api_implementation":    "API 实现",
		"analysis.database_migration":   "数据库迁移", 
		"analysis.error_handling":       "错误处理",
		"analysis.authentication_logic": "身份验证逻辑",
		"analysis.authentication_system": "身份验证系统",
		"analysis.api_handler_implementation": "API 处理器实现",
		"analysis.added_new_rest_api": "为用户管理添加了新的 REST API 端点",
		"analysis.updated_database_schema": "更新数据库架构以提高性能",
		"analysis.implemented_jwt_auth": "实现了基于 JWT 的身份验证",
		
		// Loading and status messages
		"loading.analyzing_semantic": "分析语义模式中...",
		"loading.loading_diff":       "加载差异中...",
		"loading.chart_data":         "加载图表数据中...",
		
		// Advanced features
		"advanced.coming_soon":       "高级管理功能即将推出...",
		"advanced.stash_management":  "高级暂存管理即将推出...",
		"advanced.tag_management":    "高级标签管理即将推出...",
		"advanced.remote_management": "高级远程管理即将推出...",
		"advanced.branch_from_stash": "从暂存创建分支即将推出...",
		
		// Additional UI elements
		"file.no_wrap":                 "不换行",
		"error.failed_load_commit":     "加载提交详情失败",
		"error.failed_fetch":           "获取失败",
		"refresh.title":                "刷新未提交变更",
		
		// Branch operations
		"branch.checkout":              "检出",
		"branch.merge_into_current":    "合并到当前分支",
		"branch.rebase_current":        "将当前分支变基到此",
		"branch.rename":                "重命名分支",
		"branch.delete":                "删除分支",
		"branch.create_new":            "创建新分支",
		"branch.rename_current":        "重命名当前分支",
		"branch.reset":                 "重置分支",
		"branch.rebase":                "变基分支",
		"branch.exit_tag_checkout":     "退出标签模式并检出",
	}
}

// LoadFromFile loads translations from JSON files
func (i *I18n) LoadFromFile(locale Locale, filename string) error {
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return err
	}
	
	var translations map[string]string
	if err := json.Unmarshal(data, &translations); err != nil {
		return err
	}
	
	i.mutex.Lock()
	defer i.mutex.Unlock()
	i.translations[locale] = translations
	
	return nil
}

// SaveToFile saves translations to JSON files
func (i *I18n) SaveToFile(locale Locale, filename string) error {
	i.mutex.RLock()
	translations := i.translations[locale]
	i.mutex.RUnlock()
	
	data, err := json.MarshalIndent(translations, "", "  ")
	if err != nil {
		return err
	}
	
	return ioutil.WriteFile(filename, data, 0644)
}

// GetAvailableLocales returns all available locales
func (i *I18n) GetAvailableLocales() []Locale {
	i.mutex.RLock()
	defer i.mutex.RUnlock()
	
	locales := make([]Locale, 0, len(i.translations))
	for locale := range i.translations {
		locales = append(locales, locale)
	}
	return locales
}

// ReloadTranslations reloads all translation files
func (i *I18n) ReloadTranslations() error {
	i.mutex.Lock()
	defer i.mutex.Unlock()
	
	if err := i.loader.ReloadTranslations(); err != nil {
		return err
	}
	
	i.translations = i.loader.GetAllTranslations()
	return nil
}

// AddTranslation adds a new translation for a specific locale and category
func (i *I18n) AddTranslation(locale Locale, category, key, value string) error {
	i.mutex.Lock()
	defer i.mutex.Unlock()
	
	// Add to in-memory translations
	if i.translations[locale] == nil {
		i.translations[locale] = make(map[string]string)
	}
	
	fullKey := fmt.Sprintf("%s.%s", category, key)
	i.translations[locale][fullKey] = value
	
	// Save to file if using file-based translations
	categoryTranslations := make(map[string]string)
	prefix := category + "."
	for k, v := range i.translations[locale] {
		if len(k) > len(prefix) && k[:len(prefix)] == prefix {
			categoryTranslations[k[len(prefix):]] = v
		}
	}
	
	return i.loader.SaveTranslations(locale, category, categoryTranslations)
}

// Helper functions for global access
func T(key string) string {
	return GetInstance().T(key)
}

func Tf(key string, args ...interface{}) string {
	return GetInstance().Tf(key, args...)
}

func SetLocale(locale Locale) {
	GetInstance().SetLocale(locale)
}

func GetLocale() Locale {
	return GetInstance().GetLocale()
} 