# ADES - AI Development Experience System

## 🎯 Overview

ADES (AI Development Experience System) is an innovative extension to GAIT that transforms Git repositories into intelligent knowledge bases. It analyzes commit history to extract development experiences, patterns, and reusable components, providing AI assistants with contextual, project-specific intelligence.

## ✨ Features

### 🔍 Intelligent Commit Analysis
- **Automatic Classification**: Categorizes commits by type (feature, bugfix, refactor, etc.)
- **Scope Detection**: Identifies whether changes affect frontend, backend, database, etc.
- **Impact Assessment**: Evaluates the magnitude of changes (major, minor, patch)
- **Technology Extraction**: Automatically detects technologies used in commits

### 🧩 Pattern Recognition
- **Code Pattern Detection**: Identifies recurring code structures and design patterns
- **Component Extraction**: Finds reusable UI components, utility functions, and services
- **Architecture Analysis**: Detects architectural patterns and best practices
- **Dependency Mapping**: Tracks relationships between components and modules

### 📚 Experience Database
- **Searchable Knowledge Base**: Full-text search across development experiences
- **Categorized Storage**: Organized by type, technology, and reusability score
- **Confidence Scoring**: AI-generated confidence levels for each experience
- **Usage Tracking**: Monitors which experiences are most valuable

### 🔗 AI Integration Ready
- **MCP Protocol Support**: Ready for integration with AI assistants like Claude
- **Contextual Queries**: Provides relevant historical context for AI responses
- **Similar Implementation Search**: Finds related solutions from past work
- **Pattern-Based Suggestions**: Recommends code patterns based on project history

## 🚀 Getting Started

### Prerequisites
- Go 1.21 or later
- SQLite3
- Git repository to analyze

### Installation

1. **Clone and build GAIT with ADES**:
```bash
git clone <your-gait-repo>
cd gait
go mod tidy
go build
```

2. **Run GAIT with ADES enabled**:
```bash
./gait --repo /path/to/your/git/repo --port 8080
```

3. **Access the web interface**:
```
http://localhost:8080
```

### First Time Setup

When you first run GAIT with ADES, it will:
1. Create a `.gait/ades.db` SQLite database in your repository
2. Initialize the database schema
3. Be ready to analyze commits on demand

## 📖 Usage

### API Endpoints

#### 🔍 Search Development Experiences
```bash
# Search for experiences containing "authentication"
GET /api/ades/experiences/search?q=authentication&limit=10

# Search by category (0=UIComponent, 1=BackendLogic, etc.)
GET /api/ades/experiences/search?category=1&limit=5

# Search by technology
GET /api/ades/experiences/search?language=javascript&limit=10
```

#### 🧩 Find Similar Implementations
```bash
# Find similar code implementations
POST /api/ades/similar
Content-Type: application/json

{
  "code_snippet": "function authenticate(token) { ... }",
  "context": "user authentication"
}
```

#### 🔧 Extract Reusable Patterns
```bash
# Get all React component patterns
GET /api/ades/patterns?type=react_component

# Get patterns from specific commit
GET /api/ades/patterns?commit_hash=abc123&type=http_handler
```

#### 📊 Repository Analysis
```bash
# Trigger full repository analysis (runs in background)
POST /api/ades/analyze

# Run incremental analysis (only new commits)
POST /api/ades/analyze/incremental

# Get analytics data
GET /api/ades/analytics
```

#### 📈 Get Insights
```bash
# Get recent experiences
GET /api/ades/experiences/recent?limit=10

# Get high-confidence experiences
GET /api/ades/experiences/high-confidence?min_confidence=0.8

# Get current workflow context
GET /api/ades/context
```

### Programmatic Usage

```go
package main

import (
    "github.com/knoxai/gait/internal/ades"
    "github.com/knoxai/gait/internal/git"
)

func main() {
    // Initialize Git service
    gitService := git.NewService("/path/to/repo")
    
    // Initialize ADES
    adesService, err := ades.NewService(gitService)
    if err != nil {
        panic(err)
    }
    defer adesService.Close()
    
    // Analyze repository
    err = adesService.AnalyzeRepository()
    if err != nil {
        panic(err)
    }
    
    // Search for experiences
    query := models.SearchQuery{
        Query: "authentication",
        Limit: 10,
    }
    
    results, err := adesService.SearchExperiences(query)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Found %d experiences\n", len(results.Experiences))
}
```

## 🏗️ Architecture

### Core Components

```
ADES Architecture
├── 📊 Analyzer
│   ├── CommitAnalyzer - Analyzes individual commits
│   └── PatternDetector - Detects code patterns and components
├── 💾 Storage
│   ├── Database - SQLite database management
│   ├── Repositories - Data access layer
│   └── Migrations - Database schema management
├── 🔧 Models
│   ├── Types - Core data structures
│   ├── Classifications - Commit categorization
│   └── Experiences - Development experience entries
└── 🌐 API
    ├── Handlers - HTTP request handlers
    └── Integration - GAIT integration layer
```

### Data Flow

1. **Commit Analysis**: Git commits are analyzed for type, scope, and impact
2. **Pattern Detection**: Code patterns and reusable components are identified
3. **Experience Extraction**: Development experiences are created and stored
4. **Indexing**: Full-text search indexes are maintained
5. **API Access**: RESTful API provides access to analyzed data

## 🎯 Use Cases

### For Individual Developers

**Scenario**: You need to implement user authentication but can't remember how you did it before.

```bash
# Search for authentication experiences
curl "http://localhost:8080/api/ades/experiences/search?q=authentication"

# Get similar implementations
curl -X POST http://localhost:8080/api/ades/similar \
  -H "Content-Type: application/json" \
  -d '{"context": "user authentication", "code_snippet": "login function"}'
```

### For AI Assistants

**Scenario**: AI assistant needs context about how the team typically implements API endpoints.

```bash
# Get API handler patterns
curl "http://localhost:8080/api/ades/patterns?type=api_handler"

# Get recent backend experiences
curl "http://localhost:8080/api/ades/experiences/search?category=1&limit=5"
```

### For Team Knowledge Sharing

**Scenario**: New team member wants to understand project patterns and best practices.

```bash
# Get high-confidence experiences (proven patterns)
curl "http://localhost:8080/api/ades/experiences/high-confidence?min_confidence=0.9"

# Get analytics overview
curl "http://localhost:8080/api/ades/analytics"
```

## 🔧 Configuration

### Database Location
ADES creates its database at `.gait/ades.db` in your repository root. This keeps the analysis data with your project.

### Analysis Scope
By default, ADES analyzes:
- Recent 100 commits on initial run
- New commits on incremental analysis
- All file types (with binary file filtering)

### Pattern Detection
ADES recognizes patterns for:
- **Go**: HTTP handlers, structs, interfaces, error handling
- **JavaScript/TypeScript**: React components, async/await, Express routes
- **SQL**: Queries and database operations
- **Docker**: Configuration patterns
- **REST APIs**: Endpoint patterns

## 📊 Analytics & Insights

ADES provides rich analytics about your development patterns:

- **Commit Classification Distribution**: See what types of changes are most common
- **Technology Usage**: Track which technologies are used most frequently
- **Pattern Frequency**: Identify the most common code patterns
- **Reusability Scores**: Find the most reusable components and patterns
- **Development Trends**: Understand how your codebase evolves over time

## 🔮 Future Enhancements

### Sprint 2: Intelligence Engine (In Progress)
- Vector database integration for semantic similarity
- Advanced NLP for commit message analysis
- Knowledge graph construction
- Enhanced pattern recognition

### Sprint 3: MCP Integration (Planned)
- Full MCP server implementation
- AI assistant tool definitions
- Context provider interfaces
- Real-time AI integration

### Sprint 4: Advanced Features (Planned)
- Intelligent code suggestions
- Cross-repository learning
- Team knowledge aggregation
- Visual experience exploration

## 🤝 Contributing

ADES is part of the GAIT project. Contributions are welcome!

### Development Setup
```bash
# Clone the repository
git clone <repo-url>
cd gait

# Install dependencies
go mod tidy

# Run tests
go test ./internal/ades/...

# Build and run
go build && ./gait --repo .
```

### Adding New Pattern Detectors
```go
// Add to internal/ades/patterns/detector.go
{
    Name:        "Your Pattern",
    Type:        "pattern_type",
    Language:    "language",
    Regex:       regexp.MustCompile(`your_regex`),
    Description: "Pattern description",
    Confidence:  0.8,
}
```

## 📄 License

ADES is part of GAIT and follows the same licensing terms.

## 🆘 Support

- **Issues**: Report bugs and feature requests in the GAIT repository
- **Documentation**: See `AI_DEVELOPMENT_EXPERIENCE_SYSTEM.md` for detailed specifications
- **Roadmap**: Check `ADES_ROADMAP_STATUS.md` for current progress

---

**Ready to revolutionize your development workflow with AI-powered experience extraction? Start using ADES today! 🚀** 