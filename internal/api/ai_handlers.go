package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/knoxai/gait/internal/ai"
)

// AIHandlers provides HTTP handlers for AI capabilities
type AIHandlers struct {
	aiService *ai.AIService
}

// NewAIHandlers creates new AI handlers
func NewAIHandlers(aiService *ai.AIService) *AIHandlers {
	return &AIHandlers{
		aiService: aiService,
	}
}

// ChatRequest represents a chat API request
type ChatRequest struct {
	SessionID string                 `json:"session_id"`
	Message   string                 `json:"message"`
	Context   map[string]interface{} `json:"context,omitempty"`
}

// ChatResponse represents a chat API response
type ChatResponse struct {
	SessionID       string                 `json:"session_id"`
	Response        string                 `json:"response"`
	Intent          string                 `json:"intent"`
	Confidence      float64                `json:"confidence"`
	Suggestions     []string               `json:"suggestions"`
	Actions         []ai.SuggestedAction   `json:"actions"`
	Visualizations  []ai.Visualization     `json:"visualizations"`
	ProcessingTime  string                 `json:"processing_time"`
	CapabilitiesUsed []string              `json:"capabilities_used"`
}

// EmbeddingRequest represents an embedding generation request
type EmbeddingRequest struct {
	Texts    []string          `json:"texts"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// EmbeddingResponse represents an embedding generation response
type EmbeddingResponse struct {
	Vectors []ai.SemanticVector `json:"vectors"`
	Count   int                 `json:"count"`
}

// SemanticSearchRequest represents a semantic search request
type SemanticSearchRequest struct {
	Query string `json:"query"`
	Limit int    `json:"limit,omitempty"`
}

// SemanticSearchResponse represents a semantic search response
type SemanticSearchResponse struct {
	Query   string                `json:"query"`
	Results []ai.SimilarityResult `json:"results"`
	Count   int                   `json:"count"`
}

// PredictionRequest represents a prediction request
type PredictionRequest struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// HandleChat handles conversational AI chat requests
func (h *AIHandlers) HandleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, "Message is required", http.StatusBadRequest)
		return
	}

	if req.SessionID == "" {
		req.SessionID = fmt.Sprintf("session_%d", time.Now().Unix())
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Process chat request
	response, err := h.aiService.Chat(ctx, req.SessionID, req.Message, req.Context)
	if err != nil {
		http.Error(w, fmt.Sprintf("Chat processing failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Create response
	chatResponse := ChatResponse{
		SessionID:        req.SessionID,
		Response:         response.Text,
		Intent:           response.Intent,
		Confidence:       response.Confidence,
		Suggestions:      response.Suggestions,
		Actions:          response.Actions,
		Visualizations:   response.Visualizations,
		ProcessingTime:   response.ProcessingTime.String(),
		CapabilitiesUsed: response.CapabilitiesUsed,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatResponse)
}

// HandleGenerateEmbeddings handles embedding generation requests
func (h *AIHandlers) HandleGenerateEmbeddings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req EmbeddingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if len(req.Texts) == 0 {
		http.Error(w, "Texts array is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Generate embeddings
	vectors, err := h.aiService.GenerateEmbeddings(ctx, req.Texts, req.Metadata)
	if err != nil {
		http.Error(w, fmt.Sprintf("Embedding generation failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Create response
	response := EmbeddingResponse{
		Vectors: make([]ai.SemanticVector, len(vectors)),
		Count:   len(vectors),
	}

	for i, vector := range vectors {
		response.Vectors[i] = *vector
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleSemanticSearch handles semantic search requests
func (h *AIHandlers) HandleSemanticSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SemanticSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		http.Error(w, "Query is required", http.StatusBadRequest)
		return
	}

	if req.Limit <= 0 {
		req.Limit = 10
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Perform semantic search
	results, err := h.aiService.SemanticSearch(ctx, req.Query, req.Limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Semantic search failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Create response
	response := SemanticSearchResponse{
		Query:   req.Query,
		Results: make([]ai.SimilarityResult, len(results)),
		Count:   len(results),
	}

	for i, result := range results {
		response.Results[i] = *result
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandlePredictTechnicalDebt handles technical debt prediction requests
func (h *AIHandlers) HandlePredictTechnicalDebt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Predict technical debt
	prediction, err := h.aiService.PredictTechnicalDebt(ctx, req.Data)
	if err != nil {
		http.Error(w, fmt.Sprintf("Technical debt prediction failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prediction)
}

// HandlePredictBugs handles bug prediction requests
func (h *AIHandlers) HandlePredictBugs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Predict bug likelihood
	prediction, err := h.aiService.PredictBugLikelihood(ctx, req.Data)
	if err != nil {
		http.Error(w, fmt.Sprintf("Bug prediction failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prediction)
}

// HandleForecastProductivity handles productivity forecasting requests
func (h *AIHandlers) HandleForecastProductivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "monthly"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Forecast productivity
	forecast, err := h.aiService.ForecastProductivity(ctx, req.Data, period)
	if err != nil {
		http.Error(w, fmt.Sprintf("Productivity forecasting failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(forecast)
}

// HandleGetCapabilities handles AI capabilities inquiry
func (h *AIHandlers) HandleGetCapabilities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	capabilities := h.aiService.GetCapabilities()

	response := map[string]interface{}{
		"enabled":      h.aiService.IsEnabled(),
		"capabilities": capabilities,
		"count":        len(capabilities),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleGetConversationHistory handles conversation history requests
func (h *AIHandlers) HandleGetConversationHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		http.Error(w, "session_id parameter is required", http.StatusBadRequest)
		return
	}

	history, err := h.aiService.GetConversationHistory(sessionID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get conversation history: %v", err), http.StatusNotFound)
		return
	}

	response := map[string]interface{}{
		"session_id": sessionID,
		"history":    history,
		"count":      len(history),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleClearConversationHistory handles conversation history clearing
func (h *AIHandlers) HandleClearConversationHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		http.Error(w, "session_id parameter is required", http.StatusBadRequest)
		return
	}

	err := h.aiService.ClearConversationHistory(sessionID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to clear conversation history: %v", err), http.StatusNotFound)
		return
	}

	response := map[string]interface{}{
		"session_id": sessionID,
		"status":     "cleared",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleGetAIMetrics handles AI metrics requests
func (h *AIHandlers) HandleGetAIMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	metrics := h.aiService.GetAIMetrics()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// HandleAnalyzeCommitSemantics handles commit semantic analysis
func (h *AIHandlers) HandleAnalyzeCommitSemantics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		CommitHash string `json:"commit_hash"`
		Message    string `json:"message"`
		Author     string `json:"author"`
		Files      string `json:"files"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.CommitHash == "" || req.Message == "" {
		http.Error(w, "commit_hash and message are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Analyze commit semantics
	vector, err := h.aiService.AnalyzeCommitSemantics(ctx, req.CommitHash, req.Message, req.Author, req.Files)
	if err != nil {
		http.Error(w, fmt.Sprintf("Commit semantic analysis failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vector)
}

// HandleAIStatus handles AI service status requests
func (h *AIHandlers) HandleAIStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	status := map[string]interface{}{
		"enabled":     h.aiService.IsEnabled(),
		"timestamp":   time.Now(),
		"version":     "1.0.0",
		"capabilities": len(h.aiService.GetCapabilities()),
	}

	if h.aiService.IsEnabled() {
		status["status"] = "active"
		metrics := h.aiService.GetAIMetrics()
		status["sessions"] = metrics.ConversationsSessions
		status["capabilities_status"] = metrics.CapabilityStatus
	} else {
		status["status"] = "disabled"
		status["reason"] = "No API key configured"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// HandleAIHelp handles AI help and documentation requests
func (h *AIHandlers) HandleAIHelp(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	capability := r.URL.Query().Get("capability")
	
	if capability != "" {
		// Get help for specific capability
		capabilities := h.aiService.GetCapabilities()
		
		// Find the specific capability
		var foundCapability *ai.Capability
		for _, cap := range capabilities {
			if cap.Name == capability {
				foundCapability = &cap
				break
			}
		}
		
		if foundCapability == nil {
			http.Error(w, fmt.Sprintf("Capability not found: %s", capability), http.StatusNotFound)
			return
		}
		
		response := map[string]interface{}{
			"capability": foundCapability,
			"help":       fmt.Sprintf("Help for %s: %s", foundCapability.Name, foundCapability.Description),
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// General AI help
	help := map[string]interface{}{
		"title": "ADES AI Assistant",
		"description": "Advanced AI capabilities for intelligent development insights",
		"endpoints": map[string]string{
			"POST /api/ai/chat":                    "Conversational AI chat interface",
			"POST /api/ai/embeddings":             "Generate semantic embeddings",
			"POST /api/ai/search":                 "Semantic search across repository",
			"POST /api/ai/predict/debt":           "Predict technical debt",
			"POST /api/ai/predict/bugs":           "Predict bug likelihood",
			"POST /api/ai/predict/productivity":   "Forecast team productivity",
			"POST /api/ai/analyze/commit":         "Analyze commit semantics",
			"GET /api/ai/capabilities":            "Get available AI capabilities",
			"GET /api/ai/metrics":                 "Get AI service metrics",
			"GET /api/ai/status":                  "Get AI service status",
			"GET /api/ai/conversation/history":    "Get conversation history",
			"DELETE /api/ai/conversation/history": "Clear conversation history",
		},
		"examples": []string{
			"Chat: 'What are the main patterns in this repository?'",
			"Search: 'Find authentication related code'",
			"Predict: 'Analyze technical debt for current codebase'",
		},
		"configuration": map[string]string{
			"OPENAI_API_KEY":           "Required - OpenAI API key",
			"ADES_EMBEDDING_MODEL":     "Optional - Embedding model (default: text-embedding-3-small)",
			"ADES_CHAT_MODEL":          "Optional - Chat model (default: gpt-3.5-turbo)",
			"ADES_ENABLE_PREDICTIVE":   "Optional - Enable predictive analytics (default: true)",
			"ADES_ENABLE_CONVERSATIONAL": "Optional - Enable conversational AI (default: true)",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(help)
}

// Utility function to parse integer from query parameter
func parseIntParam(r *http.Request, param string, defaultValue int) int {
	value := r.URL.Query().Get(param)
	if value == "" {
		return defaultValue
	}
	
	if intValue, err := strconv.Atoi(value); err == nil {
		return intValue
	}
	
	return defaultValue
}

// Utility function to parse float from query parameter
func parseFloatParam(r *http.Request, param string, defaultValue float64) float64 {
	value := r.URL.Query().Get(param)
	if value == "" {
		return defaultValue
	}
	
	if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
		return floatValue
	}
	
	return defaultValue
} 