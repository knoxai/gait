package ai

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// ConversationalInterface provides a unified chat-based interface for all AI capabilities
type ConversationalInterface struct {
	nlp                *NaturalLanguageProcessor
	embeddings         *TransformerEmbeddings
	predictiveAnalytics *PredictiveAnalytics
	sessionID          string
	userContext        map[string]interface{}
	capabilities       []Capability
}

// Capability represents an AI capability available through the interface
type Capability struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Keywords    []string `json:"keywords"`
	Examples    []string `json:"examples"`
	Category    string   `json:"category"`
}

// ConversationSession represents a conversation session
type ConversationSession struct {
	ID          string                 `json:"id"`
	StartTime   time.Time              `json:"start_time"`
	LastActive  time.Time              `json:"last_active"`
	UserContext map[string]interface{} `json:"user_context"`
	History     []ConversationEntry    `json:"history"`
	Preferences map[string]string      `json:"preferences"`
}

// AIResponse represents a comprehensive AI response
type AIResponse struct {
	Text            string                 `json:"text"`
	Intent          string                 `json:"intent"`
	Confidence      float64                `json:"confidence"`
	Data            map[string]interface{} `json:"data"`
	Suggestions     []string               `json:"suggestions"`
	Actions         []SuggestedAction      `json:"actions"`
	Visualizations  []Visualization        `json:"visualizations"`
	ProcessingTime  time.Duration          `json:"processing_time"`
	CapabilitiesUsed []string              `json:"capabilities_used"`
}

// SuggestedAction represents an action the user can take
type SuggestedAction struct {
	Type        string                 `json:"type"`
	Label       string                 `json:"label"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
	URL         string                 `json:"url,omitempty"`
}

// Visualization represents data visualization suggestions
type Visualization struct {
	Type        string                 `json:"type"`
	Title       string                 `json:"title"`
	Data        map[string]interface{} `json:"data"`
	Config      map[string]interface{} `json:"config"`
	Description string                 `json:"description"`
}

// NewConversationalInterface creates a new conversational interface
func NewConversationalInterface(apiKey string) *ConversationalInterface {
	nlp := NewNaturalLanguageProcessor(apiKey, "", "")
	embeddings := NewTransformerEmbeddings(apiKey, "", "")
	predictiveAnalytics := NewPredictiveAnalytics()

	ci := &ConversationalInterface{
		nlp:                 nlp,
		embeddings:          embeddings,
		predictiveAnalytics: predictiveAnalytics,
		sessionID:           fmt.Sprintf("session_%d", time.Now().Unix()),
		userContext:         make(map[string]interface{}),
		capabilities:        defineCapabilities(),
	}

	return ci
}

// Chat processes a conversational query and returns a comprehensive response
func (ci *ConversationalInterface) Chat(ctx context.Context, message string, repositoryContext map[string]interface{}) (*AIResponse, error) {
	startTime := time.Now()

	// Update user context with repository context
	ci.updateUserContext(repositoryContext)

	// Process the query using NLP
	queryResult, err := ci.nlp.ProcessQuery(ctx, message, ci.userContext)
	if err != nil {
		return nil, fmt.Errorf("query processing failed: %w", err)
	}

	// Determine which capabilities to use based on intent
	capabilitiesUsed := ci.determineCapabilities(queryResult.Intent)

	// Execute appropriate AI capabilities
	response, err := ci.executeCapabilities(ctx, message, queryResult, capabilitiesUsed)
	if err != nil {
		return nil, fmt.Errorf("capability execution failed: %w", err)
	}

	// Generate suggested actions
	actions := ci.generateSuggestedActions(queryResult.Intent, response.Data)

	// Generate visualizations
	visualizations := ci.generateVisualizations(queryResult.Intent, response.Data)

	// Create comprehensive response
	aiResponse := &AIResponse{
		Text:             response.Response,
		Intent:           queryResult.Intent.Intent,
		Confidence:       queryResult.Confidence,
		Data:             response.Data,
		Suggestions:      queryResult.Suggestions,
		Actions:          actions,
		Visualizations:   visualizations,
		ProcessingTime:   time.Since(startTime),
		CapabilitiesUsed: capabilitiesUsed,
	}

	return aiResponse, nil
}

// GetCapabilities returns available AI capabilities
func (ci *ConversationalInterface) GetCapabilities() []Capability {
	return ci.capabilities
}

// GetCapabilityHelp returns help information for a specific capability
func (ci *ConversationalInterface) GetCapabilityHelp(capabilityName string) (string, error) {
	for _, capability := range ci.capabilities {
		if capability.Name == capabilityName {
			help := fmt.Sprintf("**%s**\n\n%s\n\n", capability.Name, capability.Description)
			help += "**Keywords:** " + strings.Join(capability.Keywords, ", ") + "\n\n"
			help += "**Examples:**\n"
			for _, example := range capability.Examples {
				help += "- " + example + "\n"
			}
			return help, nil
		}
	}
	return "", fmt.Errorf("capability not found: %s", capabilityName)
}

// StartSession starts a new conversation session
func (ci *ConversationalInterface) StartSession(userID string) *ConversationSession {
	session := &ConversationSession{
		ID:          fmt.Sprintf("session_%s_%d", userID, time.Now().Unix()),
		StartTime:   time.Now(),
		LastActive:  time.Now(),
		UserContext: make(map[string]interface{}),
		History:     make([]ConversationEntry, 0),
		Preferences: make(map[string]string),
	}

	ci.sessionID = session.ID
	return session
}

// SetUserPreference sets a user preference
func (ci *ConversationalInterface) SetUserPreference(key, value string) {
	if ci.userContext == nil {
		ci.userContext = make(map[string]interface{})
	}
	if ci.userContext["preferences"] == nil {
		ci.userContext["preferences"] = make(map[string]string)
	}
	preferences := ci.userContext["preferences"].(map[string]string)
	preferences[key] = value
}

// GetUserPreference gets a user preference
func (ci *ConversationalInterface) GetUserPreference(key string) (string, bool) {
	if ci.userContext == nil {
		return "", false
	}
	if preferences, ok := ci.userContext["preferences"].(map[string]string); ok {
		value, exists := preferences[key]
		return value, exists
	}
	return "", false
}

// ExplainCapability provides detailed explanation of how a capability works
func (ci *ConversationalInterface) ExplainCapability(ctx context.Context, capabilityName string) (string, error) {
	capability, exists := ci.findCapability(capabilityName)
	if !exists {
		return "", fmt.Errorf("capability not found: %s", capabilityName)
	}

	explanation := fmt.Sprintf(`# %s

## Overview
%s

## How it works
`, capability.Name, capability.Description)

	switch capability.Name {
	case "semantic_search":
		explanation += `Semantic search uses transformer-based embeddings to understand the meaning of your query and find relevant code, commits, or patterns. Unlike traditional keyword search, it understands context and intent.

**Process:**
1. Your query is converted into a high-dimensional vector representation
2. All repository content is similarly vectorized
3. Cosine similarity is used to find the most relevant matches
4. Results are ranked by semantic relevance`

	case "predictive_analytics":
		explanation += `Predictive analytics uses machine learning to forecast future trends and identify potential issues before they occur.

**Process:**
1. Historical data is analyzed to identify patterns
2. Features are extracted from code metrics, commit patterns, and team behavior
3. Machine learning models predict future outcomes
4. Confidence intervals and recommendations are provided`

	case "natural_language_query":
		explanation += `Natural language querying allows you to ask questions in plain English and get intelligent responses.

**Process:**
1. Your question is analyzed to understand intent and extract entities
2. Relevant repository data is gathered based on the intent
3. AI generates a contextual response with supporting data
4. Follow-up suggestions are provided for deeper exploration`

	case "pattern_analysis":
		explanation += `Pattern analysis identifies reusable code patterns and architectural insights across your codebase.

**Process:**
1. Code is parsed and analyzed for structural patterns
2. Similar implementations are grouped together
3. Reusability scores are calculated based on frequency and context
4. Recommendations are made for pattern extraction and reuse`
	}

	explanation += fmt.Sprintf(`

## Example Queries
%s

## Keywords
%s`, strings.Join(capability.Examples, "\n- "), strings.Join(capability.Keywords, ", "))

	return explanation, nil
}

// updateUserContext updates the user context with new information
func (ci *ConversationalInterface) updateUserContext(repositoryContext map[string]interface{}) {
	if ci.userContext == nil {
		ci.userContext = make(map[string]interface{})
	}

	// Merge repository context
	for key, value := range repositoryContext {
		ci.userContext[key] = value
	}

	// Update timestamp
	ci.userContext["last_updated"] = time.Now()
}

// determineCapabilities determines which AI capabilities to use based on intent
func (ci *ConversationalInterface) determineCapabilities(intent *QueryIntent) []string {
	capabilities := make([]string, 0)

	switch intent.Intent {
	case "SEMANTIC_SEARCH":
		capabilities = append(capabilities, "semantic_search", "embeddings")
	case "FIND_SIMILAR":
		capabilities = append(capabilities, "semantic_search", "embeddings", "pattern_analysis")
	case "ANALYZE_PATTERNS":
		capabilities = append(capabilities, "pattern_analysis", "embeddings")
	case "GET_INSIGHTS":
		capabilities = append(capabilities, "predictive_analytics", "pattern_analysis")
	case "REPOSITORY_STATS":
		capabilities = append(capabilities, "analytics")
	case "PREDICT_BUGS":
		capabilities = append(capabilities, "predictive_analytics")
	case "FORECAST_PRODUCTIVITY":
		capabilities = append(capabilities, "predictive_analytics")
	default:
		capabilities = append(capabilities, "natural_language_query")
	}

	return capabilities
}

// executeCapabilities executes the determined AI capabilities
func (ci *ConversationalInterface) executeCapabilities(ctx context.Context, message string, queryResult *QueryResult, capabilities []string) (*QueryResult, error) {
	enhancedData := make(map[string]interface{})

	// Copy original data
	for key, value := range queryResult.Data {
		enhancedData[key] = value
	}

	for _, capability := range capabilities {
		switch capability {
		case "semantic_search":
			if err := ci.executeSemanticSearch(ctx, message, enhancedData); err != nil {
				// Log error but continue with other capabilities
				continue
			}

		case "embeddings":
			if err := ci.executeEmbeddings(ctx, message, enhancedData); err != nil {
				continue
			}

		case "predictive_analytics":
			if err := ci.executePredictiveAnalytics(ctx, enhancedData); err != nil {
				continue
			}

		case "pattern_analysis":
			if err := ci.executePatternAnalysis(ctx, enhancedData); err != nil {
				continue
			}
		}
	}

	// Update query result with enhanced data
	queryResult.Data = enhancedData

	return queryResult, nil
}

// executeSemanticSearch executes semantic search capability
func (ci *ConversationalInterface) executeSemanticSearch(ctx context.Context, query string, data map[string]interface{}) error {
	// Get vectors from context if available
	if vectors, ok := ci.userContext["vectors"]; ok {
		if vectorList, ok := vectors.([]*SemanticVector); ok {
			results, err := ci.embeddings.SemanticSearch(ctx, query, vectorList, 10)
			if err != nil {
				return err
			}
			data["semantic_search_results"] = results
		}
	}
	return nil
}

// executeEmbeddings executes embeddings capability
func (ci *ConversationalInterface) executeEmbeddings(ctx context.Context, query string, data map[string]interface{}) error {
	vector, err := ci.embeddings.GenerateEmbedding(ctx, query)
	if err != nil {
		return err
	}
	data["query_embedding"] = vector
	return nil
}

// executePredictiveAnalytics executes predictive analytics capability
func (ci *ConversationalInterface) executePredictiveAnalytics(ctx context.Context, data map[string]interface{}) error {
	// Technical debt prediction
	if commitData, ok := ci.userContext["commit_data"].(map[string]interface{}); ok {
		debtPrediction, err := ci.predictiveAnalytics.PredictTechnicalDebt(commitData)
		if err == nil {
			data["technical_debt_prediction"] = debtPrediction
		}
	}

	// Bug prediction
	if codeMetrics, ok := ci.userContext["code_metrics"].(map[string]interface{}); ok {
		bugPrediction, err := ci.predictiveAnalytics.PredictBugLikelihood(codeMetrics)
		if err == nil {
			data["bug_prediction"] = bugPrediction
		}
	}

	return nil
}

// executePatternAnalysis executes pattern analysis capability
func (ci *ConversationalInterface) executePatternAnalysis(ctx context.Context, data map[string]interface{}) error {
	// Add pattern analysis results if available in context
	if patterns, ok := ci.userContext["patterns"]; ok {
		data["pattern_analysis"] = patterns
	}
	return nil
}

// generateSuggestedActions generates suggested actions based on intent and data
func (ci *ConversationalInterface) generateSuggestedActions(intent *QueryIntent, data map[string]interface{}) []SuggestedAction {
	actions := make([]SuggestedAction, 0)

	switch intent.Intent {
	case "SEMANTIC_SEARCH":
		actions = append(actions, SuggestedAction{
			Type:        "search",
			Label:       "Refine Search",
			Description: "Modify your search query for better results",
			Parameters:  map[string]interface{}{"type": "semantic"},
		})

	case "ANALYZE_PATTERNS":
		actions = append(actions, SuggestedAction{
			Type:        "analysis",
			Label:       "Extract Pattern",
			Description: "Extract this pattern for reuse",
			Parameters:  map[string]interface{}{"action": "extract"},
		})

	case "GET_INSIGHTS":
		actions = append(actions, SuggestedAction{
			Type:        "dashboard",
			Label:       "View Dashboard",
			Description: "See detailed insights in the dashboard",
			URL:         "/dashboard",
		})
	}

	return actions
}

// generateVisualizations generates visualization suggestions
func (ci *ConversationalInterface) generateVisualizations(intent *QueryIntent, data map[string]interface{}) []Visualization {
	visualizations := make([]Visualization, 0)

	switch intent.Intent {
	case "REPOSITORY_STATS":
		visualizations = append(visualizations, Visualization{
			Type:        "chart",
			Title:       "Repository Statistics",
			Data:        data,
			Config:      map[string]interface{}{"type": "bar"},
			Description: "Visual representation of repository metrics",
		})

	case "ANALYZE_PATTERNS":
		visualizations = append(visualizations, Visualization{
			Type:        "network",
			Title:       "Pattern Relationships",
			Data:        data,
			Config:      map[string]interface{}{"layout": "force"},
			Description: "Network graph showing pattern relationships",
		})
	}

	return visualizations
}

// findCapability finds a capability by name
func (ci *ConversationalInterface) findCapability(name string) (Capability, bool) {
	for _, capability := range ci.capabilities {
		if capability.Name == name {
			return capability, true
		}
	}
	return Capability{}, false
}

// defineCapabilities defines the available AI capabilities
func defineCapabilities() []Capability {
	return []Capability{
		{
			Name:        "semantic_search",
			Description: "Search code and commits using natural language understanding",
			Keywords:    []string{"search", "find", "semantic", "meaning", "similar"},
			Examples: []string{
				"Find commits related to authentication",
				"Search for error handling patterns",
				"Show me database connection code",
			},
			Category: "Search",
		},
		{
			Name:        "predictive_analytics",
			Description: "Predict technical debt, bugs, and productivity trends",
			Keywords:    []string{"predict", "forecast", "trend", "debt", "bugs", "productivity"},
			Examples: []string{
				"Predict technical debt accumulation",
				"What's the bug likelihood for this code?",
				"Forecast team productivity",
			},
			Category: "Analytics",
		},
		{
			Name:        "natural_language_query",
			Description: "Ask questions about your codebase in plain English",
			Keywords:    []string{"what", "how", "why", "when", "who", "explain"},
			Examples: []string{
				"What are the main patterns in this repository?",
				"How has code quality changed over time?",
				"Who are the most active contributors?",
			},
			Category: "Query",
		},
		{
			Name:        "pattern_analysis",
			Description: "Identify and analyze reusable code patterns",
			Keywords:    []string{"pattern", "reuse", "architecture", "structure", "design"},
			Examples: []string{
				"Show me reusable patterns",
				"Analyze architectural patterns",
				"Find similar implementations",
			},
			Category: "Analysis",
		},
		{
			Name:        "code_insights",
			Description: "Get intelligent insights about code quality and structure",
			Keywords:    []string{"insight", "quality", "structure", "metrics", "analysis"},
			Examples: []string{
				"Analyze code quality",
				"Show development insights",
				"What are the key metrics?",
			},
			Category: "Insights",
		},
	}
} 