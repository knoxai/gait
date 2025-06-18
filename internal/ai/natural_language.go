package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// NaturalLanguageProcessor handles natural language queries and responses
type NaturalLanguageProcessor struct {
	client          *http.Client
	apiKey          string
	baseURL         string
	model           string
	maxTokens       int
	temperature     float64
	systemPrompt    string
	conversationLog []ConversationEntry
}

// ConversationEntry represents a single conversation exchange
type ConversationEntry struct {
	ID        string    `json:"id"`
	Query     string    `json:"query"`
	Response  string    `json:"response"`
	Intent    string    `json:"intent"`
	Entities  []Entity  `json:"entities"`
	Timestamp time.Time `json:"timestamp"`
	Context   string    `json:"context"`
	Confidence float64  `json:"confidence"`
}

// Entity represents extracted entities from natural language
type Entity struct {
	Type       string  `json:"type"`
	Value      string  `json:"value"`
	Start      int     `json:"start"`
	End        int     `json:"end"`
	Confidence float64 `json:"confidence"`
}

// QueryIntent represents the classified intent of a query
type QueryIntent struct {
	Intent     string            `json:"intent"`
	Confidence float64           `json:"confidence"`
	Parameters map[string]string `json:"parameters"`
	Action     string            `json:"action"`
	Entities   []Entity          `json:"entities"`
}

// ChatRequest represents a request to the chat API
type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
	Stream      bool          `json:"stream,omitempty"`
}

// ChatMessage represents a single message in the conversation
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse represents the response from chat API
type ChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// QueryResult represents the result of processing a natural language query
type QueryResult struct {
	Query      string                 `json:"query"`
	Intent     *QueryIntent           `json:"intent"`
	Response   string                 `json:"response"`
	Data       map[string]interface{} `json:"data"`
	Suggestions []string              `json:"suggestions"`
	Confidence float64                `json:"confidence"`
	ProcessingTime time.Duration      `json:"processing_time"`
}

// NewNaturalLanguageProcessor creates a new natural language processor
func NewNaturalLanguageProcessor(apiKey, baseURL, model string) *NaturalLanguageProcessor {
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	if model == "" {
		model = "gpt-3.5-turbo"
	}

	systemPrompt := `You are ADES AI, an intelligent assistant for the AI Development Experience System. 
You help developers understand their codebase through natural language queries.

Your capabilities include:
- Analyzing commit history and patterns
- Finding similar code implementations
- Extracting reusable patterns
- Providing development insights
- Semantic code search
- Repository analytics

Always provide helpful, accurate, and actionable responses. When you don't have specific data, 
explain what information would be needed and suggest how to obtain it.

Respond in a conversational, helpful tone while being technically precise.`

	return &NaturalLanguageProcessor{
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
		apiKey:          apiKey,
		baseURL:         baseURL,
		model:           model,
		maxTokens:       2000,
		temperature:     0.7,
		systemPrompt:    systemPrompt,
		conversationLog: make([]ConversationEntry, 0),
	}
}

// ProcessQuery processes a natural language query and returns structured results
func (nlp *NaturalLanguageProcessor) ProcessQuery(ctx context.Context, query string, repositoryContext map[string]interface{}) (*QueryResult, error) {
	startTime := time.Now()

	// Classify intent
	intent, err := nlp.ClassifyIntent(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("intent classification failed: %w", err)
	}

	// Generate response based on intent and context
	response, data, err := nlp.GenerateResponse(ctx, query, intent, repositoryContext)
	if err != nil {
		return nil, fmt.Errorf("response generation failed: %w", err)
	}

	// Generate suggestions for follow-up queries
	suggestions := nlp.GenerateSuggestions(intent, repositoryContext)

	result := &QueryResult{
		Query:          query,
		Intent:         intent,
		Response:       response,
		Data:           data,
		Suggestions:    suggestions,
		Confidence:     intent.Confidence,
		ProcessingTime: time.Since(startTime),
	}

	// Log conversation
	nlp.logConversation(query, response, intent)

	return result, nil
}

// ClassifyIntent classifies the intent of a natural language query
func (nlp *NaturalLanguageProcessor) ClassifyIntent(ctx context.Context, query string) (*QueryIntent, error) {
	prompt := fmt.Sprintf(`Classify the following query into one of these intents and extract relevant parameters:

Intents:
- SEARCH_COMMITS: Search for specific commits or commit patterns
- FIND_SIMILAR: Find similar code implementations or patterns
- ANALYZE_PATTERNS: Analyze code patterns and reusability
- GET_INSIGHTS: Get development insights and analytics
- SEMANTIC_SEARCH: Perform semantic search across codebase
- REPOSITORY_STATS: Get repository statistics and metrics
- DEVELOPER_ANALYTICS: Analyze developer contributions and patterns
- CODE_QUALITY: Analyze code quality and technical debt
- TREND_ANALYSIS: Analyze development trends over time
- GENERAL_HELP: General help or unclear intent

Query: "%s"

Respond with JSON in this format:
{
  "intent": "INTENT_NAME",
  "confidence": 0.95,
  "parameters": {
    "key": "value"
  },
  "action": "specific_action_to_take",
  "entities": [
    {
      "type": "entity_type",
      "value": "entity_value",
      "confidence": 0.9
    }
  ]
}`, query)

	response, err := nlp.makeCompletionRequest(ctx, prompt)
	if err != nil {
		return nil, err
	}

	// Parse JSON response
	var intent QueryIntent
	if err := json.Unmarshal([]byte(response), &intent); err != nil {
		// Fallback to pattern matching if JSON parsing fails
		return nlp.fallbackIntentClassification(query), nil
	}

	return &intent, nil
}

// GenerateResponse generates a natural language response based on intent and context
func (nlp *NaturalLanguageProcessor) GenerateResponse(ctx context.Context, query string, intent *QueryIntent, repositoryContext map[string]interface{}) (string, map[string]interface{}, error) {
	// Create context-aware prompt
	contextStr := nlp.formatRepositoryContext(repositoryContext)
	
	prompt := fmt.Sprintf(`Based on the following repository context and user query, provide a helpful response:

Repository Context:
%s

User Query: "%s"
Detected Intent: %s
Intent Confidence: %.2f

Provide a conversational, helpful response that:
1. Directly addresses the user's question
2. Uses the repository context when relevant
3. Suggests specific actions or next steps
4. Explains any limitations or missing data

Response:`, contextStr, query, intent.Intent, intent.Confidence)

	response, err := nlp.makeCompletionRequest(ctx, prompt)
	if err != nil {
		return "", nil, err
	}

	// Extract structured data based on intent
	data := nlp.extractStructuredData(intent, repositoryContext)

	return response, data, nil
}

// GenerateSuggestions generates follow-up query suggestions
func (nlp *NaturalLanguageProcessor) GenerateSuggestions(intent *QueryIntent, repositoryContext map[string]interface{}) []string {
	suggestions := make([]string, 0)

	switch intent.Intent {
	case "SEARCH_COMMITS":
		suggestions = append(suggestions, 
			"Show me commits by a specific author",
			"Find commits that modified specific files",
			"Search for bug fix commits",
		)
	case "FIND_SIMILAR":
		suggestions = append(suggestions,
			"Find similar patterns in other files",
			"Show me related implementations",
			"What are the most reusable patterns?",
		)
	case "ANALYZE_PATTERNS":
		suggestions = append(suggestions,
			"Which patterns are used most frequently?",
			"Show me patterns with high reusability scores",
			"Analyze patterns by file type",
		)
	case "GET_INSIGHTS":
		suggestions = append(suggestions,
			"What are the main development trends?",
			"Show me code quality insights",
			"Analyze team productivity patterns",
		)
	case "REPOSITORY_STATS":
		suggestions = append(suggestions,
			"Show me language distribution",
			"What's the commit frequency over time?",
			"Who are the most active contributors?",
		)
	default:
		suggestions = append(suggestions,
			"What can you tell me about this repository?",
			"Show me recent development activity",
			"Find the most important code patterns",
		)
	}

	return suggestions
}

// ChatWithContext enables conversational interaction with repository context
func (nlp *NaturalLanguageProcessor) ChatWithContext(ctx context.Context, message string, repositoryContext map[string]interface{}) (string, error) {
	// Build conversation history
	messages := []ChatMessage{
		{Role: "system", Content: nlp.systemPrompt},
	}

	// Add repository context
	if len(repositoryContext) > 0 {
		contextMsg := fmt.Sprintf("Repository Context: %s", nlp.formatRepositoryContext(repositoryContext))
		messages = append(messages, ChatMessage{Role: "system", Content: contextMsg})
	}

	// Add conversation history (last 5 exchanges)
	historyStart := len(nlp.conversationLog) - 5
	if historyStart < 0 {
		historyStart = 0
	}

	for i := historyStart; i < len(nlp.conversationLog); i++ {
		entry := nlp.conversationLog[i]
		messages = append(messages, 
			ChatMessage{Role: "user", Content: entry.Query},
			ChatMessage{Role: "assistant", Content: entry.Response},
		)
	}

	// Add current message
	messages = append(messages, ChatMessage{Role: "user", Content: message})

	// Make chat request
	request := ChatRequest{
		Model:       nlp.model,
		Messages:    messages,
		MaxTokens:   nlp.maxTokens,
		Temperature: nlp.temperature,
	}

	response, err := nlp.makeChatRequest(ctx, request)
	if err != nil {
		return "", err
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("no response generated")
	}

	responseText := response.Choices[0].Message.Content

	// Log conversation
	nlp.logConversation(message, responseText, &QueryIntent{
		Intent:     "CHAT",
		Confidence: 1.0,
	})

	return responseText, nil
}

// ExtractEntities extracts named entities from text
func (nlp *NaturalLanguageProcessor) ExtractEntities(text string) []Entity {
	entities := make([]Entity, 0)

	// File extensions
	fileExtRegex := regexp.MustCompile(`\.(go|js|ts|py|java|cpp|c|h|css|html|json|xml|yml|yaml|md|txt)\b`)
	matches := fileExtRegex.FindAllStringIndex(text, -1)
	for _, match := range matches {
		entities = append(entities, Entity{
			Type:       "file_extension",
			Value:      text[match[0]:match[1]],
			Start:      match[0],
			End:        match[1],
			Confidence: 0.9,
		})
	}

	// Git hashes
	hashRegex := regexp.MustCompile(`\b[a-f0-9]{7,40}\b`)
	matches = hashRegex.FindAllStringIndex(text, -1)
	for _, match := range matches {
		entities = append(entities, Entity{
			Type:       "commit_hash",
			Value:      text[match[0]:match[1]],
			Start:      match[0],
			End:        match[1],
			Confidence: 0.8,
		})
	}

	// Function names (simple pattern)
	funcRegex := regexp.MustCompile(`\b[a-zA-Z_][a-zA-Z0-9_]*\(\)`)
	matches = funcRegex.FindAllStringIndex(text, -1)
	for _, match := range matches {
		entities = append(entities, Entity{
			Type:       "function",
			Value:      text[match[0]:match[1]],
			Start:      match[0],
			End:        match[1],
			Confidence: 0.7,
		})
	}

	// Dates
	dateRegex := regexp.MustCompile(`\b\d{4}-\d{2}-\d{2}\b`)
	matches = dateRegex.FindAllStringIndex(text, -1)
	for _, match := range matches {
		entities = append(entities, Entity{
			Type:       "date",
			Value:      text[match[0]:match[1]],
			Start:      match[0],
			End:        match[1],
			Confidence: 0.9,
		})
	}

	return entities
}

// GetConversationHistory returns the conversation history
func (nlp *NaturalLanguageProcessor) GetConversationHistory() []ConversationEntry {
	return nlp.conversationLog
}

// ClearConversationHistory clears the conversation history
func (nlp *NaturalLanguageProcessor) ClearConversationHistory() {
	nlp.conversationLog = make([]ConversationEntry, 0)
}

// makeCompletionRequest makes a completion request to the API
func (nlp *NaturalLanguageProcessor) makeCompletionRequest(ctx context.Context, prompt string) (string, error) {
	request := ChatRequest{
		Model: nlp.model,
		Messages: []ChatMessage{
			{Role: "user", Content: prompt},
		},
		MaxTokens:   nlp.maxTokens,
		Temperature: nlp.temperature,
	}

	response, err := nlp.makeChatRequest(ctx, request)
	if err != nil {
		return "", err
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("no response generated")
	}

	return response.Choices[0].Message.Content, nil
}

// makeChatRequest makes HTTP request to chat API
func (nlp *NaturalLanguageProcessor) makeChatRequest(ctx context.Context, request ChatRequest) (*ChatResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", nlp.baseURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+nlp.apiKey)

	resp, err := nlp.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return &response, nil
}

// fallbackIntentClassification provides pattern-based intent classification
func (nlp *NaturalLanguageProcessor) fallbackIntentClassification(query string) *QueryIntent {
	query = strings.ToLower(query)

	if strings.Contains(query, "search") || strings.Contains(query, "find") {
		if strings.Contains(query, "commit") {
			return &QueryIntent{Intent: "SEARCH_COMMITS", Confidence: 0.8}
		}
		if strings.Contains(query, "similar") || strings.Contains(query, "like") {
			return &QueryIntent{Intent: "FIND_SIMILAR", Confidence: 0.8}
		}
		return &QueryIntent{Intent: "SEMANTIC_SEARCH", Confidence: 0.7}
	}

	if strings.Contains(query, "pattern") {
		return &QueryIntent{Intent: "ANALYZE_PATTERNS", Confidence: 0.8}
	}

	if strings.Contains(query, "insight") || strings.Contains(query, "analyze") {
		return &QueryIntent{Intent: "GET_INSIGHTS", Confidence: 0.8}
	}

	if strings.Contains(query, "stats") || strings.Contains(query, "statistics") {
		return &QueryIntent{Intent: "REPOSITORY_STATS", Confidence: 0.8}
	}

	return &QueryIntent{Intent: "GENERAL_HELP", Confidence: 0.5}
}

// formatRepositoryContext formats repository context for prompts
func (nlp *NaturalLanguageProcessor) formatRepositoryContext(context map[string]interface{}) string {
	if len(context) == 0 {
		return "No repository context available."
	}

	var parts []string
	for key, value := range context {
		parts = append(parts, fmt.Sprintf("%s: %v", key, value))
	}

	return strings.Join(parts, "\n")
}

// extractStructuredData extracts structured data based on intent
func (nlp *NaturalLanguageProcessor) extractStructuredData(intent *QueryIntent, context map[string]interface{}) map[string]interface{} {
	data := make(map[string]interface{})
	
	data["intent"] = intent.Intent
	data["confidence"] = intent.Confidence
	data["parameters"] = intent.Parameters
	
	// Add relevant context data based on intent
	switch intent.Intent {
	case "REPOSITORY_STATS":
		if stats, ok := context["stats"]; ok {
			data["repository_stats"] = stats
		}
	case "SEARCH_COMMITS":
		if commits, ok := context["commits"]; ok {
			data["commits"] = commits
		}
	case "ANALYZE_PATTERNS":
		if patterns, ok := context["patterns"]; ok {
			data["patterns"] = patterns
		}
	}

	return data
}

// logConversation logs a conversation entry
func (nlp *NaturalLanguageProcessor) logConversation(query, response string, intent *QueryIntent) {
	entry := ConversationEntry{
		ID:        fmt.Sprintf("conv_%d", time.Now().Unix()),
		Query:     query,
		Response:  response,
		Intent:    intent.Intent,
		Entities:  nlp.ExtractEntities(query),
		Timestamp: time.Now(),
		Context:   "",
		Confidence: intent.Confidence,
	}

	nlp.conversationLog = append(nlp.conversationLog, entry)

	// Keep only last 50 entries
	if len(nlp.conversationLog) > 50 {
		nlp.conversationLog = nlp.conversationLog[len(nlp.conversationLog)-50:]
	}
} 