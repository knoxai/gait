/**
 * Internationalization (i18n) JavaScript Module
 * Handles client-side language switching and dynamic content translation
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.init();
    }

    async init() {
        // Load current language from server
        try {
            const response = await fetch('/api/language');
            const data = await response.json();
            this.currentLanguage = data.current;
            console.log('Current language:', this.currentLanguage);
        } catch (error) {
            console.error('Failed to load current language:', error);
        }
        
        // Load translations
        this.loadTranslations();
    }

    loadTranslations() {
        // English translations
        this.translations.en = {
            // Dashboard JavaScript strings
            'loading.commit_trends': 'Loading commit trends...',
            'loading.languages': 'Analyzing languages...',
            'loading.developer_data': 'Loading developer data...',
            'loading.semantic_patterns': 'Analyzing semantic patterns...',
            'loading.diff': 'Loading diff...',
            'loading.loading_diff': 'Loading diff',
            
            // Statistics
            'stats.total_commits': 'Total Commits',
            'stats.active_developers': 'Active Developers',
            'stats.code_quality_score': 'Code Quality Score',
            'stats.technical_debt': 'Technical Debt',
            
            // Actions and buttons
            'action.analyze_repository': 'Analyze Repository',
            'action.export_insights': 'Export Insights',
            'action.view_patterns': 'View Patterns',
            'action.export_knowledge_graph': 'Export Knowledge Graph',
            'action.view_details': 'View Details',
            'actions.cancel': 'Cancel',
            'actions.confirm': 'Confirm',
            'actions.delete': 'Delete',
            'actions.force_delete': 'Force Delete',
            'actions.discard': 'Discard',
            
            // Timeline
            'timeline.no_data': 'No Timeline Data',
            'timeline.run_analysis': 'Run repository analysis to generate timeline',
            
            // Insights
            'insights.no_available': 'No Insights Available',
            'insights.run_analysis': 'Run repository analysis to generate insights',
            
            // Semantic trends
            'semantic.features': 'Features',
            'semantic.fixes': 'Fixes',
            'semantic.refactoring': 'Refactoring',
            'semantic.documentation': 'Documentation',
            'semantic.testing': 'Testing',
            'semantic.performance': 'Performance',
            
            // Knowledge graph
            'graph.data_model': 'Data Model',
            'graph.api_layer': 'API Layer',
            'graph.database': 'Database',
            'graph.http_handlers': 'HTTP Handlers',
            
            // Notifications
            'notifications.dashboard_refreshed': 'Dashboard refreshed',
            'notifications.analysis_started': 'Repository analysis started',
            'notifications.analysis_failed': 'Analysis failed',
            'notifications.language_changed': 'Language changed successfully',
            
            // Status messages
            'status.ready': 'Ready',
            'status.loading': 'Loading...',
            'status.creating_commit': 'Creating commit...',
            'status.commit_created': 'Commit created successfully',
            'status.commit_failed': 'Failed to create commit',
            'status.staging_file': 'Staging file',
            'status.file_staged': 'staged',
            'status.unstaging_file': 'Unstaging file',
            'status.file_unstaged': 'unstaged',
            'status.discarding_changes': 'Discarding changes',
            'status.changes_discarded': 'Changes discarded',
            'status.operation_cancelled': 'Operation cancelled',
            'status.loading_commits': 'Loading commits...',
            'status.loading_commit_details': 'Loading commit details...',
            'status.commit_details_loaded': 'Commit details loaded',
            'status.loading_uncommitted': 'Loading uncommitted changes...',
            'status.uncommitted_loaded': 'Uncommitted changes loaded',
            'status.refreshing_uncommitted': 'Refreshing uncommitted changes...',
            'status.uncommitted_refreshed': 'Uncommitted changes refreshed',
            'status.cherry_picking': 'Cherry-picking commit',
            'status.cherry_picked': 'Commit cherry-picked successfully',
            'status.reverting': 'Reverting commit',
            'status.reverted': 'reverted',
            'status.revert_staged': 'revert staged',
            'status.resetting': 'Resetting to commit',
            'status.reset_complete': 'Branch reset to',
            'status.creating_branch_from': 'Creating branch from commit',
            'status.branch_created_from': 'created from commit',
            'status.loading_more_commits': 'Loading more commits...',
            'status.loaded_more_commits': 'more commits',
            'status.all_commits_loaded': 'All commits loaded',
            'status.failed_load_commits': 'Failed to load more commits',
            'status.commits_found': 'commit(s) matching',
            'status.analyzing': 'Analyzing...',
            
            // Form validation
            'validation.required': 'This field is required',
            'validation.too_long': 'Text is too long',
            'validation.invalid_format': 'Invalid format',
            
            // Error messages
            'error.failed_load_commit': 'Failed to load commit details',
            'error.failed_refresh': 'Failed to refresh',
            'error.failed_create_commit': 'Failed to create commit',
            'error.failed_stage_file': 'Failed to stage file',
            'error.failed_unstage_file': 'Failed to unstage file',
            'error.failed_discard_changes': 'Failed to discard changes',
            
            // File operations
            'file.split_view': 'Split',
            'file.unified_view': 'Unified',
            'file.wrap': 'Wrap',
            'file.no_wrap': 'No Wrap',
            'file.fullscreen': 'Fullscreen',
            'file.close': 'Close (Esc)',
            'file.diff_viewer': 'Diff Viewer',
            
            // Sidebar
            'sidebar.no_tags': 'No tags found',
            'sidebar.no_stashes': 'No stashes found',
            'sidebar.no_remotes': 'No remotes found',
            
            // Commit details
            'commit.details': 'Commit Details',
            'commit.stage_all': 'Stage All Changes',
            'commit.unstage_all': 'Unstage All Changes',
            'commit.discard_changes': 'Discard Changes',
            'commit.commit_staged': 'Commit Staged Changes',
            'commit.author': 'Author',
            
            // Dialog messages
            'dialog.create_branch': 'Create new branch{0}:\n\nEnter branch name:',
            'dialog.create_branch_from': ' from {0}',
            'dialog.delete_branch_confirm': 'Are you sure you want to delete branch "{0}"?\n\nThis cannot be undone if the branch has unmerged changes.',
            'dialog.delete_branch_force': 'Branch "{0}" has unmerged changes.\n\nForce delete? This will permanently lose any unmerged commits.',
            'dialog.merge_branch': 'Merge "{0}" into current branch.\n\nCreate merge commit even if fast-forward is possible?\n\nClick OK for merge commit, Cancel for fast-forward merge.',
            'dialog.rebase_branch': 'Rebase current branch onto "{0}".\n\nUse interactive rebase?\n\nClick OK for interactive, Cancel for automatic rebase.',
            'dialog.delete_tag_confirm': 'Are you sure you want to delete tag "{0}"?\n\nThis cannot be undone.',
            'dialog.push_tag': 'Push tag "{0}" to remote:\n\nAvailable remotes: {1}\n\nEnter remote name (or leave empty for origin):',
            'dialog.delete_stash_confirm': 'Are you sure you want to delete stash {0}? This cannot be undone.',
            'dialog.rename_branch': 'Rename branch "{0}":\n\nEnter new branch name:',
            'dialog.reset_branch': 'Reset branch "{0}" to commit:\n\nEnter commit hash or reference (e.g., HEAD~1):',
            'dialog.reset_type_choice': 'Choose reset type:\n\nOK = Mixed reset (default)\nCancel = Choose advanced options',
            'dialog.reset_type_detailed': 'Choose reset type:\n\n1. Soft (keep changes staged)\n2. Mixed (keep changes unstaged) - default\n3. Hard (discard all changes)\n\nEnter 1, 2, or 3:',
            'dialog.rebase_onto': 'Rebase "{0}" onto:\n\nEnter target branch name:',
            'dialog.rebase_interactive': 'Use interactive rebase?\n\nInteractive rebase allows you to edit, reorder, or squash commits.',
            'dialog.create_stash': 'Create stash:\n\nEnter stash message (optional):',
            'dialog.stash_include_untracked': 'Include untracked files in stash?',
            'dialog.create_tag': 'Create tag:\n\nEnter tag name:',
            'dialog.tag_annotated': 'Create annotated tag?\n\nAnnotated tags include author info and can have a message.',
            'dialog.tag_message': 'Enter tag message:',
            'dialog.pull_remote': 'Pull from remote:\n\nAvailable remotes: {0}\n\nEnter remote name (or leave empty for default):',
            'dialog.pull_branch': 'Pull branch:\n\nEnter branch name (or leave empty for current branch):',
            'dialog.push_remote': 'Push to remote:\n\nAvailable remotes: {0}\n\nEnter remote name (or leave empty for default):',
            'dialog.push_branch': 'Push branch:\n\nEnter branch name (or leave empty for current branch):',
            'dialog.push_force': 'Force push?\n\nWarning: Force push can overwrite remote changes!',
            'dialog.cherry_pick': 'Cherry-pick commit {0}?\n\nThis will apply the changes from this commit to the current branch.',
            'dialog.revert_commit': 'Revert commit {0}?\n\nClick OK to create a revert commit immediately.\nClick Cancel to stage the revert without committing.',
            'dialog.reset_to_commit': 'Reset current branch to commit {0}?\n\nReset type: {1}\n\nThis will change your branch history!',
            'dialog.create_tag_at_commit': 'Create tag at commit {0}:\n\nEnter tag name:',
            'dialog.create_branch_from_commit': 'Create branch from commit {0}:\n\nEnter branch name:',
            'dialog.discard_file_changes': 'Discard changes to {0}?\n\nThis action cannot be undone.',
            'dialog.commit_message': 'Commit Message',
            'dialog.commit_title': 'Create Commit',
            'dialog.commit_message_placeholder': 'Enter a descriptive commit message...',
            'dialog.commit_message_tip': 'Use present tense (e.g., "Add feature" not "Added feature")',
            'dialog.amend_commit': 'Amend previous commit',
            'dialog.signoff_commit': 'Add Signed-off-by line',
            'dialog.create_branch_title': 'Create New Branch',
            'dialog.branch_name': 'Branch Name',
            'dialog.branch_name_tip': 'Use descriptive names like feature/login or bugfix/header-issue',
            'dialog.delete_branch_title': 'Delete Branch',
            'dialog.delete_branch_warning': 'This action cannot be undone if the branch has unmerged changes.',
            'dialog.force_delete_title': 'Force Delete Branch',
            'dialog.force_delete_warning': 'This will permanently delete the branch and lose any unmerged commits.',
            'dialog.discard_changes_title': 'Discard Changes',
            'dialog.discard_changes_warning': 'This action cannot be undone. All changes will be permanently lost.',
            'dialog.input_required': 'Input Required',
            'dialog.confirm_action': 'Confirm Action',
            'dialog.warning': 'Warning',
            'dialog.are_you_sure': 'Are you sure?',
            'commit.date': 'Date',
            'commit.hash': 'Hash',
            'commit.parents': 'Parents',
            'commit.changed_files': 'Changed Files',
            'commit.uncommitted_changes': 'Uncommitted Changes',
            'commit.working_directory': 'Working Directory',
            'commit.cherry_pick_action': 'Cherry-pick',
            'commit.revert_action': 'Revert',
            'commit.reset_to_here': 'Reset to Here',
            'commit.create_tag': 'Tag',
            'commit.create_branch': 'Branch',
            'commit.copy_hash': 'Copy Hash',
            'commit.no_uncommitted': 'No Uncommitted Changes',
            'commit.working_clean': 'Working directory is clean',
            
            // File operations
            'file.loading_diff': 'Loading diff...',
            'file.edit': 'Edit',
            
            // Editor
            'editor.editing': 'Editing',
            'editor.cancel': 'Cancel',
            'editor.save': 'Save',
            'editor.lines': 'Lines',
            'editor.save_shortcut': 'Use Ctrl+S to save',
            'editor.fullscreen_shortcut': 'Ctrl+F11 for fullscreen',
            
            // Refresh operations
            'action.refresh': 'Refresh',
            'refresh.title': 'Refresh uncommitted changes',
            'refresh.failed_refresh': 'Failed to refresh uncommitted changes',
            
            // Navigation
            'navigation.git_view': 'Git View',
            'navigation.dashboard': 'Dashboard',
            'navigation.api_docs': 'API Docs',
            
            // Branch operations
            'branch.checkout': 'Checkout',
            'branch.merge_into_current': 'Merge into Current',
            'branch.rebase_current': 'Rebase Current onto This',
            'branch.rename': 'Rename Branch',
            'branch.delete': 'Delete Branch',
            'branch.create_new': 'Create New Branch',
            'branch.rename_current': 'Rename Current Branch',
            'branch.reset': 'Reset Branch',
            'branch.rebase': 'Rebase Branch',
            'branch.exit_tag_checkout': 'Exit Tag Mode & Checkout',
            
            // Git operations
            'git.branch': 'Branch',
            'git.remote': 'Remote',
            'git.stash': 'Stash',
            'git.tag': 'Tag',
            'git.fetch': 'Fetch',
            'git.pull': 'Pull',
            'git.push': 'Push',
            'git.operations': 'Operations',
            'git.branch_operations': 'Branch Operations',
            'git.remote_operations': 'Remote Operations',
            'git.stash_operations': 'Stash Operations',
            'git.tag_operations': 'Tag Operations',
            'git.create_new_branch': 'Create New Branch',
            'git.manage_branches': 'Manage Branches',
            'git.rebase_current_branch': 'Rebase Current Branch',
            'git.reset_current_branch': 'Reset Current Branch',
            'git.fetch_all_remotes': 'Fetch All Remotes',
            'git.pull_from_remote': 'Pull from Remote',
            'git.push_to_remote': 'Push to Remote',
            'git.manage_remotes': 'Manage Remotes',
            'git.create_stash': 'Create Stash',
            'git.manage_stashes': 'Manage Stashes',
            'git.create_branch_from_stash': 'Create Branch from Stash',
            'git.create_tag': 'Create Tag',
            'git.manage_tags': 'Manage Tags',
            'git.push_all_tags': 'Push All Tags',
            
            // Errors
            'error.failed_load_commit': 'Failed to load commit details',
            'error.failed_fetch': 'Failed to fetch',
            
            // Status
            'status.ready': 'Ready',
            'status.loading': 'Loading',
            'status.error': 'Error',
            'status.all_loaded': '📜 All commits loaded',
            'status.loading_more': 'Loading more commits...',
            'status.staging_file': 'Staging',
            'status.file_staged': 'staged',
            'status.unstaging_file': 'Unstaging',
            'status.file_unstaged': 'unstaged',
            'status.staging_files': 'Staging files...',
            'status.staged_files': 'files staged',
            'status.unstaging_files': 'Unstaging files...',
            'status.unstaged_files': 'files unstaged',
            'status.no_unstaged_changes': 'No unstaged changes to stage',
            'status.no_staged_changes': 'No staged changes to unstage',
        };

        // Chinese translations
        this.translations.zh = {
            // Dashboard JavaScript strings
            'loading.commit_trends': '加载提交趋势中...',
            'loading.languages': '分析语言中...',
            'loading.developer_data': '加载开发者数据中...',
            'loading.semantic_patterns': '分析语义模式中...',
            'loading.diff': '加载差异中...',
            'loading.loading_diff': '加载差异中',
            'loading.chart_data': '加载图表数据中...',

            // Stats labels
            'stats.total_commits': '总提交数',
            'stats.active_developers': '活跃开发者',
            'stats.code_quality_score': '代码质量评分',
            'stats.technical_debt': '技术债务',

            // Actions and buttons
            'action.analyze_repository': '分析仓库',
            'action.export_insights': '导出洞察',
            'action.view_patterns': '查看模式',
            'action.export_knowledge_graph': '导出知识图谱',
            'action.view_details': '查看详情',
            'action.view_trend': '查看趋势',
            'action.analyze_now': '立即分析',
            'action.stage_all_changes': '暂存所有变更',
            'action.commit_changes': '提交变更',
            'action.refresh_dashboard': '刷新仪表板',
            'actions.cancel': '取消',
            'actions.confirm': '确认',
            'actions.delete': '删除',
            'actions.force_delete': '强制删除',
            'actions.discard': '丢弃',

            // Timeline and insights
            'timeline.no_data': '无时间线数据',
            'timeline.run_analysis': '运行仓库分析以生成时间线',

            'insights.no_available': '无可用洞察',
            'insights.run_analysis': '运行仓库分析以生成洞察',

            // Semantic trends
            'semantic.features': '功能',
            'semantic.fixes': '修复',
            'semantic.refactoring': '重构',
            'semantic.documentation': '文档',
            'semantic.testing': '测试',
            'semantic.performance': '性能',

            // Knowledge graph
            'graph.data_model': '数据模型',
            'graph.api_layer': 'API 层',
            'graph.database': '数据库',
            'graph.http_handlers': 'HTTP 处理器',

            // Chart and analysis labels
            'chart.frequency': '频率',
            'chart.reusability': '可重用性',
            'chart.confidence': '置信度',
            'chart.trend': '趋势',
            'chart.pattern': '模式',

            // Analysis results
            'analysis.api_implementation': 'API 实现',
            'analysis.database_migration': '数据库迁移',
            'analysis.error_handling': '错误处理',
            'analysis.authentication_logic': '身份验证逻辑',
            'analysis.authentication_system': '身份验证系统',
            'analysis.api_handler_implementation': 'API 处理器实现',

            // Notifications
            'notifications.dashboard_refreshed': '仪表板已刷新',
            'notifications.analysis_started': '仓库分析已开始',
            'notifications.analysis_failed': '分析失败',
            'notifications.language_changed': '语言切换成功',
            
            // Status messages
            'status.ready': '就绪',
            'status.loading': '加载中...',
            'status.creating_commit': '创建提交中...',
            'status.commit_created': '提交创建成功',
            'status.commit_failed': '创建提交失败',
            'status.staging_file': '暂存文件',
            'status.file_staged': '已暂存',
            'status.unstaging_file': '取消暂存文件',
            'status.file_unstaged': '已取消暂存',
            'status.discarding_changes': '丢弃变更中',
            'status.changes_discarded': '变更已丢弃',
            'status.operation_cancelled': '操作已取消',
            'status.loading_commits': '加载提交中...',
            'status.loading_commit_details': '加载提交详情中...',
            'status.commit_details_loaded': '提交详情已加载',
            'status.loading_uncommitted': '加载未提交变更中...',
            'status.uncommitted_loaded': '未提交变更已加载',
            'status.refreshing_uncommitted': '刷新未提交变更中...',
            'status.uncommitted_refreshed': '未提交变更已刷新',
            'status.cherry_picking': '挑选提交',
            'status.cherry_picked': '提交挑选成功',
            'status.reverting': '撤销提交',
            'status.reverted': '已撤销',
            'status.revert_staged': '撤销已暂存',
            'status.resetting': '重置到提交',
            'status.reset_complete': '分支已重置到',
            'status.creating_branch_from': '从提交创建分支',
            'status.branch_created_from': '已从提交创建',
            'status.loading_more_commits': '加载更多提交中...',
            'status.loaded_more_commits': '个提交',
            'status.all_commits_loaded': '所有提交已加载',
            'status.failed_load_commits': '加载更多提交失败',
            'status.commits_found': '个匹配的提交',
            'status.analyzing': '分析中...',
            
            // Form validation
            'validation.required': '此字段是必需的',
            'validation.too_long': '文本过长',
            'validation.invalid_format': '格式无效',
            
            // Error messages
            'error.failed_load_commit': '加载提交详情失败',
            'error.failed_refresh': '刷新失败',
            'error.failed_create_commit': '创建提交失败',
            'error.failed_stage_file': '暂存文件失败',
            'error.failed_unstage_file': '取消暂存文件失败',
            'error.failed_discard_changes': '丢弃变更失败',

            // Commit operations
            'commit.uncommitted': '未提交变更',
            'commit.displaying': '显示所有未提交变更',
            'commit.files_changed': '个文件已变更',
            'commit.file_changed': '个文件已变更',
            'commit.commit_staged': '提交已暂存变更',
            'commit.stage_all': '暂存所有变更',
            'commit.unstage_all': '取消暂存所有变更',
            'commit.discard_changes': '丢弃变更',
            
            // Dialog messages
            'dialog.create_branch': '创建新分支{0}：\n\n输入分支名称：',
            'dialog.create_branch_from': '从 {0}',
            'dialog.delete_branch_confirm': '确定要删除分支 "{0}" 吗？\n\n如果分支有未合并的变更，此操作无法撤销。',
            'dialog.delete_branch_force': '分支 "{0}" 有未合并的变更。\n\n强制删除？这将永久丢失所有未合并的提交。',
            'dialog.merge_branch': '将 "{0}" 合并到当前分支。\n\n即使可以快进合并也要创建合并提交？\n\n点击确定创建合并提交，取消进行快进合并。',
            'dialog.rebase_branch': '将当前分支变基到 "{0}"。\n\n使用交互式变基？\n\n点击确定进行交互式变基，取消进行自动变基。',
            'dialog.delete_tag_confirm': '确定要删除标签 "{0}" 吗？\n\n此操作无法撤销。',
            'dialog.push_tag': '推送标签 "{0}" 到远程：\n\n可用远程：{1}\n\n输入远程名称（留空默认为 origin）：',
            'dialog.delete_stash_confirm': '确定要删除暂存 {0} 吗？此操作无法撤销。',
            'dialog.rename_branch': '重命名分支 "{0}"：\n\n输入新分支名称：',
            'dialog.reset_branch': '重置分支 "{0}" 到提交：\n\n输入提交哈希或引用（例如：HEAD~1）：',
            'dialog.reset_type_choice': '选择重置类型：\n\n确定 = 混合重置（默认）\n取消 = 选择高级选项',
            'dialog.reset_type_detailed': '选择重置类型：\n\n1. 软重置（保持变更已暂存）\n2. 混合重置（保持变更未暂存）- 默认\n3. 硬重置（丢弃所有变更）\n\n输入 1、2 或 3：',
            'dialog.rebase_onto': '将 "{0}" 变基到：\n\n输入目标分支名称：',
            'dialog.rebase_interactive': '使用交互式变基？\n\n交互式变基允许您编辑、重新排序或压缩提交。',
            'dialog.create_stash': '创建暂存：\n\n输入暂存消息（可选）：',
            'dialog.stash_include_untracked': '在暂存中包含未跟踪的文件？',
            'dialog.create_tag': '创建标签：\n\n输入标签名称：',
            'dialog.tag_annotated': '创建带注释的标签？\n\n带注释的标签包含作者信息并可以有消息。',
            'dialog.tag_message': '输入标签消息：',
            'dialog.pull_remote': '从远程拉取：\n\n可用远程：{0}\n\n输入远程名称（留空使用默认）：',
            'dialog.pull_branch': '拉取分支：\n\n输入分支名称（留空使用当前分支）：',
            'dialog.push_remote': '推送到远程：\n\n可用远程：{0}\n\n输入远程名称（留空使用默认）：',
            'dialog.push_branch': '推送分支：\n\n输入分支名称（留空使用当前分支）：',
            'dialog.push_force': '强制推送？\n\n警告：强制推送可能会覆盖远程变更！',
            'dialog.cherry_pick': '挑选提交 {0}？\n\n这将把此提交的变更应用到当前分支。',
            'dialog.revert_commit': '撤销提交 {0}？\n\n点击确定立即创建撤销提交。\n点击取消暂存撤销而不提交。',
            'dialog.reset_to_commit': '将当前分支重置到提交 {0}？\n\n重置类型：{1}\n\n这将改变您的分支历史！',
            'dialog.create_tag_at_commit': '在提交 {0} 创建标签：\n\n输入标签名称：',
            'dialog.create_branch_from_commit': '从提交 {0} 创建分支：\n\n输入分支名称：',
            'dialog.discard_file_changes': '丢弃对 {0} 的变更？\n\n此操作无法撤销。',
            'dialog.commit_message': '提交信息',
            'dialog.commit_title': '创建提交',
            'dialog.commit_message_placeholder': '请输入提交信息...',
            'dialog.commit_message_tip': '建议使用现在时态（如："添加功能"而非"已添加功能"）',
            'dialog.amend_commit': '修改上次提交',
            'dialog.signoff_commit': '添加签名行',
            'dialog.create_branch_title': '创建新分支',
            'dialog.branch_name': '分支名称',
            'dialog.branch_name_tip': '使用描述性名称，如 feature/login 或 bugfix/header-issue',
            'dialog.delete_branch_title': '删除分支',
            'dialog.delete_branch_warning': '如果分支有未合并的变更，此操作无法撤销。',
            'dialog.force_delete_title': '强制删除分支',
            'dialog.force_delete_warning': '这将永久删除分支并丢失所有未合并的提交。',
            'dialog.discard_changes_title': '丢弃变更',
            'dialog.discard_changes_warning': '此操作无法撤销。所有变更将永久丢失。',
            'dialog.input_required': '需要输入',
            'dialog.confirm_action': '确认操作',
            'dialog.warning': '警告',
            'dialog.are_you_sure': '您确定吗？',

            // File operations
            'file.split_view': '分页视图',
            'file.unified_view': '统一视图',
            'file.wrap': '换行',
            'file.no_wrap': '不换行',
            'file.fullscreen': '全屏',
            'file.close': '关闭 (Esc)',
            'file.diff_viewer': '差异查看器',
            
            // File status
            'file.status.staged': '已暂存',
            'file.status.unstaged': '未暂存',
            'file.status.untracked': '未跟踪',
            
            // Sidebar
            'sidebar.no_tags': '未找到标签',
            'sidebar.no_stashes': '未找到暂存',
            'sidebar.no_remotes': '未找到远程',
            
            // Commit details
            'commit.details': '提交详情',
            'commit.author': '作者',
            'commit.date': '日期',
            'commit.hash': '哈希',
            'commit.parents': '父提交',
            'commit.changed_files': '变更文件',
            'commit.uncommitted_changes': '未提交变更',
            'commit.working_directory': '工作目录',
            'commit.cherry_pick_action': '挑选提交',
            'commit.revert_action': '撤销提交',
            'commit.reset_to_here': '重置到此处',
            'commit.create_tag': '标签',
            'commit.create_branch': '分支',
            'commit.copy_hash': '复制哈希',
            'commit.no_uncommitted': '无未提交变更',
            'commit.working_clean': '工作目录是干净的',
            
            // File operations
            'file.loading_diff': '加载差异中...',
            'file.edit': '编辑',
            
            // Editor
            'editor.editing': '编辑中',
            'editor.cancel': '取消',
            'editor.save': '保存',
            'editor.lines': '行数',
            'editor.save_shortcut': '使用 Ctrl+S 保存',
            'editor.fullscreen_shortcut': 'Ctrl+F11 全屏',
            
            // Refresh operations
            'action.refresh': '刷新',
            'refresh.title': '刷新未提交变更',
            'refresh.failed_refresh': '刷新未提交变更失败',
            
            // Navigation
            'navigation.git_view': 'Git 视图',
            'navigation.dashboard': '仪表板',
            'navigation.api_docs': 'API 文档',
            
            // Branch operations
            'branch.checkout': '检出',
            'branch.merge_into_current': '合并到当前分支',
            'branch.rebase_current': '将当前分支变基到此',
            'branch.rename': '重命名分支',
            'branch.delete': '删除分支',
            'branch.create_new': '创建新分支',
            'branch.rename_current': '重命名当前分支',
            'branch.reset': '重置分支',
            'branch.rebase': '变基分支',
            'branch.exit_tag_checkout': '退出标签模式并检出',
            
            // Git operations
            'git.branch': '分支',
            'git.remote': '远程',
            'git.stash': '暂存',
            'git.tag': '标签',
            'git.fetch': '提取',
            'git.pull': '拉取',
            'git.push': '推送',
            'git.operations': '操作',
            'git.branch_operations': '分支操作',
            'git.remote_operations': '远程操作',
            'git.stash_operations': '暂存操作',
            'git.tag_operations': '标签操作',
            'git.create_new_branch': '创建新分支',
            'git.manage_branches': '管理分支',
            'git.rebase_current_branch': '变基当前分支',
            'git.reset_current_branch': '重置当前分支',
            'git.fetch_all_remotes': '提取所有远程',
            'git.pull_from_remote': '从远程拉取',
            'git.push_to_remote': '推送到远程',
            'git.manage_remotes': '管理远程',
            'git.create_stash': '创建暂存',
            'git.manage_stashes': '管理暂存',
            'git.create_branch_from_stash': '从暂存创建分支',
            'git.create_tag': '创建标签',
            'git.manage_tags': '管理标签',
            'git.push_all_tags': '推送所有标签',
            
            // Errors
            'error.failed_load_commit': '加载提交详情失败',
            'error.failed_fetch': '获取失败',
            
            // Status
            'status.staging_file': '暂存中',
            'status.file_staged': '已暂存',
            'status.unstaging_file': '取消暂存中',
            'status.file_unstaged': '已取消暂存',
            'status.staging_files': '暂存文件中...',
            'status.staged_files': '个文件已暂存',
            'status.unstaging_files': '取消暂存文件中...',
            'status.unstaged_files': '个文件已取消暂存',
            'status.no_unstaged_changes': '没有未暂存的变更需要暂存',
            'status.no_staged_changes': '没有已暂存的变更需要取消暂存',

            // Advanced features
            'advanced.coming_soon': '高级管理功能即将推出...',
            'advanced.stash_management': '高级暂存管理即将推出...',
            'advanced.tag_management': '高级标签管理即将推出...',
            'advanced.remote_management': '高级远程管理即将推出...',
            'advanced.branch_from_stash': '从暂存创建分支即将推出...',

            // Status messages
            'status.loading_commits': '加载提交中',
            'status.all_loaded': '📜 所有提交已加载',
            'status.loading_more': '加载更多提交中...',
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
        
        // Return key if no translation found
        return key;
    }

    // Switch language
    async switchLanguage(language) {
        if (language === this.currentLanguage) {
            return;
        }

        try {
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
            
            // Show notification
            this.showNotification(data.message || this.t('notifications.language_changed'), 'success');
            
            // Reload page to apply server-side translations
            setTimeout(() => {
                window.location.reload();
            }, 500);
            
        } catch (error) {
            console.error('Language switch failed:', error);
            this.showNotification('Language switch failed', 'error');
        }
    }

    // Update dynamic content
    updateDynamicContent() {
        // Update chart loading messages
        document.querySelectorAll('.chart-loading span').forEach(span => {
            const text = span.textContent;
            if (text.includes('Loading commit trends')) {
                span.textContent = this.t('loading.commit_trends');
            } else if (text.includes('Analyzing languages')) {
                span.textContent = this.t('loading.languages');
            } else if (text.includes('Loading developer data')) {
                span.textContent = this.t('loading.developer_data');
            } else if (text.includes('Analyzing semantic patterns')) {
                span.textContent = this.t('loading.semantic_patterns');
            }
        });

        // Update buttons with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} show`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
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
}

// Global instance
const i18nManager = new I18nManager();

// Global functions for templates
function switchLanguage(language) {
    i18nManager.switchLanguage(language);
}

function t(key) {
    return i18nManager.t(key);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18nManager, i18nManager, switchLanguage, t };
} 