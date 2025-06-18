package ai

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"
)

// AIService integrates all AI capabilities into the ADES system
type AIService struct {
	conversationalInterface *ConversationalInterface
	transformerEmbeddings   *TransformerEmbeddings
	nlpProcessor           *NaturalLanguageProcessor
	predictiveAnalytics    *PredictiveAnalytics
	
	// Configuration
	config     *AIConfig
	enabled    bool
	apiKey     string
	
	// State management
	sessions   map[string]*ConversationSession
	vectors    map[string][]*SemanticVector
	models     map[string]*PredictionModel
	
	// Synchronization
	mu sync.RWMutex
}

// AIConfig holds configuration for AI services
type AIConfig struct {
	OpenAIAPIKey        string `json:"openai_api_key"`
	OpenAIBaseURL       string `json:"openai_base_url"`
	EmbeddingModel      string `json:"embedding_model"`
	ChatModel           string `json:"chat_model"`
	MaxTokens           int    `json:"max_tokens"`
	Temperature         float64 `json:"temperature"`
	EnablePredictive    bool   `json:"enable_predictive"`
	EnableConversational bool   `json:"enable_conversational"`
	CacheEmbeddings     bool   `json:"cache_embeddings"`
	VectorCacheSize     int    `json:"vector_cache_size"`
}

// AICapabilityStatus represents the status of AI capabilities
type AICapabilityStatus struct {
	Name        string    `json:"name"`
	Enabled     bool      `json:"enabled"`
	Status      string    `json:"status"`
	LastUsed    time.Time `json:"last_used"`
	UsageCount  int       `json:"usage_count"`
	ErrorCount  int       `json:"error_count"`
	Performance struct {
		AvgResponseTime time.Duration `json:"avg_response_time"`
		SuccessRate     float64       `json:"success_rate"`
	} `json:"performance"`
}

// AIMetrics holds metrics about AI service usage
type AIMetrics struct {
	TotalQueries        int                            `json:"total_queries"`
	SuccessfulQueries   int                            `json:"successful_queries"`
	FailedQueries       int                            `json:"failed_queries"`
	AvgResponseTime     time.Duration                  `json:"avg_response_time"`
	CapabilityStatus    map[string]*AICapabilityStatus `json:"capability_status"`
	EmbeddingsGenerated int                            `json:"embeddings_generated"`
	PredictionsMade     int                            `json:"predictions_made"`
	ConversationsSessions int                          `json:"conversation_sessions"`
	LastReset           time.Time                      `json:"last_reset"`
}

// NewAIService creates a new AI service instance
func NewAIService() *AIService {
	config := loadAIConfig()
	
	service := &AIService{
		config:   config,
		enabled:  config.OpenAIAPIKey != "",
		apiKey:   config.OpenAIAPIKey,
		sessions: make(map[string]*ConversationSession),
		vectors:  make(map[string][]*SemanticVector),
		models:   make(map[string]*PredictionModel),
	}
	
	if service.enabled {
		service.initializeComponents()
		log.Println("AI Service initialized with advanced capabilities")
	} else {
		log.Println("AI Service disabled - no API key provided")
	}
	
	return service
}

// IsEnabled returns whether AI services are enabled
func (ai *AIService) IsEnabled() bool {
	return ai.enabled
}

// GetCapabilities returns available AI capabilities
func (ai *AIService) GetCapabilities() []Capability {
	if !ai.enabled {
		return []Capability{}
	}
	return ai.conversationalInterface.GetCapabilities()
}

// Chat processes a conversational query
func (ai *AIService) Chat(ctx context.Context, sessionID, message string, repositoryContext map[string]interface{}) (*AIResponse, error) {
	if !ai.enabled {
		return nil, fmt.Errorf("AI services not enabled")
	}
	
	ai.mu.Lock()
	defer ai.mu.Unlock()
	
	// Get or create session
	session, exists := ai.sessions[sessionID]
	if !exists {
		session = ai.conversationalInterface.StartSession(sessionID)
		ai.sessions[sessionID] = session
	}
	
	// Update session activity
	session.LastActive = time.Now()
	
	// Process the chat
	response, err := ai.conversationalInterface.Chat(ctx, message, repositoryContext)
	if err != nil {
		return nil, fmt.Errorf("chat processing failed: %w", err)
	}
	
	// Log conversation in session
	entry := ConversationEntry{
		ID:        fmt.Sprintf("entry_%d", time.Now().Unix()),
		Query:     message,
		Response:  response.Text,
		Intent:    response.Intent,
		Timestamp: time.Now(),
		Confidence: response.Confidence,
	}
	session.History = append(session.History, entry)
	
	return response, nil
}

// GenerateEmbeddings generates embeddings for repository content
func (ai *AIService) GenerateEmbeddings(ctx context.Context, texts []string, metadata map[string]string) ([]*SemanticVector, error) {
	if !ai.enabled {
		return nil, fmt.Errorf("AI services not enabled")
	}
	
	vectors, err := ai.transformerEmbeddings.GenerateEmbeddings(ctx, texts)
	if err != nil {
		return nil, fmt.Errorf("embedding generation failed: %w", err)
	}
	
	// Add metadata to vectors
	for i, vector := range vectors {
		for key, value := range metadata {
			vector.Metadata[key] = value
		}
		vector.Metadata["index"] = fmt.Sprintf("%d", i)
	}
	
	// Cache vectors if enabled
	if ai.config.CacheEmbeddings {
		cacheKey := fmt.Sprintf("embeddings_%d", time.Now().Unix())
		ai.vectors[cacheKey] = vectors
		
		// Limit cache size
		if len(ai.vectors) > ai.config.VectorCacheSize {
			ai.cleanupVectorCache()
		}
	}
	
	return vectors, nil
}

// SemanticSearch performs semantic search across cached vectors
func (ai *AIService) SemanticSearch(ctx context.Context, query string, limit int) ([]*SimilarityResult, error) {
	if !ai.enabled {
		return nil, fmt.Errorf("AI services not enabled")
	}
	
	// Collect all cached vectors
	allVectors := make([]*SemanticVector, 0)
	ai.mu.RLock()
	for _, vectors := range ai.vectors {
		allVectors = append(allVectors, vectors...)
	}
	ai.mu.RUnlock()
	
	if len(allVectors) == 0 {
		return nil, fmt.Errorf("no vectors available for search")
	}
	
	// Perform semantic search
	results, err := ai.transformerEmbeddings.SemanticSearch(ctx, query, allVectors, limit)
	if err != nil {
		return nil, fmt.Errorf("semantic search failed: %w", err)
	}
	
	return results, nil
}

// PredictTechnicalDebt predicts technical debt for repository
func (ai *AIService) PredictTechnicalDebt(ctx context.Context, repositoryData map[string]interface{}) (*TechnicalDebtPrediction, error) {
	if !ai.enabled || !ai.config.EnablePredictive {
		return nil, fmt.Errorf("predictive analytics not enabled")
	}
	
	prediction, err := ai.predictiveAnalytics.PredictTechnicalDebt(repositoryData)
	if err != nil {
		return nil, fmt.Errorf("technical debt prediction failed: %w", err)
	}
	
	return prediction, nil
}

// PredictBugLikelihood predicts bug likelihood for code
func (ai *AIService) PredictBugLikelihood(ctx context.Context, codeMetrics map[string]interface{}) (*BugPrediction, error) {
	if !ai.enabled || !ai.config.EnablePredictive {
		return nil, fmt.Errorf("predictive analytics not enabled")
	}
	
	prediction, err := ai.predictiveAnalytics.PredictBugLikelihood(codeMetrics)
	if err != nil {
		return nil, fmt.Errorf("bug prediction failed: %w", err)
	}
	
	return prediction, nil
}

// ForecastProductivity forecasts team productivity
func (ai *AIService) ForecastProductivity(ctx context.Context, teamData map[string]interface{}, period string) (*ProductivityForecast, error) {
	if !ai.enabled || !ai.config.EnablePredictive {
		return nil, fmt.Errorf("predictive analytics not enabled")
	}
	
	forecast, err := ai.predictiveAnalytics.ForecastProductivity(teamData, period)
	if err != nil {
		return nil, fmt.Errorf("productivity forecasting failed: %w", err)
	}
	
	return forecast, nil
}

// AnalyzeCommitSemantics analyzes commit semantics using AI
func (ai *AIService) AnalyzeCommitSemantics(ctx context.Context, commitHash, message, author, files string) (*SemanticVector, error) {
	if !ai.enabled {
		return nil, fmt.Errorf("AI services not enabled")
	}
	
	vector, err := ai.transformerEmbeddings.GenerateCommitEmbedding(ctx, commitHash, message, author, files)
	if err != nil {
		return nil, fmt.Errorf("commit semantic analysis failed: %w", err)
	}
	
	return vector, nil
}

// GetConversationHistory returns conversation history for a session
func (ai *AIService) GetConversationHistory(sessionID string) ([]ConversationEntry, error) {
	ai.mu.RLock()
	defer ai.mu.RUnlock()
	
	session, exists := ai.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}
	
	return session.History, nil
}

// ClearConversationHistory clears conversation history for a session
func (ai *AIService) ClearConversationHistory(sessionID string) error {
	ai.mu.Lock()
	defer ai.mu.Unlock()
	
	session, exists := ai.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}
	
	session.History = make([]ConversationEntry, 0)
	return nil
}

// GetAIMetrics returns AI service metrics
func (ai *AIService) GetAIMetrics() *AIMetrics {
	ai.mu.RLock()
	defer ai.mu.RUnlock()
	
	metrics := &AIMetrics{
		ConversationsSessions: len(ai.sessions),
		LastReset:            time.Now(),
		CapabilityStatus:     make(map[string]*AICapabilityStatus),
	}
	
	// Add capability status
	for _, capability := range ai.GetCapabilities() {
		status := &AICapabilityStatus{
			Name:    capability.Name,
			Enabled: ai.enabled,
			Status:  "active",
		}
		metrics.CapabilityStatus[capability.Name] = status
	}
	
	return metrics
}

// UpdateConfiguration updates AI service configuration
func (ai *AIService) UpdateConfiguration(newConfig *AIConfig) error {
	ai.mu.Lock()
	defer ai.mu.Unlock()
	
	ai.config = newConfig
	ai.enabled = newConfig.OpenAIAPIKey != ""
	ai.apiKey = newConfig.OpenAIAPIKey
	
	if ai.enabled {
		ai.initializeComponents()
		log.Println("AI Service configuration updated and reinitialized")
	} else {
		log.Println("AI Service disabled due to missing API key")
	}
	
	return nil
}

// CleanupSessions removes inactive sessions
func (ai *AIService) CleanupSessions(maxAge time.Duration) {
	ai.mu.Lock()
	defer ai.mu.Unlock()
	
	cutoff := time.Now().Add(-maxAge)
	for sessionID, session := range ai.sessions {
		if session.LastActive.Before(cutoff) {
			delete(ai.sessions, sessionID)
		}
	}
}

// initializeComponents initializes AI components
func (ai *AIService) initializeComponents() {
	if ai.config.OpenAIAPIKey == "" {
		return
	}
	
	// Initialize conversational interface
	ai.conversationalInterface = NewConversationalInterface(ai.config.OpenAIAPIKey)
	
	// Initialize transformer embeddings
	ai.transformerEmbeddings = NewTransformerEmbeddings(
		ai.config.OpenAIAPIKey,
		ai.config.OpenAIBaseURL,
		ai.config.EmbeddingModel,
	)
	
	// Initialize NLP processor
	ai.nlpProcessor = NewNaturalLanguageProcessor(
		ai.config.OpenAIAPIKey,
		ai.config.OpenAIBaseURL,
		ai.config.ChatModel,
	)
	
	// Initialize predictive analytics
	ai.predictiveAnalytics = NewPredictiveAnalytics()
}

// cleanupVectorCache removes old vectors from cache
func (ai *AIService) cleanupVectorCache() {
	// Simple cleanup: remove oldest entries
	if len(ai.vectors) <= ai.config.VectorCacheSize {
		return
	}
	
	// Find oldest entries (simplified approach)
	keysToRemove := make([]string, 0)
	count := 0
	for key := range ai.vectors {
		if count >= len(ai.vectors)-ai.config.VectorCacheSize {
			break
		}
		keysToRemove = append(keysToRemove, key)
		count++
	}
	
	// Remove old entries
	for _, key := range keysToRemove {
		delete(ai.vectors, key)
	}
}

// loadAIConfig loads AI configuration from environment variables
func loadAIConfig() *AIConfig {
	config := &AIConfig{
		OpenAIAPIKey:         os.Getenv("OPENAI_API_KEY"),
		OpenAIBaseURL:        os.Getenv("OPENAI_BASE_URL"),
		EmbeddingModel:       getEnvOrDefault("ADES_EMBEDDING_MODEL", "text-embedding-3-small"),
		ChatModel:            getEnvOrDefault("ADES_CHAT_MODEL", "gpt-3.5-turbo"),
		MaxTokens:            getEnvIntOrDefault("ADES_MAX_TOKENS", 2000),
		Temperature:          getEnvFloatOrDefault("ADES_TEMPERATURE", 0.7),
		EnablePredictive:     getEnvBoolOrDefault("ADES_ENABLE_PREDICTIVE", true),
		EnableConversational: getEnvBoolOrDefault("ADES_ENABLE_CONVERSATIONAL", true),
		CacheEmbeddings:      getEnvBoolOrDefault("ADES_CACHE_EMBEDDINGS", true),
		VectorCacheSize:      getEnvIntOrDefault("ADES_VECTOR_CACHE_SIZE", 1000),
	}
	
	return config
}

// Helper functions for environment variable parsing
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvIntOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := fmt.Sscanf(value, "%d", &defaultValue); err == nil && intValue == 1 {
			return defaultValue
		}
	}
	return defaultValue
}

func getEnvFloatOrDefault(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := fmt.Sscanf(value, "%f", &defaultValue); err == nil && floatValue == 1 {
			return defaultValue
		}
	}
	return defaultValue
}

func getEnvBoolOrDefault(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
} 