package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// TransformerEmbeddings handles transformer-based embeddings for semantic analysis
type TransformerEmbeddings struct {
	client     *http.Client
	apiKey     string
	baseURL    string
	model      string
	maxTokens  int
	dimensions int
}

// EmbeddingRequest represents a request to generate embeddings
type EmbeddingRequest struct {
	Input          []string `json:"input"`
	Model          string   `json:"model"`
	EncodingFormat string   `json:"encoding_format,omitempty"`
	Dimensions     int      `json:"dimensions,omitempty"`
}

// EmbeddingResponse represents the response from embedding API
type EmbeddingResponse struct {
	Object string `json:"object"`
	Data   []struct {
		Object    string    `json:"object"`
		Index     int       `json:"index"`
		Embedding []float64 `json:"embedding"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		PromptTokens int `json:"prompt_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

// SemanticVector represents a semantic vector with metadata
type SemanticVector struct {
	ID          string            `json:"id"`
	Text        string            `json:"text"`
	Embedding   []float64         `json:"embedding"`
	Metadata    map[string]string `json:"metadata"`
	Timestamp   time.Time         `json:"timestamp"`
	Confidence  float64           `json:"confidence"`
	TokenCount  int               `json:"token_count"`
	ModelUsed   string            `json:"model_used"`
}

// SimilarityResult represents similarity search results
type SimilarityResult struct {
	Vector     *SemanticVector `json:"vector"`
	Similarity float64         `json:"similarity"`
	Distance   float64         `json:"distance"`
	Rank       int             `json:"rank"`
}

// NewTransformerEmbeddings creates a new transformer embeddings service
func NewTransformerEmbeddings(apiKey, baseURL, model string) *TransformerEmbeddings {
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	if model == "" {
		model = "text-embedding-3-small"
	}

	return &TransformerEmbeddings{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		apiKey:     apiKey,
		baseURL:    baseURL,
		model:      model,
		maxTokens:  8192,
		dimensions: 1536,
	}
}

// GenerateEmbedding generates embeddings for a single text
func (te *TransformerEmbeddings) GenerateEmbedding(ctx context.Context, text string) (*SemanticVector, error) {
	embeddings, err := te.GenerateEmbeddings(ctx, []string{text})
	if err != nil {
		return nil, err
	}
	if len(embeddings) == 0 {
		return nil, fmt.Errorf("no embeddings generated")
	}
	return embeddings[0], nil
}

// GenerateEmbeddings generates embeddings for multiple texts
func (te *TransformerEmbeddings) GenerateEmbeddings(ctx context.Context, texts []string) ([]*SemanticVector, error) {
	if len(texts) == 0 {
		return nil, fmt.Errorf("no texts provided")
	}

	// Clean and prepare texts
	cleanTexts := make([]string, len(texts))
	for i, text := range texts {
		cleanTexts[i] = te.preprocessText(text)
	}

	// Create request
	request := EmbeddingRequest{
		Input:          cleanTexts,
		Model:          te.model,
		EncodingFormat: "float",
		Dimensions:     te.dimensions,
	}

	// Make API request
	response, err := te.makeEmbeddingRequest(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("embedding request failed: %w", err)
	}

	// Convert to semantic vectors
	vectors := make([]*SemanticVector, len(response.Data))
	for i, data := range response.Data {
		vectors[i] = &SemanticVector{
			ID:         fmt.Sprintf("emb_%d_%d", time.Now().Unix(), i),
			Text:       texts[i],
			Embedding:  data.Embedding,
			Metadata:   make(map[string]string),
			Timestamp:  time.Now(),
			Confidence: te.calculateConfidence(data.Embedding),
			TokenCount: response.Usage.PromptTokens / len(texts), // Approximate
			ModelUsed:  response.Model,
		}
	}

	return vectors, nil
}

// GenerateCommitEmbedding generates embeddings specifically for commit data
func (te *TransformerEmbeddings) GenerateCommitEmbedding(ctx context.Context, commitHash, message, author, files string) (*SemanticVector, error) {
	// Create rich commit context
	commitText := te.createCommitContext(commitHash, message, author, files)
	
	vector, err := te.GenerateEmbedding(ctx, commitText)
	if err != nil {
		return nil, err
	}

	// Add commit-specific metadata
	vector.Metadata["type"] = "commit"
	vector.Metadata["hash"] = commitHash
	vector.Metadata["author"] = author
	vector.Metadata["files_count"] = fmt.Sprintf("%d", len(strings.Split(files, ",")))
	
	return vector, nil
}

// FindSimilar finds similar vectors using cosine similarity
func (te *TransformerEmbeddings) FindSimilar(queryVector *SemanticVector, candidates []*SemanticVector, topK int) ([]*SimilarityResult, error) {
	if queryVector == nil || len(queryVector.Embedding) == 0 {
		return nil, fmt.Errorf("invalid query vector")
	}

	results := make([]*SimilarityResult, 0, len(candidates))
	
	for _, candidate := range candidates {
		if candidate == nil || len(candidate.Embedding) == 0 {
			continue
		}

		similarity := te.cosineSimilarity(queryVector.Embedding, candidate.Embedding)
		distance := 1.0 - similarity

		results = append(results, &SimilarityResult{
			Vector:     candidate,
			Similarity: similarity,
			Distance:   distance,
		})
	}

	// Sort by similarity (descending)
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[i].Similarity < results[j].Similarity {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	// Add ranks and limit results
	limit := topK
	if limit > len(results) {
		limit = len(results)
	}

	for i := 0; i < limit; i++ {
		results[i].Rank = i + 1
	}

	return results[:limit], nil
}

// SemanticSearch performs semantic search across vectors
func (te *TransformerEmbeddings) SemanticSearch(ctx context.Context, query string, vectors []*SemanticVector, topK int) ([]*SimilarityResult, error) {
	// Generate embedding for query
	queryVector, err := te.GenerateEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	// Find similar vectors
	return te.FindSimilar(queryVector, vectors, topK)
}

// ClusterVectors performs k-means clustering on vectors
func (te *TransformerEmbeddings) ClusterVectors(vectors []*SemanticVector, k int) ([][]int, error) {
	if len(vectors) < k {
		return nil, fmt.Errorf("not enough vectors for clustering")
	}

	// Simple k-means implementation
	clusters := make([][]int, k)
	centroids := make([][]float64, k)
	
	// Initialize centroids randomly
	for i := 0; i < k; i++ {
		centroids[i] = make([]float64, len(vectors[0].Embedding))
		copy(centroids[i], vectors[i].Embedding)
	}

	// Iterate until convergence
	maxIterations := 100
	for iter := 0; iter < maxIterations; iter++ {
		// Clear clusters
		for i := range clusters {
			clusters[i] = clusters[i][:0]
		}

		// Assign vectors to closest centroids
		for i, vector := range vectors {
			bestCluster := 0
			bestSimilarity := te.cosineSimilarity(vector.Embedding, centroids[0])

			for j := 1; j < k; j++ {
				similarity := te.cosineSimilarity(vector.Embedding, centroids[j])
				if similarity > bestSimilarity {
					bestSimilarity = similarity
					bestCluster = j
				}
			}

			clusters[bestCluster] = append(clusters[bestCluster], i)
		}

		// Update centroids
		converged := true
		for i := 0; i < k; i++ {
			if len(clusters[i]) == 0 {
				continue
			}

			newCentroid := make([]float64, len(centroids[i]))
			for _, vectorIdx := range clusters[i] {
				for j, val := range vectors[vectorIdx].Embedding {
					newCentroid[j] += val
				}
			}

			// Average
			for j := range newCentroid {
				newCentroid[j] /= float64(len(clusters[i]))
			}

			// Check convergence
			similarity := te.cosineSimilarity(centroids[i], newCentroid)
			if similarity < 0.99 {
				converged = false
			}

			centroids[i] = newCentroid
		}

		if converged {
			break
		}
	}

	return clusters, nil
}

// makeEmbeddingRequest makes HTTP request to embedding API
func (te *TransformerEmbeddings) makeEmbeddingRequest(ctx context.Context, request EmbeddingRequest) (*EmbeddingResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", te.baseURL+"/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+te.apiKey)

	resp, err := te.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response EmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return &response, nil
}

// preprocessText cleans and prepares text for embedding
func (te *TransformerEmbeddings) preprocessText(text string) string {
	// Remove excessive whitespace
	text = strings.TrimSpace(text)
	text = strings.ReplaceAll(text, "\n", " ")
	text = strings.ReplaceAll(text, "\t", " ")
	
	// Remove multiple spaces
	for strings.Contains(text, "  ") {
		text = strings.ReplaceAll(text, "  ", " ")
	}

	// Truncate if too long (approximate token limit)
	if len(text) > te.maxTokens*4 { // Rough estimate: 4 chars per token
		text = text[:te.maxTokens*4]
	}

	return text
}

// createCommitContext creates rich context for commit embeddings
func (te *TransformerEmbeddings) createCommitContext(hash, message, author, files string) string {
	var context strings.Builder
	
	context.WriteString("Commit: ")
	context.WriteString(message)
	context.WriteString(" | Author: ")
	context.WriteString(author)
	
	if files != "" {
		context.WriteString(" | Files: ")
		context.WriteString(files)
	}
	
	context.WriteString(" | Hash: ")
	context.WriteString(hash)
	
	return context.String()
}

// cosineSimilarity calculates cosine similarity between two vectors
func (te *TransformerEmbeddings) cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0.0
	}

	var dotProduct, normA, normB float64
	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0.0 || normB == 0.0 {
		return 0.0
	}

	return dotProduct / (normA * normB)
}

// calculateConfidence calculates confidence score based on embedding properties
func (te *TransformerEmbeddings) calculateConfidence(embedding []float64) float64 {
	if len(embedding) == 0 {
		return 0.0
	}

	// Calculate vector magnitude as a proxy for confidence
	var magnitude float64
	for _, val := range embedding {
		magnitude += val * val
	}
	
	magnitude = magnitude / float64(len(embedding)) // Normalize by dimension
	
	// Convert to confidence score (0-1)
	confidence := 1.0 / (1.0 + magnitude) // Sigmoid-like function
	if confidence > 1.0 {
		confidence = 1.0
	}
	if confidence < 0.0 {
		confidence = 0.0
	}
	
	return confidence
} 