package graphql

import (
	"context"
	"fmt"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/knoxai/gait/internal/ades"
)

// GraphQLService provides GraphQL API functionality
type GraphQLService struct {
	adesService *ades.Service
	schema      graphql.Schema
}

// NewGraphQLService creates a new GraphQL service
func NewGraphQLService(adesService *ades.Service) (*GraphQLService, error) {
	service := &GraphQLService{
		adesService: adesService,
	}

	schema, err := service.buildSchema()
	if err != nil {
		return nil, fmt.Errorf("failed to build GraphQL schema: %w", err)
	}

	service.schema = schema
	return service, nil
}

// GetSchema returns the GraphQL schema
func (g *GraphQLService) GetSchema() graphql.Schema {
	return g.schema
}

// buildSchema constructs the GraphQL schema
func (g *GraphQLService) buildSchema() (graphql.Schema, error) {
	// Define custom scalar types
	dateTimeType := graphql.NewScalar(graphql.ScalarConfig{
		Name:        "DateTime",
		Description: "DateTime scalar type",
		Serialize: func(value interface{}) interface{} {
			switch v := value.(type) {
			case time.Time:
				return v.Format(time.RFC3339)
			case *time.Time:
				return v.Format(time.RFC3339)
			default:
				return nil
			}
		},
	})

	// Define object types
	commitType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "Commit",
		Description: "A Git commit",
		Fields: graphql.Fields{
			"hash": &graphql.Field{
				Type:        graphql.String,
				Description: "The commit hash",
			},
			"message": &graphql.Field{
				Type:        graphql.String,
				Description: "The commit message",
			},
			"author": &graphql.Field{
				Type:        graphql.String,
				Description: "The commit author",
			},
			"date": &graphql.Field{
				Type:        dateTimeType,
				Description: "The commit date",
			},
			"files": &graphql.Field{
				Type:        graphql.NewList(graphql.String),
				Description: "Files changed in this commit",
			},
		},
	})

	semanticAnalysisType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "SemanticAnalysis",
		Description: "Semantic analysis of a commit",
		Fields: graphql.Fields{
			"commitHash": &graphql.Field{
				Type:        graphql.String,
				Description: "The commit hash",
			},
			"intent": &graphql.Field{
				Type:        graphql.String,
				Description: "The detected intent",
			},
			"confidence": &graphql.Field{
				Type:        graphql.Float,
				Description: "Confidence score",
			},
			"topics": &graphql.Field{
				Type:        graphql.NewList(graphql.String),
				Description: "Detected topics",
			},
			"complexity": &graphql.Field{
				Type:        graphql.String,
				Description: "Complexity level",
			},
		},
	})

	patternType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "Pattern",
		Description: "A reusable code pattern",
		Fields: graphql.Fields{
			"id": &graphql.Field{
				Type:        graphql.String,
				Description: "Pattern ID",
			},
			"name": &graphql.Field{
				Type:        graphql.String,
				Description: "Pattern name",
			},
			"description": &graphql.Field{
				Type:        graphql.String,
				Description: "Pattern description",
			},
			"occurrences": &graphql.Field{
				Type:        graphql.Int,
				Description: "Number of occurrences",
			},
			"reusability": &graphql.Field{
				Type:        graphql.Float,
				Description: "Reusability score",
			},
		},
	})

	insightType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "Insight",
		Description: "Development insight",
		Fields: graphql.Fields{
			"title": &graphql.Field{
				Type:        graphql.String,
				Description: "Insight title",
			},
			"description": &graphql.Field{
				Type:        graphql.String,
				Description: "Insight description",
			},
			"priority": &graphql.Field{
				Type:        graphql.String,
				Description: "Priority level",
			},
			"category": &graphql.Field{
				Type:        graphql.String,
				Description: "Insight category",
			},
		},
	})

	knowledgeNodeType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "KnowledgeNode",
		Description: "Knowledge graph node",
		Fields: graphql.Fields{
			"id": &graphql.Field{
				Type:        graphql.String,
				Description: "Node ID",
			},
			"type": &graphql.Field{
				Type:        graphql.String,
				Description: "Node type",
			},
			"label": &graphql.Field{
				Type:        graphql.String,
				Description: "Node label",
			},
			"properties": &graphql.Field{
				Type:        graphql.String, // JSON string
				Description: "Node properties as JSON",
			},
		},
	})

	knowledgeEdgeType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "KnowledgeEdge",
		Description: "Knowledge graph edge",
		Fields: graphql.Fields{
			"source": &graphql.Field{
				Type:        graphql.String,
				Description: "Source node ID",
			},
			"target": &graphql.Field{
				Type:        graphql.String,
				Description: "Target node ID",
			},
			"type": &graphql.Field{
				Type:        graphql.String,
				Description: "Edge type",
			},
			"weight": &graphql.Field{
				Type:        graphql.Float,
				Description: "Edge weight",
			},
		},
	})

	repositoryStatsType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "RepositoryStats",
		Description: "Repository statistics",
		Fields: graphql.Fields{
			"totalCommits": &graphql.Field{
				Type:        graphql.Int,
				Description: "Total number of commits",
			},
			"totalFiles": &graphql.Field{
				Type:        graphql.Int,
				Description: "Total number of files",
			},
			"activeDevelopers": &graphql.Field{
				Type:        graphql.Int,
				Description: "Number of active developers",
			},
			"languages": &graphql.Field{
				Type:        graphql.NewList(graphql.String),
				Description: "Programming languages used",
			},
			"codeQualityScore": &graphql.Field{
				Type:        graphql.Float,
				Description: "Code quality score",
			},
		},
	})

	// Define input types
	timeRangeInputType := graphql.NewInputObject(graphql.InputObjectConfig{
		Name:        "TimeRangeInput",
		Description: "Time range filter",
		Fields: graphql.InputObjectConfigFieldMap{
			"start": &graphql.InputObjectFieldConfig{
				Type:        dateTimeType,
				Description: "Start date",
			},
			"end": &graphql.InputObjectFieldConfig{
				Type:        dateTimeType,
				Description: "End date",
			},
		},
	})

	searchFiltersInputType := graphql.NewInputObject(graphql.InputObjectConfig{
		Name:        "SearchFiltersInput",
		Description: "Search filters",
		Fields: graphql.InputObjectConfigFieldMap{
			"authors": &graphql.InputObjectFieldConfig{
				Type:        graphql.NewList(graphql.String),
				Description: "Filter by authors",
			},
			"fileTypes": &graphql.InputObjectFieldConfig{
				Type:        graphql.NewList(graphql.String),
				Description: "Filter by file types",
			},
			"intent": &graphql.InputObjectFieldConfig{
				Type:        graphql.NewList(graphql.String),
				Description: "Filter by intent",
			},
			"dateRange": &graphql.InputObjectFieldConfig{
				Type:        timeRangeInputType,
				Description: "Filter by date range",
			},
		},
	})

	// Define root query type
	queryType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "Query",
		Description: "Root query type",
		Fields: graphql.Fields{
			"commits": &graphql.Field{
				Type:        graphql.NewList(commitType),
				Description: "Get commits",
				Args: graphql.FieldConfigArgument{
					"limit": &graphql.ArgumentConfig{
						Type:         graphql.Int,
						DefaultValue: 10,
						Description:  "Number of commits to return",
					},
					"offset": &graphql.ArgumentConfig{
						Type:         graphql.Int,
						DefaultValue: 0,
						Description:  "Offset for pagination",
					},
				},
				Resolve: g.resolveCommits,
			},
			"commit": &graphql.Field{
				Type:        commitType,
				Description: "Get a specific commit",
				Args: graphql.FieldConfigArgument{
					"hash": &graphql.ArgumentConfig{
						Type:        graphql.NewNonNull(graphql.String),
						Description: "Commit hash",
					},
				},
				Resolve: g.resolveCommit,
			},
			"semanticAnalysis": &graphql.Field{
				Type:        graphql.NewList(semanticAnalysisType),
				Description: "Get semantic analysis results",
				Args: graphql.FieldConfigArgument{
					"commitHash": &graphql.ArgumentConfig{
						Type:        graphql.String,
						Description: "Filter by commit hash",
					},
					"limit": &graphql.ArgumentConfig{
						Type:         graphql.Int,
						DefaultValue: 10,
						Description:  "Number of results to return",
					},
				},
				Resolve: g.resolveSemanticAnalysis,
			},
			"patterns": &graphql.Field{
				Type:        graphql.NewList(patternType),
				Description: "Get reusable patterns",
				Args: graphql.FieldConfigArgument{
					"minOccurrences": &graphql.ArgumentConfig{
						Type:         graphql.Int,
						DefaultValue: 1,
						Description:  "Minimum number of occurrences",
					},
					"limit": &graphql.ArgumentConfig{
						Type:         graphql.Int,
						DefaultValue: 10,
						Description:  "Number of patterns to return",
					},
				},
				Resolve: g.resolvePatterns,
			},
			"insights": &graphql.Field{
				Type:        graphql.NewList(insightType),
				Description: "Get development insights",
				Args: graphql.FieldConfigArgument{
					"timeRange": &graphql.ArgumentConfig{
						Type:        timeRangeInputType,
						Description: "Time range filter",
					},
				},
				Resolve: g.resolveInsights,
			},
			"knowledgeGraph": &graphql.Field{
				Type: graphql.NewObject(graphql.ObjectConfig{
					Name:        "KnowledgeGraph",
					Description: "Knowledge graph data",
					Fields: graphql.Fields{
						"nodes": &graphql.Field{
							Type:        graphql.NewList(knowledgeNodeType),
							Description: "Graph nodes",
						},
						"edges": &graphql.Field{
							Type:        graphql.NewList(knowledgeEdgeType),
							Description: "Graph edges",
						},
					},
				}),
				Description: "Get knowledge graph",
				Resolve:     g.resolveKnowledgeGraph,
			},
			"repositoryStats": &graphql.Field{
				Type:        repositoryStatsType,
				Description: "Get repository statistics",
				Resolve:     g.resolveRepositoryStats,
			},
			"searchCommits": &graphql.Field{
				Type:        graphql.NewList(commitType),
				Description: "Search commits semantically",
				Args: graphql.FieldConfigArgument{
					"query": &graphql.ArgumentConfig{
						Type:        graphql.NewNonNull(graphql.String),
						Description: "Search query",
					},
					"filters": &graphql.ArgumentConfig{
						Type:        searchFiltersInputType,
						Description: "Search filters",
					},
					"limit": &graphql.ArgumentConfig{
						Type:         graphql.Int,
						DefaultValue: 10,
						Description:  "Number of results to return",
					},
				},
				Resolve: g.resolveSearchCommits,
			},
		},
	})

	// Define root mutation type
	mutationType := graphql.NewObject(graphql.ObjectConfig{
		Name:        "Mutation",
		Description: "Root mutation type",
		Fields: graphql.Fields{
			"analyzeRepository": &graphql.Field{
				Type:        graphql.Boolean,
				Description: "Trigger repository analysis",
				Resolve:     g.mutationAnalyzeRepository,
			},
			"analyzeCommit": &graphql.Field{
				Type:        graphql.Boolean,
				Description: "Analyze a specific commit",
				Args: graphql.FieldConfigArgument{
					"hash": &graphql.ArgumentConfig{
						Type:        graphql.NewNonNull(graphql.String),
						Description: "Commit hash",
					},
				},
				Resolve: g.mutationAnalyzeCommit,
			},
		},
	})

	// Build schema
	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query:    queryType,
		Mutation: mutationType,
	})

	if err != nil {
		return graphql.Schema{}, err
	}

	return schema, nil
}

// Resolver functions
func (g *GraphQLService) resolveCommits(p graphql.ResolveParams) (interface{}, error) {
	limit := p.Args["limit"].(int)
	offset := p.Args["offset"].(int)

	// This would typically fetch from the git service
	// For now, return mock data
	commits := []map[string]interface{}{
		{
			"hash":    "abc123",
			"message": "Add new feature",
			"author":  "John Doe",
			"date":    time.Now(),
			"files":   []string{"main.go", "README.md"},
		},
		{
			"hash":    "def456",
			"message": "Fix bug in authentication",
			"author":  "Jane Smith",
			"date":    time.Now().Add(-24 * time.Hour),
			"files":   []string{"auth.go", "auth_test.go"},
		},
	}

	// Apply pagination
	start := offset
	end := offset + limit
	if start >= len(commits) {
		return []map[string]interface{}{}, nil
	}
	if end > len(commits) {
		end = len(commits)
	}

	return commits[start:end], nil
}

func (g *GraphQLService) resolveCommit(p graphql.ResolveParams) (interface{}, error) {
	hash := p.Args["hash"].(string)

	// Mock implementation
	return map[string]interface{}{
		"hash":    hash,
		"message": "Sample commit message",
		"author":  "Developer",
		"date":    time.Now(),
		"files":   []string{"file1.go", "file2.go"},
	}, nil
}

func (g *GraphQLService) resolveSemanticAnalysis(p graphql.ResolveParams) (interface{}, error) {
	// Mock implementation
	return []map[string]interface{}{
		{
			"commitHash": "abc123",
			"intent":     "feature",
			"confidence": 0.95,
			"topics":     []string{"authentication", "security"},
			"complexity": "medium",
		},
	}, nil
}

func (g *GraphQLService) resolvePatterns(p graphql.ResolveParams) (interface{}, error) {
	ctx := context.Background()
	minOccurrences := p.Args["minOccurrences"].(int)

	patterns, err := g.adesService.ExtractReusablePatterns(ctx, "", minOccurrences)
	if err != nil {
		return nil, err
	}

	return patterns, nil
}

func (g *GraphQLService) resolveInsights(p graphql.ResolveParams) (interface{}, error) {
	ctx := context.Background()
	timeRange := ades.TimeRange{
		Start: time.Now().AddDate(0, -1, 0),
		End:   time.Now(),
	}

	insights, err := g.adesService.GetDevelopmentInsights(ctx, "", timeRange)
	if err != nil {
		return nil, err
	}

	return insights, nil
}

func (g *GraphQLService) resolveKnowledgeGraph(p graphql.ResolveParams) (interface{}, error) {
	stats, err := g.adesService.GetKnowledgeGraphStats()
	if err != nil {
		return nil, err
	}

	// Mock graph data based on stats
	return map[string]interface{}{
		"nodes": []map[string]interface{}{
			{
				"id":         "node1",
				"type":       "component",
				"label":      "Authentication",
				"properties": `{"importance": "high"}`,
			},
		},
		"edges": []map[string]interface{}{
			{
				"source": "node1",
				"target": "node2",
				"type":   "depends_on",
				"weight": 0.8,
			},
		},
	}, nil
}

func (g *GraphQLService) resolveRepositoryStats(p graphql.ResolveParams) (interface{}, error) {
	analytics, err := g.adesService.GetAnalyticsData()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"totalCommits":     analytics.TotalCommitsAnalyzed,
		"totalFiles":       100, // Mock data
		"activeDevelopers": 5,   // Mock data
		"languages":        analytics.TopTechnologies,
		"codeQualityScore": analytics.ReusabilityScore,
	}, nil
}

func (g *GraphQLService) resolveSearchCommits(p graphql.ResolveParams) (interface{}, error) {
	query := p.Args["query"].(string)
	ctx := context.Background()

	// Use ADES semantic search
	results, err := g.adesService.SearchSemanticCommits(ctx, query, ades.SearchFilters{})
	if err != nil {
		return nil, err
	}

	// Convert to GraphQL format
	commits := make([]map[string]interface{}, len(results))
	for i, result := range results {
		commits[i] = map[string]interface{}{
			"hash":    result.Hash,
			"message": result.Message,
			"author":  result.Author,
			"date":    result.Date,
			"files":   []string{}, // Would need to fetch from git service
		}
	}

	return commits, nil
}

func (g *GraphQLService) mutationAnalyzeRepository(p graphql.ResolveParams) (interface{}, error) {
	err := g.adesService.AnalyzeRepository()
	return err == nil, err
}

func (g *GraphQLService) mutationAnalyzeCommit(p graphql.ResolveParams) (interface{}, error) {
	hash := p.Args["hash"].(string)
	
	// This would need to be implemented in the ADES service
	// For now, return success
	_ = hash
	return true, nil
} 