package webhooks

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/knoxai/gait/internal/ades"
)

// WebhookHandler manages incoming webhooks from various sources
type WebhookHandler struct {
	adesService *ades.Service
	secret      string
	endpoints   map[string]WebhookEndpoint
}

// WebhookEndpoint represents a webhook endpoint configuration
type WebhookEndpoint struct {
	Name        string            `json:"name"`
	URL         string            `json:"url"`
	Secret      string            `json:"secret"`
	Events      []string          `json:"events"`
	Headers     map[string]string `json:"headers"`
	Active      bool              `json:"active"`
	LastTrigger time.Time         `json:"last_trigger"`
}

// WebhookPayload represents the structure of webhook data
type WebhookPayload struct {
	Event     string                 `json:"event"`
	Source    string                 `json:"source"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
	Signature string                 `json:"signature,omitempty"`
}

// GitHubWebhookPayload represents GitHub webhook structure
type GitHubWebhookPayload struct {
	Action     string `json:"action"`
	Repository struct {
		Name     string `json:"name"`
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
	} `json:"repository"`
	Commits []struct {
		ID      string `json:"id"`
		Message string `json:"message"`
		Author  struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"author"`
		URL string `json:"url"`
	} `json:"commits"`
	PullRequest struct {
		Number int    `json:"number"`
		Title  string `json:"title"`
		State  string `json:"state"`
		HTMLURL string `json:"html_url"`
	} `json:"pull_request"`
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(adesService *ades.Service, secret string) *WebhookHandler {
	return &WebhookHandler{
		adesService: adesService,
		secret:      secret,
		endpoints:   make(map[string]WebhookEndpoint),
	}
}

// RegisterEndpoint registers a new webhook endpoint
func (wh *WebhookHandler) RegisterEndpoint(endpoint WebhookEndpoint) {
	wh.endpoints[endpoint.Name] = endpoint
	log.Printf("Registered webhook endpoint: %s", endpoint.Name)
}

// HandleGitHubWebhook handles incoming GitHub webhooks
func (wh *WebhookHandler) HandleGitHubWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	// Verify GitHub signature
	signature := r.Header.Get("X-Hub-Signature-256")
	if !wh.verifyGitHubSignature(body, signature) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Get event type
	eventType := r.Header.Get("X-GitHub-Event")
	if eventType == "" {
		http.Error(w, "Missing event type", http.StatusBadRequest)
		return
	}

	// Parse the payload
	var payload GitHubWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Process the webhook
	if err := wh.processGitHubWebhook(eventType, payload); err != nil {
		log.Printf("Failed to process GitHub webhook: %v", err)
		http.Error(w, "Failed to process webhook", http.StatusInternalServerError)
		return
	}

	// Trigger registered endpoints
	wh.triggerEndpoints("github", eventType, map[string]interface{}{
		"event":   eventType,
		"payload": payload,
	})

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Webhook processed successfully"))
}

// HandleGenericWebhook handles generic webhooks
func (wh *WebhookHandler) HandleGenericWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	// Parse the payload
	var payload WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Verify signature if provided
	if payload.Signature != "" && !wh.verifySignature(body, payload.Signature) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Process the webhook
	if err := wh.processGenericWebhook(payload); err != nil {
		log.Printf("Failed to process generic webhook: %v", err)
		http.Error(w, "Failed to process webhook", http.StatusInternalServerError)
		return
	}

	// Trigger registered endpoints
	wh.triggerEndpoints(payload.Source, payload.Event, payload.Data)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Webhook processed successfully"))
}

// processGitHubWebhook processes GitHub webhook events
func (wh *WebhookHandler) processGitHubWebhook(eventType string, payload GitHubWebhookPayload) error {
	log.Printf("Processing GitHub webhook: %s", eventType)

	switch eventType {
	case "push":
		return wh.handlePushEvent(payload)
	case "pull_request":
		return wh.handlePullRequestEvent(payload)
	case "repository":
		return wh.handleRepositoryEvent(payload)
	default:
		log.Printf("Unhandled GitHub event type: %s", eventType)
		return nil
	}
}

// handlePushEvent handles GitHub push events
func (wh *WebhookHandler) handlePushEvent(payload GitHubWebhookPayload) error {
	log.Printf("Handling push event for repository: %s", payload.Repository.FullName)

	// Trigger repository analysis for new commits
	if len(payload.Commits) > 0 {
		log.Printf("Analyzing %d new commits", len(payload.Commits))
		
		// Trigger comprehensive analysis
		go func() {
			if err := wh.adesService.AnalyzeRepository(); err != nil {
				log.Printf("Failed to analyze repository after push: %v", err)
			}
		}()

		// Process each commit
		for _, commit := range payload.Commits {
			log.Printf("Processing commit: %s - %s", commit.ID, commit.Message)
			
			// You could add specific commit analysis here
			// For example, semantic analysis of the commit message
		}
	}

	return nil
}

// handlePullRequestEvent handles GitHub pull request events
func (wh *WebhookHandler) handlePullRequestEvent(payload GitHubWebhookPayload) error {
	log.Printf("Handling pull request event: %s for PR #%d", payload.Action, payload.PullRequest.Number)

	switch payload.Action {
	case "opened", "synchronize":
		// Trigger analysis for new or updated pull requests
		log.Printf("Analyzing pull request #%d: %s", payload.PullRequest.Number, payload.PullRequest.Title)
		
		// Trigger semantic analysis
		go func() {
			if err := wh.adesService.AnalyzeRepositorySemantics(); err != nil {
				log.Printf("Failed to analyze PR semantics: %v", err)
			}
		}()

	case "closed":
		if payload.PullRequest.State == "merged" {
			log.Printf("Pull request #%d was merged", payload.PullRequest.Number)
			// Trigger post-merge analysis
		}
	}

	return nil
}

// handleRepositoryEvent handles GitHub repository events
func (wh *WebhookHandler) handleRepositoryEvent(payload GitHubWebhookPayload) error {
	log.Printf("Handling repository event: %s for %s", payload.Action, payload.Repository.FullName)

	switch payload.Action {
	case "created":
		log.Printf("New repository created: %s", payload.Repository.FullName)
	case "deleted":
		log.Printf("Repository deleted: %s", payload.Repository.FullName)
	}

	return nil
}

// processGenericWebhook processes generic webhook events
func (wh *WebhookHandler) processGenericWebhook(payload WebhookPayload) error {
	log.Printf("Processing generic webhook: %s from %s", payload.Event, payload.Source)

	switch payload.Event {
	case "analysis_complete":
		return wh.handleAnalysisComplete(payload.Data)
	case "insight_generated":
		return wh.handleInsightGenerated(payload.Data)
	case "pattern_detected":
		return wh.handlePatternDetected(payload.Data)
	default:
		log.Printf("Unhandled generic event type: %s", payload.Event)
		return nil
	}
}

// handleAnalysisComplete handles analysis completion events
func (wh *WebhookHandler) handleAnalysisComplete(data map[string]interface{}) error {
	log.Printf("Analysis completed: %+v", data)
	
	// Notify connected clients via WebSocket
	// This would integrate with the dashboard WebSocket hub
	
	return nil
}

// handleInsightGenerated handles new insight events
func (wh *WebhookHandler) handleInsightGenerated(data map[string]interface{}) error {
	log.Printf("New insight generated: %+v", data)
	
	// Store the insight and notify clients
	
	return nil
}

// handlePatternDetected handles pattern detection events
func (wh *WebhookHandler) handlePatternDetected(data map[string]interface{}) error {
	log.Printf("New pattern detected: %+v", data)
	
	// Store the pattern and update knowledge graph
	
	return nil
}

// triggerEndpoints triggers registered webhook endpoints
func (wh *WebhookHandler) triggerEndpoints(source, event string, data map[string]interface{}) {
	for name, endpoint := range wh.endpoints {
		if !endpoint.Active {
			continue
		}

		// Check if endpoint is interested in this event
		if !wh.isEventSupported(endpoint.Events, event) {
			continue
		}

		go func(name string, ep WebhookEndpoint) {
			if err := wh.sendWebhook(ep, source, event, data); err != nil {
				log.Printf("Failed to send webhook to %s: %v", ep.Name, err)
			} else {
				// Update last trigger time
				ep.LastTrigger = time.Now()
				wh.endpoints[name] = ep
			}
		}(name, endpoint)
	}
}

// sendWebhook sends a webhook to an endpoint
func (wh *WebhookHandler) sendWebhook(endpoint WebhookEndpoint, source, event string, data map[string]interface{}) error {
	payload := WebhookPayload{
		Event:     event,
		Source:    source,
		Timestamp: time.Now(),
		Data:      data,
	}

	// Generate signature if secret is provided
	if endpoint.Secret != "" {
		payloadBytes, _ := json.Marshal(payload)
		payload.Signature = wh.generateSignature(payloadBytes, endpoint.Secret)
	}

	// Marshal payload
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", endpoint.URL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "ADES-Webhook/1.0")
	req.Header.Set("X-ADES-Event", event)
	req.Header.Set("X-ADES-Source", source)

	// Add custom headers
	for key, value := range endpoint.Headers {
		req.Header.Set(key, value)
	}

	// Send request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook endpoint returned status %d", resp.StatusCode)
	}

	log.Printf("Successfully sent webhook to %s", endpoint.Name)
	return nil
}

// verifyGitHubSignature verifies GitHub webhook signature
func (wh *WebhookHandler) verifyGitHubSignature(payload []byte, signature string) bool {
	if wh.secret == "" || signature == "" {
		return wh.secret == "" // Allow if no secret is configured
	}

	// Remove "sha256=" prefix
	if strings.HasPrefix(signature, "sha256=") {
		signature = signature[7:]
	}

	// Calculate expected signature
	mac := hmac.New(sha256.New, []byte(wh.secret))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// verifySignature verifies generic webhook signature
func (wh *WebhookHandler) verifySignature(payload []byte, signature string) bool {
	if wh.secret == "" {
		return true // Allow if no secret is configured
	}

	expectedSignature := wh.generateSignature(payload, wh.secret)
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// generateSignature generates HMAC signature for payload
func (wh *WebhookHandler) generateSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

// isEventSupported checks if an event is supported by an endpoint
func (wh *WebhookHandler) isEventSupported(supportedEvents []string, event string) bool {
	if len(supportedEvents) == 0 {
		return true // Support all events if none specified
	}

	for _, supportedEvent := range supportedEvents {
		if supportedEvent == "*" || supportedEvent == event {
			return true
		}
	}

	return false
}

// GetEndpoints returns all registered endpoints
func (wh *WebhookHandler) GetEndpoints() map[string]WebhookEndpoint {
	return wh.endpoints
}

// RemoveEndpoint removes a webhook endpoint
func (wh *WebhookHandler) RemoveEndpoint(name string) {
	delete(wh.endpoints, name)
	log.Printf("Removed webhook endpoint: %s", name)
}

// UpdateEndpoint updates a webhook endpoint
func (wh *WebhookHandler) UpdateEndpoint(name string, endpoint WebhookEndpoint) {
	wh.endpoints[name] = endpoint
	log.Printf("Updated webhook endpoint: %s", name)
} 