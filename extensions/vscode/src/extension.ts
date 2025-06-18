import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import * as WebSocket from 'ws';

// ADES VS Code Extension - Sprint 7 Implementation
export function activate(context: vscode.ExtensionContext) {
    console.log('ADES Extension is now active!');

    // Initialize ADES service
    const adesService = new ADESService();
    
    // Initialize providers
    const insightsProvider = new ADESInsightsProvider(adesService);
    const patternsProvider = new ADESPatternsProvider(adesService);
    
    // Register tree data providers
    vscode.window.registerTreeDataProvider('adesInsights', insightsProvider);
    vscode.window.registerTreeDataProvider('adesPatterns', patternsProvider);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('ades.analyzeRepository', () => analyzeRepository(adesService)),
        vscode.commands.registerCommand('ades.showDashboard', () => showDashboard(adesService)),
        vscode.commands.registerCommand('ades.searchPatterns', () => searchPatterns(adesService)),
        vscode.commands.registerCommand('ades.getInsights', () => getInsights(adesService)),
        vscode.commands.registerCommand('ades.semanticSearch', () => semanticSearch(adesService)),
        vscode.commands.registerCommand('ades.showKnowledgeGraph', () => showKnowledgeGraph(adesService)),
        vscode.commands.registerCommand('ades.extractPatterns', () => extractPatterns(adesService)),
        vscode.commands.registerCommand('ades.connectServer', () => connectServer(adesService)),
        vscode.commands.registerCommand('ades.refreshInsights', () => insightsProvider.refresh()),
        vscode.commands.registerCommand('ades.refreshPatterns', () => patternsProvider.refresh())
    ];

    // Register all commands
    commands.forEach(command => context.subscriptions.push(command));

    // Auto-analyze on startup if enabled
    const config = vscode.workspace.getConfiguration('ades');
    if (config.get('autoAnalyze')) {
        analyzeRepository(adesService);
    }

    // Setup periodic refresh
    const refreshInterval = config.get<number>('refreshInterval', 30) * 1000;
    setInterval(() => {
        insightsProvider.refresh();
        patternsProvider.refresh();
    }, refreshInterval);

    // Setup status bar
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(robot) ADES";
    statusBarItem.tooltip = "ADES - AI Development Experience System";
    statusBarItem.command = 'ades.showDashboard';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Setup WebSocket connection for real-time updates
    adesService.connectWebSocket();
}

export function deactivate() {
    console.log('ADES Extension is now deactivated');
}

// ADES Service Class
class ADESService {
    private serverUrl: string;
    private websocket: WebSocket | null = null;

    constructor() {
        const config = vscode.workspace.getConfiguration('ades');
        this.serverUrl = config.get('serverUrl', 'http://localhost:8080');
    }

    async analyzeRepository(): Promise<any> {
        try {
            const response = await axios.post(`${this.serverUrl}/api/ades/analyze/comprehensive`);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to analyze repository: ${error}`);
            throw error;
        }
    }

    async getDashboardData(): Promise<any> {
        try {
            const response = await axios.get(`${this.serverUrl}/api/ades/dashboard`);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get dashboard data: ${error}`);
            throw error;
        }
    }

    async searchPatterns(query?: string): Promise<any> {
        try {
            const url = query 
                ? `${this.serverUrl}/api/ades/patterns?q=${encodeURIComponent(query)}`
                : `${this.serverUrl}/api/ades/patterns`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to search patterns: ${error}`);
            throw error;
        }
    }

    async getInsights(): Promise<any> {
        try {
            const response = await axios.get(`${this.serverUrl}/api/ades/insights`);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get insights: ${error}`);
            throw error;
        }
    }

    async semanticSearch(query: string): Promise<any> {
        try {
            const response = await axios.get(`${this.serverUrl}/api/ades/semantic/search?q=${encodeURIComponent(query)}`);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to perform semantic search: ${error}`);
            throw error;
        }
    }

    async getKnowledgeGraph(): Promise<any> {
        try {
            const response = await axios.get(`${this.serverUrl}/api/ades/knowledge/stats`);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get knowledge graph: ${error}`);
            throw error;
        }
    }

    async extractPatterns(): Promise<any> {
        try {
            const response = await axios.get(`${this.serverUrl}/api/ades/patterns`);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to extract patterns: ${error}`);
            throw error;
        }
    }

    connectWebSocket() {
        const wsUrl = this.serverUrl.replace('http', 'ws') + '/ws/dashboard';
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.on('open', () => {
                console.log('ADES WebSocket connected');
                vscode.window.showInformationMessage('Connected to ADES server');
            });

            this.websocket.on('message', (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });

            this.websocket.on('close', () => {
                console.log('ADES WebSocket disconnected');
                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.connectWebSocket(), 5000);
            });

            this.websocket.on('error', (error) => {
                console.error('ADES WebSocket error:', error);
                vscode.window.showErrorMessage(`ADES connection error: ${error.message}`);
            });
        } catch (error) {
            console.error('Failed to connect to ADES WebSocket:', error);
        }
    }

    private handleWebSocketMessage(message: any) {
        switch (message.type) {
            case 'commit':
                vscode.window.showInformationMessage(`New commit: ${message.payload.message}`);
                break;
            case 'insight':
                vscode.window.showInformationMessage(`New insight: ${message.payload.title}`);
                break;
            case 'update':
                // Refresh views
                vscode.commands.executeCommand('ades.refreshInsights');
                vscode.commands.executeCommand('ades.refreshPatterns');
                break;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.serverUrl}/api/gait`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

// Insights Tree Data Provider
class ADESInsightsProvider implements vscode.TreeDataProvider<InsightItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<InsightItem | undefined | null | void> = new vscode.EventEmitter<InsightItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<InsightItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private adesService: ADESService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InsightItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: InsightItem): Promise<InsightItem[]> {
        if (!element) {
            try {
                const insights = await this.adesService.getInsights();
                return this.createInsightItems(insights);
            } catch (error) {
                return [new InsightItem('Failed to load insights', vscode.TreeItemCollapsibleState.None, 'error')];
            }
        }
        return [];
    }

    private createInsightItems(insights: any): InsightItem[] {
        if (!insights || !insights.insights) {
            return [new InsightItem('No insights available', vscode.TreeItemCollapsibleState.None, 'info')];
        }

        return insights.insights.map((insight: any) => {
            const item = new InsightItem(
                insight.title || 'Untitled Insight',
                vscode.TreeItemCollapsibleState.None,
                insight.priority || 'medium'
            );
            item.description = insight.description;
            item.tooltip = insight.description;
            return item;
        });
    }
}

// Patterns Tree Data Provider
class ADESPatternsProvider implements vscode.TreeDataProvider<PatternItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PatternItem | undefined | null | void> = new vscode.EventEmitter<PatternItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PatternItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private adesService: ADESService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PatternItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: PatternItem): Promise<PatternItem[]> {
        if (!element) {
            try {
                const patterns = await this.adesService.extractPatterns();
                return this.createPatternItems(patterns);
            } catch (error) {
                return [new PatternItem('Failed to load patterns', vscode.TreeItemCollapsibleState.None, 0)];
            }
        }
        return [];
    }

    private createPatternItems(patterns: any): PatternItem[] {
        if (!patterns || !patterns.patterns) {
            return [new PatternItem('No patterns found', vscode.TreeItemCollapsibleState.None, 0)];
        }

        return patterns.patterns.map((pattern: any) => {
            const item = new PatternItem(
                pattern.name || 'Unnamed Pattern',
                vscode.TreeItemCollapsibleState.None,
                pattern.reusability || 0
            );
            item.description = `${pattern.occurrences || 0} occurrences`;
            item.tooltip = pattern.description || 'No description available';
            return item;
        });
    }
}

// Tree Item Classes
class InsightItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly priority: string
    ) {
        super(label, collapsibleState);
        this.iconPath = this.getIconForPriority(priority);
        this.contextValue = 'insight';
    }

    private getIconForPriority(priority: string): vscode.ThemeIcon {
        switch (priority) {
            case 'high':
                return new vscode.ThemeIcon('warning');
            case 'medium':
                return new vscode.ThemeIcon('info');
            case 'low':
                return new vscode.ThemeIcon('lightbulb');
            default:
                return new vscode.ThemeIcon('question');
        }
    }
}

class PatternItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly reusability: number
    ) {
        super(label, collapsibleState);
        this.iconPath = new vscode.ThemeIcon('symbol-class');
        this.contextValue = 'pattern';
    }
}

// Command Implementations
async function analyzeRepository(adesService: ADESService) {
    vscode.window.showInformationMessage('Starting repository analysis...');
    
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing repository with ADES",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Initializing analysis..." });
            
            const result = await adesService.analyzeRepository();
            
            progress.report({ increment: 100, message: "Analysis complete!" });
            
            vscode.window.showInformationMessage(`Repository analysis completed! Found ${result.total_commits || 0} commits analyzed.`);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Analysis failed: ${error}`);
    }
}

async function showDashboard(adesService: ADESService) {
    const config = vscode.workspace.getConfiguration('ades');
    const serverUrl = config.get('serverUrl', 'http://localhost:8080');
    const dashboardUrl = `${serverUrl}/dashboard`;
    
    vscode.env.openExternal(vscode.Uri.parse(dashboardUrl));
}

async function searchPatterns(adesService: ADESService) {
    const query = await vscode.window.showInputBox({
        prompt: 'Enter search query for patterns',
        placeHolder: 'e.g., authentication, validation, error handling'
    });

    if (query) {
        try {
            const patterns = await adesService.searchPatterns(query);
            
            if (patterns && patterns.patterns && patterns.patterns.length > 0) {
                const items = patterns.patterns.map((pattern: any) => ({
                    label: pattern.name,
                    description: `${pattern.occurrences} occurrences`,
                    detail: pattern.description
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a pattern to view details'
                });

                if (selected) {
                    vscode.window.showInformationMessage(`Pattern: ${selected.label}\n${selected.detail}`);
                }
            } else {
                vscode.window.showInformationMessage('No patterns found for the given query.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Pattern search failed: ${error}`);
        }
    }
}

async function getInsights(adesService: ADESService) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    try {
        const insights = await adesService.getInsights();
        
        if (insights && insights.insights && insights.insights.length > 0) {
            const items = insights.insights.map((insight: any) => ({
                label: insight.title,
                description: insight.priority,
                detail: insight.description
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an insight to view details'
            });

            if (selected) {
                vscode.window.showInformationMessage(`${selected.label}\n${selected.detail}`);
            }
        } else {
            vscode.window.showInformationMessage('No insights available.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to get insights: ${error}`);
    }
}

async function semanticSearch(adesService: ADESService) {
    const editor = vscode.window.activeTextEditor;
    let query = '';

    if (editor && !editor.selection.isEmpty) {
        query = editor.document.getText(editor.selection);
    }

    const searchQuery = await vscode.window.showInputBox({
        prompt: 'Enter semantic search query',
        value: query,
        placeHolder: 'e.g., function that handles user authentication'
    });

    if (searchQuery) {
        try {
            const results = await adesService.semanticSearch(searchQuery);
            
            if (results && results.length > 0) {
                const items = results.map((result: any) => ({
                    label: result.message || 'Untitled',
                    description: `${result.author} - ${result.date}`,
                    detail: `Relevance: ${(result.relevance * 100).toFixed(1)}%`
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a result to view details'
                });

                if (selected) {
                    vscode.window.showInformationMessage(`${selected.label}\n${selected.description}\n${selected.detail}`);
                }
            } else {
                vscode.window.showInformationMessage('No semantic search results found.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Semantic search failed: ${error}`);
        }
    }
}

async function showKnowledgeGraph(adesService: ADESService) {
    try {
        const graph = await adesService.getKnowledgeGraph();
        
        const message = `Knowledge Graph Statistics:
• Total Nodes: ${graph.total_nodes || 0}
• Total Edges: ${graph.total_edges || 0}
• Component Nodes: ${graph.component_nodes || 0}
• Pattern Nodes: ${graph.pattern_nodes || 0}`;

        vscode.window.showInformationMessage(message);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to load knowledge graph: ${error}`);
    }
}

async function extractPatterns(adesService: ADESService) {
    vscode.window.showInformationMessage('Extracting reusable patterns...');
    
    try {
        const patterns = await adesService.extractPatterns();
        
        if (patterns && patterns.patterns && patterns.patterns.length > 0) {
            vscode.window.showInformationMessage(`Found ${patterns.patterns.length} reusable patterns!`);
            vscode.commands.executeCommand('ades.refreshPatterns');
        } else {
            vscode.window.showInformationMessage('No reusable patterns found.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Pattern extraction failed: ${error}`);
    }
}

async function connectServer(adesService: ADESService) {
    const isConnected = await adesService.testConnection();
    
    if (isConnected) {
        vscode.window.showInformationMessage('Successfully connected to ADES server!');
        adesService.connectWebSocket();
    } else {
        const config = vscode.workspace.getConfiguration('ades');
        const serverUrl = config.get('serverUrl', 'http://localhost:8080');
        
        vscode.window.showErrorMessage(`Failed to connect to ADES server at ${serverUrl}. Please check if the server is running.`);
    }
} 