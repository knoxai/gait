package web

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/knoxai/gait/internal/ades"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin in development
		// In production, you should validate the origin
		return true
	},
}

// DashboardHub manages WebSocket connections for real-time dashboard updates
type DashboardHub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mutex      sync.RWMutex
	adesService *ades.Service
}

// NewDashboardHub creates a new dashboard WebSocket hub
func NewDashboardHub(adesService *ades.Service) *DashboardHub {
	return &DashboardHub{
		clients:     make(map[*websocket.Conn]bool),
		broadcast:   make(chan []byte),
		register:    make(chan *websocket.Conn),
		unregister:  make(chan *websocket.Conn),
		adesService: adesService,
	}
}

// Run starts the WebSocket hub
func (h *DashboardHub) Run() {
	// Start periodic updates
	go h.startPeriodicUpdates()
	
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("Dashboard client connected. Total clients: %d", len(h.clients))
			
			// Send initial data to new client
			h.sendInitialData(client)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mutex.Unlock()
			log.Printf("Dashboard client disconnected. Total clients: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case <-time.After(time.Second):
					// Client is not responding, remove it
					delete(h.clients, client)
					client.Close()
				default:
					if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
						delete(h.clients, client)
						client.Close()
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// HandleWebSocket handles WebSocket connections for dashboard updates
func (h *DashboardHub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	h.register <- conn

	// Handle client messages (ping/pong, etc.)
	go func() {
		defer func() {
			h.unregister <- conn
		}()

		conn.SetReadLimit(512)
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket error: %v", err)
				}
				break
			}
		}
	}()
}

// sendInitialData sends initial dashboard data to a new client
func (h *DashboardHub) sendInitialData(client *websocket.Conn) {
	// Get current dashboard data
	data := h.getCurrentDashboardData()
	
	message := map[string]interface{}{
		"type":      "initial_data",
		"payload":   data,
		"timestamp": time.Now(),
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal initial data: %v", err)
		return
	}

	if err := client.WriteMessage(websocket.TextMessage, messageBytes); err != nil {
		log.Printf("Failed to send initial data: %v", err)
	}
}

// startPeriodicUpdates sends periodic updates to all connected clients
func (h *DashboardHub) startPeriodicUpdates() {
	ticker := time.NewTicker(30 * time.Second) // Update every 30 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.broadcastUpdate()
		}
	}
}

// broadcastUpdate sends updated data to all connected clients
func (h *DashboardHub) broadcastUpdate() {
	data := h.getCurrentDashboardData()
	
	message := map[string]interface{}{
		"type":      "update",
		"payload":   data,
		"timestamp": time.Now(),
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal update data: %v", err)
		return
	}

	select {
	case h.broadcast <- messageBytes:
	default:
		// Channel is full, skip this update
	}
}

// BroadcastCommit sends a new commit notification to all clients
func (h *DashboardHub) BroadcastCommit(commitHash, message string) {
	notification := map[string]interface{}{
		"type": "commit",
		"payload": map[string]interface{}{
			"hash":    commitHash,
			"message": message,
		},
		"timestamp": time.Now(),
	}

	messageBytes, err := json.Marshal(notification)
	if err != nil {
		log.Printf("Failed to marshal commit notification: %v", err)
		return
	}

	select {
	case h.broadcast <- messageBytes:
	default:
		// Channel is full, skip this notification
	}
}

// BroadcastInsight sends a new insight to all clients
func (h *DashboardHub) BroadcastInsight(insight map[string]interface{}) {
	notification := map[string]interface{}{
		"type":      "insight",
		"payload":   insight,
		"timestamp": time.Now(),
	}

	messageBytes, err := json.Marshal(notification)
	if err != nil {
		log.Printf("Failed to marshal insight notification: %v", err)
		return
	}

	select {
	case h.broadcast <- messageBytes:
	default:
		// Channel is full, skip this notification
	}
}

// getCurrentDashboardData retrieves current dashboard data
func (h *DashboardHub) getCurrentDashboardData() map[string]interface{} {
	// This would typically fetch real data from the ADES service
	// For now, return sample data
	return map[string]interface{}{
		"analytics": map[string]interface{}{
			"totalCommits":     150,
			"activeDevelopers": 5,
			"codeQualityScore": 85,
			"technicalDebt":    "Low",
			"commitTrends": map[string]interface{}{
				"labels": []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"},
				"values": []int{5, 8, 12, 6, 15, 3, 2},
			},
			"languageDistribution": map[string]interface{}{
				"languages":   []string{"Go", "JavaScript", "CSS", "HTML", "Markdown"},
				"percentages": []float64{45.2, 28.7, 12.1, 8.9, 5.1},
			},
			"developerActivity": map[string]interface{}{
				"developers": []string{"Alice", "Bob", "Charlie", "Diana", "Eve"},
				"commits":    []int{45, 38, 29, 22, 16},
			},
		},
		"insights": map[string]interface{}{
			"insights": []map[string]interface{}{
				{
					"title":       "High Code Quality Detected",
					"description": "Recent commits show improved code quality metrics",
					"priority":    "high",
					"icon":        "⭐",
					"action":      "view-details",
					"actionLabel": "View Details",
				},
				{
					"title":       "New Pattern Identified",
					"description": "A reusable authentication pattern has been detected",
					"priority":    "medium",
					"icon":        "🔍",
					"action":      "view-pattern",
					"actionLabel": "View Pattern",
				},
			},
			"knowledgeGraph": map[string]interface{}{
				"nodes": []map[string]interface{}{
					{"id": "auth", "label": "Authentication", "size": 10, "color": "#667eea"},
					{"id": "api", "label": "API", "size": 8, "color": "#764ba2"},
					{"id": "ui", "label": "User Interface", "size": 6, "color": "#f093fb"},
				},
				"links": []map[string]interface{}{
					{"source": "auth", "target": "api", "value": 5},
					{"source": "api", "target": "ui", "value": 3},
				},
			},
		},
		"semantics": map[string]interface{}{
			"features":      20,
			"fixes":         15,
			"refactoring":   10,
			"documentation": 8,
			"testing":       12,
			"performance":   5,
		},
	}
} 