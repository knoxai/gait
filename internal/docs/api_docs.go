package docs

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// APIDocsHandler provides API documentation
type APIDocsHandler struct {
	baseURL string
}

// NewAPIDocsHandler creates a new API documentation handler
func NewAPIDocsHandler(baseURL string) *APIDocsHandler {
	return &APIDocsHandler{
		baseURL: baseURL,
	}
}

// ServeAPIDocs serves the main API documentation page
func (h *APIDocsHandler) ServeAPIDocs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	html := h.generateAPIDocsHTML()
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(html))
}

// ServeOpenAPI serves the OpenAPI specification
func (h *APIDocsHandler) ServeOpenAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	spec := h.generateOpenAPISpec()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(spec)
}

// ServeSwaggerUI serves the Swagger UI interface
func (h *APIDocsHandler) ServeSwaggerUI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	html := h.generateSwaggerUIHTML()
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(html))
}

// generateAPIDocsHTML generates the main API documentation HTML
func (h *APIDocsHandler) generateAPIDocsHTML() string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADES API Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1e1e1e;
            color: #cccccc;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: #2d2d30;
            color: white;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3e3e42;
            flex-shrink: 0;
            min-height: 48px;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .header h1 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            color: #ffffff;
        }
        
        .header .controls {
            display: flex;
            gap: 8px;
        }
        
        .btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 11px;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #1177bb;
        }
        
        .btn.secondary {
            background: #5a5a5a;
        }
        
        .btn.secondary:hover {
            background: #6a6a6a;
        }
        
        .main-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        .docs-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .docs-header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .docs-header h2 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            color: #ffffff;
        }
        
        .docs-header p {
            font-size: 1.1rem;
            color: #8c8c8c;
            margin-bottom: 20px;
        }
        
        .api-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .api-card {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 20px;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }
        
        .api-card:hover {
            background: #2a2d2e;
            border-color: #007acc;
        }
        
        .api-card h3 {
            color: #ffffff;
            margin-bottom: 12px;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .api-card p {
            color: #cccccc;
            margin-bottom: 16px;
            line-height: 1.5;
            font-size: 14px;
        }
        
        .api-links {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .api-link {
            display: inline-block;
            padding: 8px 16px;
            background: #0e639c;
            color: white;
            text-decoration: none;
            border-radius: 2px;
            transition: all 0.2s ease;
            text-align: center;
            font-size: 12px;
            font-weight: 500;
        }
        
        .api-link:hover {
            background: #1177bb;
        }
        
        .api-link.secondary {
            background: #5a5a5a;
        }
        
        .api-link.secondary:hover {
            background: #6a6a6a;
        }
        
        .endpoints-section {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 24px;
            margin-bottom: 20px;
        }
        
        .endpoints-section h2 {
            color: #ffffff;
            margin-bottom: 20px;
            font-size: 1.5rem;
            border-bottom: 1px solid #3e3e42;
            padding-bottom: 8px;
        }
        
        .endpoint-group {
            margin-bottom: 24px;
        }
        
        .endpoint-group h3 {
            color: #ffffff;
            margin-bottom: 12px;
            font-size: 1.1rem;
        }
        
        .endpoint {
            display: flex;
            align-items: center;
            padding: 12px;
            margin-bottom: 8px;
            background: #2d2d30;
            border-radius: 4px;
            border-left: 3px solid #007acc;
            transition: all 0.2s ease;
        }
        
        .endpoint:hover {
            background: #3e3e42;
        }
        
        .method {
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 3px;
            margin-right: 12px;
            min-width: 60px;
            text-align: center;
            font-size: 11px;
            text-transform: uppercase;
        }
        
        .method.get { 
            background: #238636; 
            color: white; 
        }
        .method.post { 
            background: #0969da; 
            color: white; 
        }
        .method.put { 
            background: #d29922; 
            color: white; 
        }
        .method.delete { 
            background: #da3633; 
            color: white; 
        }
        
        .endpoint-path {
            font-family: 'Consolas', 'Monaco', monospace;
            flex: 1;
            margin-right: 12px;
            color: #ffffff;
            font-size: 13px;
        }
        
        .endpoint-desc {
            color: #8c8c8c;
            font-size: 12px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #3e3e42;
            color: #8c8c8c;
        }
        
        .footer p {
            margin-bottom: 4px;
            font-size: 12px;
        }
        
        /* Scrollbar styling to match git view */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #2d2d30;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #5a5a5a;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #6a6a6a;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                gap: 8px;
                padding: 12px;
            }
            
            .api-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
            
            .main-content {
                padding: 16px;
            }
            
            .endpoint {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .endpoint-path {
                margin-right: 0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>🤖 ADES API Documentation</h1>
        </div>
        <div class="controls">
            <a href="%s/dashboard" class="btn">🚀 Dashboard</a>
            <a href="%s" class="btn secondary">📋 Git View</a>
        </div>
    </div>
    
    <div class="main-content">
        <div class="docs-container">
            <div class="docs-header">
                <h2>API Documentation</h2>
                <p>AI Development Experience System - Comprehensive API Reference</p>
            </div>
            
            <div class="api-grid">
                <div class="api-card">
                    <h3>🔗 REST API</h3>
                    <p>Traditional REST endpoints for repository analysis, insights, and development patterns.</p>
                    <div class="api-links">
                        <a href="#rest-endpoints" class="api-link">View REST Endpoints</a>
                        <a href="%s/api/gait" class="api-link secondary" target="_blank">Test API Health</a>
                    </div>
                </div>
                
                <div class="api-card">
                    <h3>🚀 GraphQL API</h3>
                    <p>Powerful GraphQL interface for flexible data querying and real-time insights.</p>
                    <div class="api-links">
                        <a href="%s/graphiql" class="api-link" target="_blank">Open GraphiQL</a>
                        <a href="%s/graphql/schema" class="api-link secondary" target="_blank">View Schema</a>
                    </div>
                </div>
                
                <div class="api-card">
                    <h3>🔌 Webhooks</h3>
                    <p>Event-driven integrations for GitHub and custom webhook endpoints.</p>
                    <div class="api-links">
                        <a href="#webhook-endpoints" class="api-link">View Webhook Docs</a>
                        <a href="#webhook-examples" class="api-link secondary">Integration Examples</a>
                    </div>
                </div>
                
                <div class="api-card">
                    <h3>🌐 WebSocket</h3>
                    <p>Real-time dashboard updates and live development insights streaming.</p>
                    <div class="api-links">
                        <a href="#websocket-docs" class="api-link">WebSocket Documentation</a>
                        <a href="%s/dashboard" class="api-link secondary" target="_blank">Live Dashboard</a>
                    </div>
                </div>
                
                <div class="api-card">
                    <h3>📋 OpenAPI Spec</h3>
                    <p>Machine-readable API specification for automated tooling and client generation.</p>
                    <div class="api-links">
                        <a href="%s/docs/swagger" class="api-link" target="_blank">Swagger UI</a>
                        <a href="%s/docs/openapi.json" class="api-link secondary" target="_blank">OpenAPI JSON</a>
                    </div>
                </div>
                
                <div class="api-card">
                    <h3>🔧 MCP Integration</h3>
                    <p>Model Context Protocol for AI assistant integration and context provision.</p>
                    <div class="api-links">
                        <a href="#mcp-docs" class="api-link">MCP Documentation</a>
                        <a href="%s/mcp/tools" class="api-link secondary" target="_blank">Available Tools</a>
                    </div>
                </div>
            </div>
            
            <div class="endpoints-section" id="rest-endpoints">
                <h2>REST API Endpoints</h2>
                
                <div class="endpoint-group">
                    <h3>Repository Analysis</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="endpoint-path">/api/ades/analyze/comprehensive</span>
                        <span class="endpoint-desc">Trigger comprehensive repository analysis</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/analyze/progress</span>
                        <span class="endpoint-desc">Get analysis progress status</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>Dashboard & Metrics</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/dashboard</span>
                        <span class="endpoint-desc">Get comprehensive dashboard data</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/metrics</span>
                        <span class="endpoint-desc">Get detailed repository metrics</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>Semantic Analysis</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/semantic/search</span>
                        <span class="endpoint-desc">Semantic search across commits</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/semantic/trends</span>
                        <span class="endpoint-desc">Get semantic trends analysis</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/semantic/analysis/{hash}</span>
                        <span class="endpoint-desc">Get semantic analysis for specific commit</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>Patterns & Insights</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/patterns</span>
                        <span class="endpoint-desc">Get reusable code patterns</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/insights</span>
                        <span class="endpoint-desc">Get development insights</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/knowledge/stats</span>
                        <span class="endpoint-desc">Get knowledge graph statistics</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>Vector & Embeddings</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/vectors/{hash}</span>
                        <span class="endpoint-desc">Get vector embeddings for commit</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-path">/api/ades/similarity/{hash}</span>
                        <span class="endpoint-desc">Find similar commits using vectors</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>ADES API Documentation - Sprint 7 Enhanced Integration Platform</p>
                <p>Built with ❤️ for intelligent development experiences</p>
            </div>
        </div>
    </div>
</body>
</html>
`, h.baseURL, h.baseURL, h.baseURL, h.baseURL, h.baseURL, h.baseURL, h.baseURL, h.baseURL, h.baseURL)
}

// generateSwaggerUIHTML generates Swagger UI HTML
func (h *APIDocsHandler) generateSwaggerUIHTML() string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ADES API - Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1e1e1e;
            color: #cccccc;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        .header {
            background: #2d2d30;
            color: white;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3e3e42;
            flex-shrink: 0;
            min-height: 48px;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .header h1 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            color: #ffffff;
        }
        
        .header .controls {
            display: flex;
            gap: 8px;
        }
        
        .btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 11px;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn:hover {
            background: #1177bb;
        }
        
        .btn.secondary {
            background: #5a5a5a;
        }
        
        .btn.secondary:hover {
            background: #6a6a6a;
        }
        
        #swagger-ui {
            flex: 1;
            overflow-y: auto;
        }
        
        /* Dark theme overrides for Swagger UI */
        .swagger-ui {
            background: #1e1e1e !important;
            color: #cccccc !important;
        }
        
        .swagger-ui .topbar {
            display: none !important;
        }
        
        .swagger-ui .wrapper {
            padding: 20px !important;
        }
        
        .swagger-ui .info {
            background: #252526 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
            padding: 20px !important;
            margin-bottom: 20px !important;
        }
        
        .swagger-ui .info .title {
            color: #159994 !important;
            font-size: 2rem !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .info .description {
            color: #159994 !important;
            font-size: 1rem !important;
            line-height: 1.6 !important;
        }
        
        .swagger-ui .info .description p {
            color: #159994 !important;
            margin-bottom: 8px !important;
        }
        
        .swagger-ui .scheme-container {
            background: #252526 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
            padding: 16px !important;
            margin-bottom: 20px !important;
        }
        
        .swagger-ui .scheme-container .schemes-title {
            color: #159994 !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .scheme-container label {
            color: #159994 !important;
        }
        
        .swagger-ui .opblock-tag {
            background: #252526 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
            margin-bottom: 16px !important;
        }
        
        .swagger-ui .opblock-tag-section {
            background: transparent !important;
        }
        
        .swagger-ui .opblock-tag .opblock-tag-section h3 {
            color: #159994 !important;
            background: #2d2d30 !important;
            border-bottom: 1px solid #3e3e42 !important;
            margin: 0 !important;
            padding: 12px 16px !important;
        }
        
        .swagger-ui .opblock-tag .opblock-tag-section h3:after {
            color: #159994 !important;
        }
        
        .swagger-ui .opblock {
            background: #2d2d30 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
            margin-bottom: 8px !important;
        }
        
        .swagger-ui .opblock .opblock-summary {
            background: transparent !important;
            border-bottom: 1px solid #3e3e42 !important;
        }
        
        .swagger-ui .opblock .opblock-summary-description {
            color: #159994 !important;
            font-weight: 500 !important;
        }
        
        .swagger-ui .opblock .opblock-summary-path {
            color: #159994 !important;
            font-family: 'Consolas', 'Monaco', monospace !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .opblock .opblock-summary-path__deprecated {
            color: #f85149 !important;
        }
        
        .swagger-ui .opblock-summary-control:focus {
            outline: 2px solid #159994 !important;
        }
        
        .swagger-ui .opblock.opblock-get {
            border-left: 3px solid #238636 !important;
        }
        
        .swagger-ui .opblock.opblock-post {
            border-left: 3px solid #0969da !important;
        }
        
        .swagger-ui .opblock.opblock-put {
            border-left: 3px solid #d29922 !important;
        }
        
        .swagger-ui .opblock.opblock-delete {
            border-left: 3px solid #da3633 !important;
        }
        
        .swagger-ui .opblock .opblock-summary-method {
            background: #238636 !important;
            color: white !important;
            text-transform: uppercase !important;
            font-weight: bold !important;
            font-size: 11px !important;
            border-radius: 3px !important;
        }
        
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
            background: #0969da !important;
        }
        
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
            background: #d29922 !important;
        }
        
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
            background: #da3633 !important;
        }
        
        .swagger-ui .opblock .opblock-section-header {
            background: #252526 !important;
            color: #159994 !important;
            border-bottom: 1px solid #3e3e42 !important;
        }
        
        .swagger-ui .opblock .opblock-body {
            background: #1e1e1e !important;
        }
        
        .swagger-ui .parameters-container {
            background: #252526 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
            padding: 16px !important;
        }
        
        .swagger-ui .parameter__name {
            color: #159994 !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .parameter__type {
            color: #159994 !important;
            font-weight: 500 !important;
        }
        
        .swagger-ui .parameter__description {
            color: #159994 !important;
            line-height: 1.5 !important;
        }
        
        .swagger-ui .parameter__name.required:after {
            color: #f85149 !important;
        }
        
        .swagger-ui .parameter-item {
            border-bottom: 1px solid #3e3e42 !important;
        }
        
        .swagger-ui .parameter-item:last-child {
            border-bottom: none !important;
        }
        
        .swagger-ui .btn {
            background: #0e639c !important;
            color: white !important;
            border: none !important;
            border-radius: 2px !important;
            font-size: 12px !important;
        }
        
        .swagger-ui .btn:hover {
            background: #1177bb !important;
        }
        
        .swagger-ui .btn.execute {
            background: #238636 !important;
        }
        
        .swagger-ui .btn.execute:hover {
            background: #2ea043 !important;
        }
        
        .swagger-ui .responses-wrapper {
            background: #252526 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
            padding: 16px !important;
        }
        
        .swagger-ui .response {
            background: #2d2d30 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
        }
        
        .swagger-ui .response-col_status {
            color: #159994 !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .response-col_description {
            color: #159994 !important;
            line-height: 1.5 !important;
        }
        
        .swagger-ui .response-col_description p {
            color: #159994 !important;
        }
        
        .swagger-ui .model-container {
            background: #252526 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
        }
        
        .swagger-ui .model {
            color: #159994 !important;
            font-family: 'Consolas', 'Monaco', monospace !important;
        }
        
        .swagger-ui .model .property {
            color: #159994 !important;
            font-weight: 500 !important;
        }
        
        .swagger-ui .model .property-type {
            color: #159994 !important;
            font-weight: 500 !important;
        }
        
        .swagger-ui .model-toggle {
            color: #159994 !important;
            font-weight: 500 !important;
        }
        
        .swagger-ui .model-title {
            color: #159994 !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .model-deprecated-warning {
            color: #f85149 !important;
        }
        
        .swagger-ui textarea {
            background: #3c3c3c !important;
            border: 1px solid #5a5a5a !important;
            color: #ffffff !important;
            border-radius: 3px !important;
            font-family: 'Consolas', 'Monaco', monospace !important;
            padding: 8px !important;
        }
        
        .swagger-ui textarea:focus {
            border-color: #159994 !important;
            outline: none !important;
            box-shadow: 0 0 0 2px rgba(21, 153, 148, 0.2) !important;
        }
        
        .swagger-ui input[type="text"],
        .swagger-ui input[type="password"],
        .swagger-ui input[type="email"],
        .swagger-ui input[type="number"] {
            background: #3c3c3c !important;
            border: 1px solid #5a5a5a !important;
            color: #ffffff !important;
            border-radius: 3px !important;
            padding: 6px 8px !important;
        }
        
        .swagger-ui input[type="text"]:focus,
        .swagger-ui input[type="password"]:focus,
        .swagger-ui input[type="email"]:focus,
        .swagger-ui input[type="number"]:focus {
            border-color: #159994 !important;
            outline: none !important;
            box-shadow: 0 0 0 2px rgba(21, 153, 148, 0.2) !important;
        }
        
        .swagger-ui select {
            background: #3c3c3c !important;
            border: 1px solid #5a5a5a !important;
            color: #ffffff !important;
            border-radius: 3px !important;
            padding: 6px 8px !important;
        }
        
        .swagger-ui select:focus {
            border-color: #159994 !important;
            outline: none !important;
            box-shadow: 0 0 0 2px rgba(21, 153, 148, 0.2) !important;
        }
        
        .swagger-ui .highlight-code {
            background: #2d2d30 !important;
            color: #e1e4e8 !important;
            border: 1px solid #3e3e42 !important;
            border-radius: 4px !important;
            padding: 12px !important;
        }
        
        .swagger-ui .microlight {
            background: #2d2d30 !important;
            color: #e1e4e8 !important;
            font-family: 'Consolas', 'Monaco', monospace !important;
        }
        
        /* Additional text color improvements */
        .swagger-ui .opblock-description-wrapper p,
        .swagger-ui .opblock-description-wrapper div,
        .swagger-ui .opblock-external-docs-wrapper,
        .swagger-ui .opblock-title_normal {
            color: #159994 !important;
        }
        
        .swagger-ui .opblock-section-header h4,
        .swagger-ui .opblock-section-header label {
            color: #159994 !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .tab li {
            color: #159994 !important;
        }
        
        .swagger-ui .tab li.active {
            color: #159994 !important;
            font-weight: 600 !important;
        }
        
        .swagger-ui .opblock-body pre {
            background: #2d2d30 !important;
            border: 1px solid #3e3e42 !important;
            color: #159994 !important;
        }
        
        .swagger-ui .copy-to-clipboard {
            background: #159994 !important;
            color: white !important;
        }
        
        .swagger-ui .copy-to-clipboard:hover {
            background: #0d7a75 !important;
        }
        
        .swagger-ui .loading-container {
            color: #159994 !important;
        }
        
        .swagger-ui .errors-wrapper {
            background: #2d2d30 !important;
            border: 1px solid #f85149 !important;
            color: #f85149 !important;
        }
        
        .swagger-ui .errors-wrapper .error-wrapper {
            color: #f85149 !important;
        }
        
        .swagger-ui table {
            border-color: #3e3e42 !important;
        }
        
        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
            background: #2d2d30 !important;
            color: #159994 !important;
            border-color: #3e3e42 !important;
        }
        
        .swagger-ui table tbody tr td {
            color: #159994 !important;
            border-color: #3e3e42 !important;
        }
        
        /* Arrow and expand/collapse indicators */
        .swagger-ui .opblock-summary-control:after,
        .swagger-ui .expand-operation:after,
        .swagger-ui .collapse-operation:after {
            color: #159994 !important;
        }
        
        .swagger-ui .opblock-tag-section .opblock-tag h3:after {
            color: #159994 !important;
        }
        
        .swagger-ui .model-toggle:after {
            color: #159994 !important;
        }
        
        /* Specific arrow styling for expand/collapse */
        .swagger-ui .opblock-summary-control svg,
        .swagger-ui .opblock-summary-control svg path,
        .swagger-ui .opblock-summary-control svg polygon {
            fill: #159994 !important;
            stroke: #159994 !important;
        }
        
        .swagger-ui .opblock-tag h3 svg,
        .swagger-ui .opblock-tag h3 svg path,
        .swagger-ui .opblock-tag h3 svg polygon {
            fill: #159994 !important;
            stroke: #159994 !important;
        }
        
        .swagger-ui .model-toggle svg,
        .swagger-ui .model-toggle svg path,
        .swagger-ui .model-toggle svg polygon {
            fill: #159994 !important;
            stroke: #159994 !important;
        }
        
        /* CSS arrows if using pseudo-elements */
        .swagger-ui .opblock-summary-control::before,
        .swagger-ui .opblock-summary-control::after {
            border-color: #159994 !important;
        }
        
        .swagger-ui .opblock-tag h3::before,
        .swagger-ui .opblock-tag h3::after {
            border-color: #159994 !important;
        }
        
        .swagger-ui .model-hint {
            color: #159994 !important;
        }
        
        /* Additional UI elements */
        .swagger-ui .servers-title,
        .swagger-ui .servers > label {
            color: #159994 !important;
        }
        
        .swagger-ui .auth-wrapper .auth-container h4,
        .swagger-ui .auth-wrapper .auth-container label {
            color: #159994 !important;
        }
        
        .swagger-ui .download-url-wrapper .download-url-button {
            background: #159994 !important;
            color: white !important;
        }
        
        .swagger-ui .download-url-wrapper .download-url-button:hover {
            background: #0d7a75 !important;
        }
        
        /* Comprehensive arrow and icon styling */
        .swagger-ui .opblock-summary-control,
        .swagger-ui .opblock-summary-control:hover,
        .swagger-ui .opblock-summary-control:focus {
            color: #159994 !important;
        }
        
        .swagger-ui .opblock-tag button,
        .swagger-ui .opblock-tag button:hover,
        .swagger-ui .opblock-tag button:focus {
            color: #159994 !important;
        }
        
        .swagger-ui .opblock-tag button svg {
            fill: #159994 !important;
        }
        
        .swagger-ui .expand-methods svg,
        .swagger-ui .expand-methods svg path {
            fill: #159994 !important;
            stroke: #159994 !important;
        }
        
        /* Ensure all chevron/arrow icons are teal */
        .swagger-ui svg.arrow,
        .swagger-ui .arrow svg,
        .swagger-ui [class*="arrow"] svg,
        .swagger-ui [class*="chevron"] svg {
            fill: #159994 !important;
            stroke: #159994 !important;
        }
        
        /* Force override for any remaining dark arrows */
        .swagger-ui * svg path[fill="#3b4151"],
        .swagger-ui * svg path[fill="#000"],
        .swagger-ui * svg path[fill="#333"],
        .swagger-ui * svg polygon[fill="#3b4151"],
        .swagger-ui * svg polygon[fill="#000"],
        .swagger-ui * svg polygon[fill="#333"] {
            fill: #159994 !important;
        }
        
        /* Schema/Model section arrows */
        .swagger-ui .model-box-control,
        .swagger-ui .model-box-control svg,
        .swagger-ui .model-box-control svg path {
            fill: #159994 !important;
            stroke: #159994 !important;
            color: #159994 !important;
        }
        
        .swagger-ui .model .model-toggle,
        .swagger-ui .model .model-toggle svg,
        .swagger-ui .model .model-toggle svg path {
            fill: #159994 !important;
            stroke: #159994 !important;
            color: #159994 !important;
        }
        
        /* JSON schema expand/collapse arrows */
        .swagger-ui .property-row .property-row-control,
        .swagger-ui .property-row .property-row-control svg,
        .swagger-ui .property-row .property-row-control svg path {
            fill: #159994 !important;
            stroke: #159994 !important;
            color: #159994 !important;
        }
        
        /* Braces and brackets in JSON schema */
        .swagger-ui .model .brace-open,
        .swagger-ui .model .brace-close,
        .swagger-ui .model .bracket-open,
        .swagger-ui .model .bracket-close {
            color: #159994 !important;
        }
        
        /* Any remaining toggle controls */
        .swagger-ui .toggle,
        .swagger-ui .toggle svg,
        .swagger-ui .toggle svg path,
        .swagger-ui [class*="toggle"] svg,
        .swagger-ui [class*="toggle"] svg path {
            fill: #159994 !important;
            stroke: #159994 !important;
            color: #159994 !important;
        }
        
        /* Universal arrow override - catch all */
        .swagger-ui svg[class*="arrow"],
        .swagger-ui svg[id*="arrow"],
        .swagger-ui .arrow,
        .swagger-ui [aria-label*="expand"],
        .swagger-ui [aria-label*="collapse"] {
            fill: #159994 !important;
            stroke: #159994 !important;
            color: #159994 !important;
        }
        
        .swagger-ui svg[class*="arrow"] path,
        .swagger-ui svg[id*="arrow"] path,
        .swagger-ui .arrow path,
        .swagger-ui [aria-label*="expand"] path,
        .swagger-ui [aria-label*="collapse"] path {
            fill: #159994 !important;
            stroke: #159994 !important;
        }
        
        /* Scrollbar styling to match git view */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #2d2d30;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #5a5a5a;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #6a6a6a;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                gap: 8px;
                padding: 12px;
            }
            
            .swagger-ui .wrapper {
                padding: 16px !important;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>📋 ADES API - Swagger UI</h1>
        </div>
        <div class="controls">
            <a href="%s/docs" class="btn secondary">📖 API Docs</a>
            <a href="%s/dashboard" class="btn">🚀 Dashboard</a>
            <a href="%s" class="btn secondary">📋 Git View</a>
        </div>
    </div>
    
    <div id="swagger-ui"></div>
    
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '%s/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                docExpansion: "list",
                defaultModelsExpandDepth: 2,
                defaultModelExpandDepth: 2,
                tryItOutEnabled: true
            });
        };
    </script>
</body>
</html>`, h.baseURL, h.baseURL, h.baseURL, h.baseURL)
}

// generateOpenAPISpec generates the OpenAPI specification
func (h *APIDocsHandler) generateOpenAPISpec() map[string]interface{} {
	return map[string]interface{}{
		"openapi": "3.0.3",
		"info": map[string]interface{}{
			"title":       "ADES API",
			"description": "AI Development Experience System - Comprehensive API for intelligent development insights",
			"version":     "1.0.0",
			"contact": map[string]interface{}{
				"name":  "ADES Team",
				"email": "support@ades.dev",
			},
			"license": map[string]interface{}{
				"name": "MIT",
				"url":  "https://opensource.org/licenses/MIT",
			},
		},
		"servers": []map[string]interface{}{
			{
				"url":         h.baseURL,
				"description": "ADES API Server",
			},
		},
		"paths": map[string]interface{}{
			"/api/ades/dashboard": map[string]interface{}{
				"get": map[string]interface{}{
					"summary":     "Get Dashboard Data",
					"description": "Retrieve comprehensive dashboard data including analytics, insights, and metrics",
					"tags":        []string{"Dashboard"},
					"responses": map[string]interface{}{
						"200": map[string]interface{}{
							"description": "Dashboard data retrieved successfully",
							"content": map[string]interface{}{
								"application/json": map[string]interface{}{
									"schema": map[string]interface{}{
										"type": "object",
										"properties": map[string]interface{}{
											"analytics": map[string]interface{}{
												"type": "object",
											},
											"insights": map[string]interface{}{
												"type": "object",
											},
											"patterns": map[string]interface{}{
												"type": "array",
											},
											"semantics": map[string]interface{}{
												"type": "object",
											},
										},
									},
								},
							},
						},
					},
				},
			},
			"/api/ades/analyze/comprehensive": map[string]interface{}{
				"post": map[string]interface{}{
					"summary":     "Analyze Repository",
					"description": "Trigger comprehensive repository analysis",
					"tags":        []string{"Analysis"},
					"responses": map[string]interface{}{
						"200": map[string]interface{}{
							"description": "Analysis started successfully",
						},
					},
				},
			},
			"/api/ades/semantic/search": map[string]interface{}{
				"get": map[string]interface{}{
					"summary":     "Semantic Search",
					"description": "Search commits using semantic analysis",
					"tags":        []string{"Semantic"},
					"parameters": []map[string]interface{}{
						{
							"name":        "q",
							"in":          "query",
							"description": "Search query",
							"required":    true,
							"schema": map[string]interface{}{
								"type": "string",
							},
						},
						{
							"name":        "limit",
							"in":          "query",
							"description": "Number of results to return",
							"schema": map[string]interface{}{
								"type":    "integer",
								"default": 10,
							},
						},
					},
					"responses": map[string]interface{}{
						"200": map[string]interface{}{
							"description": "Search results",
						},
					},
				},
			},
			"/graphql": map[string]interface{}{
				"post": map[string]interface{}{
					"summary":     "GraphQL Query",
					"description": "Execute GraphQL queries and mutations",
					"tags":        []string{"GraphQL"},
					"requestBody": map[string]interface{}{
						"required": true,
						"content": map[string]interface{}{
							"application/json": map[string]interface{}{
								"schema": map[string]interface{}{
									"type": "object",
									"properties": map[string]interface{}{
										"query": map[string]interface{}{
											"type": "string",
										},
										"variables": map[string]interface{}{
											"type": "object",
										},
										"operationName": map[string]interface{}{
											"type": "string",
										},
									},
									"required": []string{"query"},
								},
							},
						},
					},
					"responses": map[string]interface{}{
						"200": map[string]interface{}{
							"description": "GraphQL response",
						},
					},
				},
			},
			"/webhooks/github": map[string]interface{}{
				"post": map[string]interface{}{
					"summary":     "GitHub Webhook",
					"description": "Handle GitHub webhook events",
					"tags":        []string{"Webhooks"},
					"responses": map[string]interface{}{
						"200": map[string]interface{}{
							"description": "Webhook processed successfully",
						},
					},
				},
			},
		},
		"components": map[string]interface{}{
			"schemas": map[string]interface{}{
				"Error": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"error": map[string]interface{}{
							"type": "string",
						},
						"message": map[string]interface{}{
							"type": "string",
						},
					},
				},
			},
		},
		"tags": []map[string]interface{}{
			{
				"name":        "Dashboard",
				"description": "Dashboard and metrics endpoints",
			},
			{
				"name":        "Analysis",
				"description": "Repository analysis endpoints",
			},
			{
				"name":        "Semantic",
				"description": "Semantic analysis and search",
			},
			{
				"name":        "GraphQL",
				"description": "GraphQL API interface",
			},
			{
				"name":        "Webhooks",
				"description": "Webhook integration endpoints",
			},
		},
	}
} 