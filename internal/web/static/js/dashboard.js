/**
 * ADES Dashboard - Sprint 6 Enhanced UI
 * Interactive dashboard with real-time updates and advanced visualizations
 */

class ADESDashboard {
    constructor() {
        this.charts = new Map();
        this.realTimeUpdates = true;
        this.updateInterval = 30000; // 30 seconds
        this.websocket = null;
        this.updateTimer = null;
        
        console.log('ADESDashboard constructor called');
        this.init();
    }

    // Test function to verify basic functionality
    testDashboard() {
        console.log('=== DASHBOARD TEST ===');
        console.log('Chart.js available:', typeof Chart !== 'undefined');
        console.log('D3.js available:', typeof d3 !== 'undefined');
        console.log('Dashboard container found:', !!document.querySelector('.dashboard-container'));
        console.log('Chart canvases found:', document.querySelectorAll('canvas').length);
        console.log('=== END TEST ===');
    }

    init() {
        console.log('Initializing ADES Dashboard...');
        this.testDashboard();
        this.setupEventListeners();
        console.log('Event listeners set up');
        this.initializeCharts();
        console.log('Charts initialized');
        this.startRealTimeUpdates();
        this.loadDashboardData();
        console.log('Dashboard initialization complete');
    }

    setupEventListeners() {
        // Dashboard navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.dashboard-nav-item')) {
                this.switchDashboardView(e.target.dataset.view);
            }
            
            if (e.target.matches('.interactive-button')) {
                this.handleInteractiveButton(e.target);
            }
            
            if (e.target.matches('.graph-control-btn')) {
                this.handleGraphControl(e.target);
            }
        });

        // Real-time toggle
        document.addEventListener('change', (e) => {
            if (e.target.matches('#realtime-toggle')) {
                this.toggleRealTimeUpdates(e.target.checked);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'd':
                        e.preventDefault();
                        this.toggleDashboard();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshDashboard();
                        break;
                }
            }
        });
    }

    async loadDashboardData() {
        try {
            console.log('Starting dashboard data load...');
            this.showLoadingState();
            
            // Load dashboard data from single endpoint
            const response = await fetch('/api/ades/dashboard');
            if (!response.ok) throw new Error((typeof i18nManager !== 'undefined') ? i18nManager.t('error.failed_fetch') + ' dashboard data' : 'Failed to fetch dashboard data');
            const data = await response.json();

            console.log('Dashboard data loaded:', data);
            this.updateDashboardCards(data);

            this.hideLoadingState();
            console.log('Dashboard data load completed');
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showErrorState(error.message);
            this.hideLoadingState();
        }
    }

    async fetchAnalytics() {
        const response = await fetch('/api/ades/analytics');
                    if (!response.ok) throw new Error((typeof i18nManager !== 'undefined') ? i18nManager.t('error.failed_fetch') + ' analytics' : 'Failed to fetch analytics');
        return response.json();
    }

    async fetchInsights() {
        const response = await fetch('/api/ades/insights');
                    if (!response.ok) throw new Error((typeof i18nManager !== 'undefined') ? i18nManager.t('error.failed_fetch') + ' insights' : 'Failed to fetch insights');
        return response.json();
    }

    async fetchPatterns() {
        const response = await fetch('/api/ades/patterns');
                    if (!response.ok) throw new Error((typeof i18nManager !== 'undefined') ? i18nManager.t('error.failed_fetch') + ' patterns' : 'Failed to fetch patterns');
        return response.json();
    }

    async fetchSemantics() {
        const response = await fetch('/api/ades/semantic/trends');
                    if (!response.ok) throw new Error((typeof i18nManager !== 'undefined') ? i18nManager.t('error.failed_fetch') + ' semantic trends' : 'Failed to fetch semantic trends');
        return response.json();
    }

    updateDashboardCards(data) {
        // Update statistics cards
        this.updateStatsCards(data.analytics);
        
        // Update charts
        this.updateCommitTrendChart(data.analytics ? data.analytics.commitTrends : null);
        this.updateLanguageDistributionChart(data.analytics ? data.analytics.languageDistribution : null);
        this.updateDeveloperActivityChart(data.analytics ? data.analytics.developerActivity : null);
        this.updateSemanticTrendsChart(data.semantics);
        
        // Update knowledge graph - handle different data structures
        let knowledgeGraphData = null;
        if (data.insights && data.insights.knowledgeGraph) {
            knowledgeGraphData = data.insights.knowledgeGraph;
        } else if (data.knowledge_graph) {
            knowledgeGraphData = data.knowledge_graph;
        }
        this.updateKnowledgeGraph(knowledgeGraphData);
        
        // Update timeline
        this.updateDevelopmentTimeline(data.patterns ? data.patterns.timeline : null);
        
        // Update insights
        this.updateInsightsPanel(data.insights);
    }

    updateStatsCards(analytics) {
        const statsContainer = document.querySelector('.stats-grid');
        if (!statsContainer) return;

        // Handle missing analytics data
        if (!analytics) {
            analytics = {
                totalCommits: 0,
                activeDevelopers: 0,
                codeQualityScore: 0,
                technicalDebt: 'Unknown'
            };
        }

        const stats = [
            { 
                label: (typeof i18nManager !== 'undefined') ? i18nManager.t('stats.total_commits') : 'Total Commits', 
                value: analytics.totalCommits || 0, 
                icon: '📝' 
            },
            { 
                label: (typeof i18nManager !== 'undefined') ? i18nManager.t('stats.active_developers') : 'Active Developers', 
                value: analytics.activeDevelopers || 0, 
                icon: '👥' 
            },
            { 
                label: (typeof i18nManager !== 'undefined') ? i18nManager.t('stats.code_quality_score') : 'Code Quality Score', 
                value: `${analytics.codeQualityScore || 0}%`, 
                icon: '⭐' 
            },
            { 
                label: (typeof i18nManager !== 'undefined') ? i18nManager.t('stats.technical_debt') : 'Technical Debt', 
                value: analytics.technicalDebt || 'Unknown', 
                icon: '⚠️' 
            }
        ];

        statsContainer.innerHTML = stats.map(stat => `
            <div class="stat-card fade-in">
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.icon} ${stat.label}</div>
            </div>
        `).join('');
    }

    initializeCharts() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        console.log('Chart.js is available, initializing charts...');
        // Initialize Chart.js charts
        this.initCommitTrendChart();
        this.initLanguageDistributionChart();
        this.initDeveloperActivityChart();
        this.initSemanticTrendsChart();
    }

    initCommitTrendChart() {
        const ctx = document.getElementById('commitTrendChart');
        if (!ctx) {
            console.warn('commitTrendChart canvas not found');
            return;
        }

        console.log('Initializing commit trend chart');
        this.charts.set('commitTrend', new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Commits per Day',
                    data: [],
                    borderColor: '#007acc',
                    backgroundColor: 'rgba(0, 122, 204, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#007acc',
                    pointBorderColor: '#ffffff',
                    pointHoverBackgroundColor: '#1177bb',
                    pointHoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(62, 62, 66, 0.3)'
                        },
                        ticks: {
                            color: '#cccccc'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#cccccc'
                        }
                    }
                }
            }
        }));
    }

    initLanguageDistributionChart() {
        const ctx = document.getElementById('languageChart');
        if (!ctx) return;

        this.charts.set('languageDistribution', new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#007acc', '#4ec9b0', '#d29922', '#da3633',
                        '#238636', '#8250df', '#f85149', '#1f9cf0'
                    ],
                    borderColor: '#3e3e42',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cccccc',
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        }));
    }

    initDeveloperActivityChart() {
        const ctx = document.getElementById('developerChart');
        if (!ctx) return;

        this.charts.set('developerActivity', new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Commits',
                    data: [],
                    backgroundColor: 'rgba(0, 122, 204, 0.8)',
                    borderColor: '#007acc',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(62, 62, 66, 0.3)'
                        },
                        ticks: {
                            color: '#cccccc'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#cccccc'
                        }
                    }
                }
            }
        }));
    }

    initSemanticTrendsChart() {
        const ctx = document.getElementById('semanticChart');
        if (!ctx) return;

        this.charts.set('semanticTrends', new Chart(ctx, {
            type: 'radar',
            data: {
                labels: (typeof i18nManager !== 'undefined') ? [
                    i18nManager.t('semantic.features'),
                    i18nManager.t('semantic.fixes'),
                    i18nManager.t('semantic.refactoring'),
                    i18nManager.t('semantic.documentation'),
                    i18nManager.t('semantic.testing'),
                    i18nManager.t('semantic.performance')
                ] : ['Features', 'Fixes', 'Refactoring', 'Documentation', 'Testing', 'Performance'],
                datasets: [{
                    label: 'Current Period',
                    data: [],
                    borderColor: '#007acc',
                    backgroundColor: 'rgba(0, 122, 204, 0.2)',
                    pointBackgroundColor: '#007acc',
                    pointBorderColor: '#ffffff',
                    pointHoverBackgroundColor: '#1177bb',
                    pointHoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(62, 62, 66, 0.3)'
                        },
                        angleLines: {
                            color: 'rgba(62, 62, 66, 0.3)'
                        },
                        pointLabels: {
                            color: '#cccccc',
                            font: {
                                size: 11
                            }
                        },
                        ticks: {
                            color: '#8c8c8c',
                            backdropColor: 'transparent'
                        }
                    }
                }
            }
        }));
    }

    updateCommitTrendChart(data) {
        const chart = this.charts.get('commitTrend');
        if (!chart) {
            console.warn('Commit trend chart not found');
            return;
        }

        // Handle missing data
        if (!data) {
            data = { labels: [], values: [] };
        }

        console.log('Updating commit trend chart with data:', data);
        chart.data.labels = data.labels || [];
        chart.data.datasets[0].data = data.values || [];
        chart.update('none');
    }

    updateLanguageDistributionChart(data) {
        const chart = this.charts.get('languageDistribution');
        if (!chart) return;

        // Handle missing data
        if (!data) {
            data = { languages: [], percentages: [] };
        }

        chart.data.labels = data.languages || [];
        chart.data.datasets[0].data = data.percentages || [];
        chart.update('none');
    }

    updateDeveloperActivityChart(data) {
        const chart = this.charts.get('developerActivity');
        if (!chart) return;

        // Handle missing data
        if (!data) {
            data = { developers: [], commits: [] };
        }

        chart.data.labels = data.developers || [];
        chart.data.datasets[0].data = data.commits || [];
        chart.update('none');
    }

    updateSemanticTrendsChart(data) {
        const chart = this.charts.get('semanticTrends');
        if (!chart) return;

        // Handle missing data
        if (!data) {
            data = {
                features: 0, fixes: 0, refactoring: 0,
                documentation: 0, testing: 0, performance: 0
            };
        }

        chart.data.datasets[0].data = [
            data.features || 0, data.fixes || 0, data.refactoring || 0,
            data.documentation || 0, data.testing || 0, data.performance || 0
        ];
        chart.update('none');
    }

    updateKnowledgeGraph(data) {
        const container = document.querySelector('.knowledge-graph-container');
        if (!container) return;

        // Handle missing or empty data
        if (!data || (!data.nodes && !data.links)) {
            data = {
                nodes: [
                    { 
                        id: 'data-model', 
                        label: (typeof i18nManager !== 'undefined') ? i18nManager.t('graph.data_model') : 'Data Model', 
                        size: 12, 
                        color: '#007acc' 
                    },
                    { 
                        id: 'api-layer', 
                        label: (typeof i18nManager !== 'undefined') ? i18nManager.t('graph.api_layer') : 'API Layer', 
                        size: 10, 
                        color: '#4ec9b0' 
                    },
                    { 
                        id: 'database', 
                        label: (typeof i18nManager !== 'undefined') ? i18nManager.t('graph.database') : 'Database', 
                        size: 8, 
                        color: '#8250df' 
                    },
                    { 
                        id: 'http-handlers', 
                        label: (typeof i18nManager !== 'undefined') ? i18nManager.t('graph.http_handlers') : 'HTTP Handlers', 
                        size: 6, 
                        color: '#d29922' 
                    }
                ],
                links: [
                    { source: 'data-model', target: 'api-layer', value: 2 },
                    { source: 'api-layer', target: 'database', value: 1 },
                    { source: 'api-layer', target: 'http-handlers', value: 3 }
                ]
            };
        }

        // Ensure data has the required structure
        if (!data.nodes) data.nodes = [];
        if (!data.links) data.links = [];

        // Initialize D3.js force-directed graph
        this.renderKnowledgeGraph(container, data);
    }

    renderKnowledgeGraph(container, data) {
        // Check if D3.js is available
        if (typeof d3 === 'undefined') {
            console.error('D3.js is not loaded');
            container.innerHTML = '<div class="error-message">D3.js library not loaded</div>';
            return;
        }
        
        console.log('Rendering knowledge graph with D3.js');
        // Clear existing content
        container.innerHTML = `
            <div class="graph-controls">
                <button class="graph-control-btn" data-action="zoom-in" title="Zoom In">🔍+</button>
                <button class="graph-control-btn" data-action="zoom-out" title="Zoom Out">🔍-</button>
                <button class="graph-control-btn" data-action="reset" title="Reset View">🔄</button>
            </div>
        `;

        const width = container.clientWidth;
        const height = container.clientHeight;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g');

        // Create zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Create force simulation
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2));

        // Create links
        const link = g.append('g')
            .selectAll('line')
            .data(data.links)
            .enter().append('line')
            .attr('stroke', '#5a5a5a')
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', d => Math.sqrt(d.value || 1));

        // Create nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(data.nodes)
            .enter().append('circle')
            .attr('r', d => d.size || 8)
            .attr('fill', d => d.color || '#007acc')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Add labels
        const label = g.append('g')
            .selectAll('text')
            .data(data.nodes)
            .enter().append('text')
            .text(d => d.label)
            .attr('font-size', '11px')
            .attr('font-family', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif')
            .attr('fill', '#cccccc')
            .attr('dx', 12)
            .attr('dy', 4)
            .style('pointer-events', 'none');

        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }

    updateDevelopmentTimeline(data) {
        const container = document.querySelector('.timeline-container');
        if (!container) return;

        // Handle missing or empty data
        if (!data || !Array.isArray(data) || data.length === 0) {
            container.innerHTML = `
                <div class="timeline-item fade-in">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="timeline-title">${(typeof i18nManager !== 'undefined') ? i18nManager.t('timeline.no_data') : 'No Timeline Data'}</div>
                        <div class="timeline-description">${(typeof i18nManager !== 'undefined') ? i18nManager.t('timeline.run_analysis') : 'Run repository analysis to generate timeline'}</div>
                        <div class="timeline-date">${new Date().toLocaleDateString()}</div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="timeline-item fade-in">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-title">${item.title || 'Unknown Event'}</div>
                    <div class="timeline-description">${item.description || 'No description available'}</div>
                    <div class="timeline-date">${item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date'}</div>
                </div>
            </div>
        `).join('');
    }

    updateInsightsPanel(data) {
        const container = document.querySelector('.insights-panel');
        if (!container || !data) return;

        // Handle different data structures - check if data has insights array or is the insights object itself
        let insights = [];
        
        if (data.insights && Array.isArray(data.insights)) {
            // Data has insights array (from dashboard endpoint)
            insights = data.insights;
        } else if (data.top_patterns && Array.isArray(data.top_patterns)) {
            // Data is DevelopmentInsights object (from insights endpoint)
            insights = data.top_patterns.map(pattern => ({
                title: pattern.pattern,
                description: `${(typeof i18nManager !== 'undefined') ? i18nManager.t('chart.frequency') : 'Frequency'}: ${pattern.frequency}, ${(typeof i18nManager !== 'undefined') ? i18nManager.t('chart.reusability') : 'Reusability'}: ${(pattern.reusability * 100).toFixed(1)}%`,
                priority: pattern.reusability > 0.7 ? 'high' : pattern.reusability > 0.4 ? 'medium' : 'low',
                icon: '🔍',
                action: 'view-patterns',
                actionLabel: (typeof i18nManager !== 'undefined') ? i18nManager.t('action.view_details') : 'View Details'
            }));
            
            // Add trends as insights
            if (data.trends && Array.isArray(data.trends)) {
                data.trends.forEach(trend => {
                    insights.push({
                        title: trend.trend,
                        description: trend.description,
                        priority: trend.confidence > 0.8 ? 'high' : trend.confidence > 0.5 ? 'medium' : 'low',
                        icon: trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '📊',
                        action: 'view-patterns',
                        actionLabel: (typeof i18nManager !== 'undefined') ? i18nManager.t('action.view_trend') : 'View Trend'
                    });
                });
            }
        } else if (Array.isArray(data)) {
            // Data is directly an array of insights
            insights = data;
        }

        // If no insights found, show a placeholder
        if (insights.length === 0) {
            insights = [{
                title: (typeof i18nManager !== 'undefined') ? i18nManager.t('insights.no_available') : 'No Insights Available',
                description: (typeof i18nManager !== 'undefined') ? i18nManager.t('insights.run_analysis') : 'Run repository analysis to generate insights',
                priority: 'low',
                icon: '💡',
                action: 'analyze-repository',
                actionLabel: (typeof i18nManager !== 'undefined') ? i18nManager.t('action.analyze_repository') : 'Analyze Now'
            }];
        }

        container.innerHTML = `
            <div class="insights-list">
                ${insights.map(insight => `
                    <div class="insight-item ${insight.priority}">
                        <div class="insight-icon">${insight.icon}</div>
                        <div class="insight-content">
                            <div class="insight-title">${insight.title}</div>
                            <div class="insight-description">${insight.description}</div>
                        </div>
                        <div class="insight-action">
                            <button class="interactive-button" data-action="${insight.action}">
                                ${insight.actionLabel}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    startRealTimeUpdates() {
        if (!this.realTimeUpdates) return;

        // WebSocket connection for real-time updates
        this.connectWebSocket();

        // Fallback polling
        this.updateTimer = setInterval(() => {
            this.loadDashboardData();
        }, this.updateInterval);
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;

        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
            console.log('Dashboard WebSocket connected');
            this.updateRealTimeIndicator(true);
        };

        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleRealTimeUpdate(data);
        };

        this.websocket.onclose = () => {
            console.log('Dashboard WebSocket disconnected');
            this.updateRealTimeIndicator(false);
            
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                if (this.realTimeUpdates) {
                    this.connectWebSocket();
                }
            }, 5000);
        };

        this.websocket.onerror = (error) => {
            console.error('Dashboard WebSocket error:', error);
        };
    }

    handleRealTimeUpdate(data) {
        switch (data.type) {
            case 'commit':
                this.handleNewCommit(data.payload);
                break;
            case 'analytics':
                this.updateStatsCards(data.payload);
                break;
            case 'insight':
                this.addNewInsight(data.payload);
                break;
        }
    }

    handleNewCommit(commit) {
        // Update commit trend chart
        const chart = this.charts.get('commitTrend');
        if (chart) {
            const today = new Date().toLocaleDateString();
            const lastLabel = chart.data.labels[chart.data.labels.length - 1];
            
            if (lastLabel === today) {
                chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1]++;
            } else {
                chart.data.labels.push(today);
                chart.data.datasets[0].data.push(1);
            }
            
            chart.update('none');
        }

        // Show notification
        this.showNotification(`New commit: ${commit.message}`, 'info');
    }

    toggleRealTimeUpdates(enabled) {
        this.realTimeUpdates = enabled;
        
        if (enabled) {
            this.startRealTimeUpdates();
        } else {
            if (this.websocket) {
                this.websocket.close();
            }
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
            }
        }
        
        this.updateRealTimeIndicator(enabled);
    }

    updateRealTimeIndicator(connected) {
        const indicator = document.querySelector('.real-time-indicator');
        if (!indicator) return;

        const dot = indicator.querySelector('.real-time-dot');
        const text = indicator.querySelector('.real-time-text');

        if (connected) {
            dot.style.background = '#68d391';
            if (text) text.textContent = 'Live';
        } else {
            dot.style.background = '#fc8181';
            if (text) text.textContent = 'Offline';
        }
    }

    showLoadingState() {
        const cards = document.querySelectorAll('.dashboard-card');
        cards.forEach(card => {
            card.classList.add('loading');
        });
        
        // Show chart loading indicators
        const loadingIndicators = document.querySelectorAll('.chart-loading');
        loadingIndicators.forEach(indicator => {
            indicator.style.display = 'flex';
        });
    }

    hideLoadingState() {
        const cards = document.querySelectorAll('.dashboard-card');
        cards.forEach(card => {
            card.classList.remove('loading');
        });
        
        // Hide chart loading indicators
        const loadingIndicators = document.querySelectorAll('.chart-loading');
        loadingIndicators.forEach(indicator => {
            indicator.style.display = 'none';
        });
    }

    showErrorState(message) {
        this.showNotification(`Error: ${message}`, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    refreshDashboard() {
        this.loadDashboardData();
        this.showNotification('Dashboard refreshed', 'success');
    }

    handleInteractiveButton(button) {
        console.log('Button clicked:', button);
        console.log('Button action:', button.dataset.action);
        
        const action = button.dataset.action;
        
        switch (action) {
            case 'analyze-repository':
                console.log('Analyze repository action triggered');
                this.analyzeRepository();
                break;
            case 'export-insights':
                console.log('Export insights action triggered');
                this.exportInsights();
                break;
            case 'view-patterns':
                console.log('View patterns action triggered');
                this.viewPatterns();
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    handleGraphControl(button) {
        const action = button.dataset.action;
        const svg = button.closest('.knowledge-graph-container').querySelector('svg');
        
        if (!svg) return;

        const zoom = d3.zoom();
        
        switch (action) {
            case 'zoom-in':
                d3.select(svg).transition().call(zoom.scaleBy, 1.5);
                break;
            case 'zoom-out':
                d3.select(svg).transition().call(zoom.scaleBy, 1 / 1.5);
                break;
            case 'reset':
                d3.select(svg).transition().call(zoom.transform, d3.zoomIdentity);
                break;
        }
    }

    async analyzeRepository() {
        try {
            const response = await fetch('/api/ades/analyze/comprehensive', {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Analysis failed');
            
            const result = await response.json();
            this.showNotification('Repository analysis started', 'success');
            
            // Refresh dashboard after analysis
            setTimeout(() => this.loadDashboardData(), 2000);
        } catch (error) {
            this.showNotification(`Analysis failed: ${error.message}`, 'error');
        }
    }

    async exportInsights() {
        try {
            const response = await fetch('/api/ades/insights/export');
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ades-insights.json';
            a.click();
            
            window.URL.revokeObjectURL(url);
            this.showNotification('Insights exported successfully', 'success');
        } catch (error) {
            this.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    viewPatterns() {
        // Navigate to patterns view
        window.location.hash = '#patterns';
    }

    // Test function to manually update charts with sample data
    testChartUpdate() {
        console.log('Testing chart updates...');
        
        // Test commit trend chart
        const commitChart = this.charts.get('commitTrend');
        if (commitChart) {
            console.log('Updating commit trend chart with test data');
            commitChart.data.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            commitChart.data.datasets[0].data = [10, 15, 8, 20, 12];
            commitChart.update();
        } else {
            console.warn('Commit trend chart not found');
        }
        
        // Test language distribution chart
        const langChart = this.charts.get('languageDistribution');
        if (langChart) {
            console.log('Updating language distribution chart with test data');
            langChart.data.labels = ['Go', 'JavaScript', 'CSS'];
            langChart.data.datasets[0].data = [50, 30, 20];
            langChart.update();
        } else {
            console.warn('Language distribution chart not found');
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.dashboard-container')) {
        // Add a small delay to ensure libraries are loaded
        setTimeout(() => {
            console.log('Checking library availability...');
            console.log('Chart.js available:', typeof Chart !== 'undefined');
            console.log('D3.js available:', typeof d3 !== 'undefined');
            
            window.adesDashboard = new ADESDashboard();
            
            // Add global test functions for debugging
            window.testCharts = () => {
                if (window.adesDashboard) {
                    window.adesDashboard.testChartUpdate();
                } else {
                    console.error('Dashboard not initialized');
                }
            };
            
            window.testDashboard = () => {
                if (window.adesDashboard) {
                    window.adesDashboard.testDashboard();
                } else {
                    console.error('Dashboard not initialized');
                }
            };
            
            console.log('Global test functions available: testCharts(), testDashboard()');
        }, 100);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ADESDashboard;
} 