import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslation } from "react-i18next"
import { useNotifications } from "@/hooks/useNotifications"
import { api } from "@/lib/api"
import {
  GitCommit,
  Users,
  Code,
  Brain,
  MessageSquare,
  Search,
  Lightbulb,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  RefreshCw,
  Download
} from "lucide-react"
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"

interface DashboardData {
  totalCommits: number
  activeDevelopers: number
  codeQualityScore: number
  technicalDebt: string
  commitTrends: {
    labels: string[]
    values: number[]
  }
  languageDistribution: {
    languages: string[]
    percentages: number[]
  }
  developerActivity: {
    developers: string[]
    commits: number[]
  }
  recentInsights?: any[]
  patterns?: any[]
  aiMetrics?: any
}

interface AICapabilities {
  enabled: boolean
  capabilities: string[]
  status: string
}

interface AnalysisProgress {
  status: string
  processed: number
  total: number
  current_phase?: string
}

interface AIStatus {
  enabled: boolean
  status: string
}

interface AICapabilitiesResponse {
  capabilities: string[]
}

interface SearchResponse {
  results: any[]
}

// Chart configurations
const commitTrendConfig = {
  commits: {
    label: "Commits",
    theme: {
      light: "hsl(220 70% 50%)",
      dark: "hsl(220 70% 60%)",
    },
  },
} satisfies ChartConfig

const languageConfig = {
  javascript: {
    label: "JavaScript",
    theme: {
      light: "hsl(45 93% 47%)",
      dark: "hsl(45 93% 57%)",
    },
  },
  typescript: {
    label: "TypeScript", 
    theme: {
      light: "hsl(221 83% 53%)",
      dark: "hsl(221 83% 63%)",
    },
  },
  python: {
    label: "Python",
    theme: {
      light: "hsl(210 40% 50%)",
      dark: "hsl(210 40% 60%)",
    },
  },
  go: {
    label: "Go",
    theme: {
      light: "hsl(176 57% 40%)",
      dark: "hsl(176 57% 50%)",
    },
  },
  rust: {
    label: "Rust",
    theme: {
      light: "hsl(17 88% 40%)",
      dark: "hsl(17 88% 50%)",
    },
  },
  html: {
    label: "HTML",
    theme: {
      light: "hsl(14 100% 57%)",
      dark: "hsl(14 100% 67%)",
    },
  },
  css: {
    label: "CSS",
    theme: {
      light: "hsl(219 79% 66%)",
      dark: "hsl(219 79% 76%)",
    },
  },
  markdown: {
    label: "Markdown",
    theme: {
      light: "hsl(210 11% 15%)",
      dark: "hsl(210 11% 85%)",
    },
  },
  other: {
    label: "Other",
    theme: {
      light: "hsl(240 5% 64%)",
      dark: "hsl(240 5% 74%)",
    },
  },
} satisfies ChartConfig

const developerConfig = {
  commits: {
    label: "Commits",
    theme: {
      light: "hsl(142 76% 36%)",
      dark: "hsl(142 76% 46%)",
    },
  },
} satisfies ChartConfig

export function Dashboard() {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [aiCapabilities, setAICapabilities] = useState<AICapabilities | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState("overview")

  useEffect(() => {
    loadDashboardData()
    loadAICapabilities()
    loadAnalysisProgress()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const [analytics, insights, patterns] = await Promise.all([
        api.getAnalytics(),
        api.getDevelopmentInsights().catch(() => ({ insights: [] })),
        api.extractReusablePatterns().catch(() => ({ patterns: [] }))
      ])
      
      setDashboardData({
        ...(analytics as DashboardData),
        recentInsights: (insights as any)?.insights || [],
        patterns: (patterns as any)?.patterns || []
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load dashboard data'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAICapabilities = async () => {
    try {
      const [status, capabilities] = await Promise.all([
        api.getAIStatus(),
        api.getAICapabilities().catch(() => ({ capabilities: [] }))
      ])
      
      const aiStatus = status as AIStatus
      const aiCaps = capabilities as AICapabilitiesResponse
      
      setAICapabilities({
        enabled: aiStatus.enabled,
        capabilities: aiCaps.capabilities || [],
        status: aiStatus.status
      })
    } catch (error) {
      console.error('Failed to load AI capabilities:', error)
    }
  }

  const loadAnalysisProgress = async () => {
    try {
      const progress = await api.getAnalysisProgress() as AnalysisProgress
      setAnalysisProgress(progress)
    } catch (error) {
      console.error('Failed to load analysis progress:', error)
    }
  }

  const runComprehensiveAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      await api.analyzeRepositoryComprehensive({ async: true })
      addNotification({
        type: 'success',
        title: 'Analysis Started',
        message: 'Comprehensive repository analysis has been started'
      })
      
      // Poll for progress updates
      const interval = setInterval(async () => {
        const progress = await api.getAnalysisProgress() as AnalysisProgress
        setAnalysisProgress(progress)
        
        if (progress?.status === 'completed' || progress?.status === 'failed') {
          clearInterval(interval)
          setIsAnalyzing(false)
          if (progress.status === 'completed') {
            loadDashboardData()
          }
        }
      }, 2000)
    } catch (error) {
      setIsAnalyzing(false)
      addNotification({
        type: 'error',
        title: 'Analysis Failed',
        message: error instanceof Error ? error.message : 'Analysis failed'
      })
    }
  }

  const handleAIChat = async () => {
    if (!chatInput.trim() || !aiCapabilities?.enabled) return

    try {
      const response = await api.chatWithAI(chatInput)
      setChatHistory(prev => [...prev, 
        { type: 'user', message: chatInput },
        { type: 'ai', ...(response as any) }
      ])
      setChatInput("")
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'AI Chat Error',
        message: error instanceof Error ? error.message : 'Chat failed'
      })
    }
  }

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const results = await api.semanticSearch(searchQuery, 10) as SearchResponse
      setSearchResults(results.results || [])
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Search Error',
        message: error instanceof Error ? error.message : 'Search failed'
      })
    }
  }

  const exportKnowledgeGraph = async () => {
    try {
      const graph = await api.exportKnowledgeGraph()
      const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'knowledge-graph.json'
      a.click()
      URL.revokeObjectURL(url)
      
      addNotification({
        type: 'success',
        title: 'Export Complete',
        message: 'Knowledge graph exported successfully'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Export failed'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{t('dashboard.loading')}</p>
        </div>
      </div>
    )
  }

  const commitTrendData = dashboardData?.commitTrends ? 
    dashboardData.commitTrends.labels.map((label, index) => ({
      name: label,
      commits: dashboardData.commitTrends.values[index]
    })) : []

  const languageData = dashboardData?.languageDistribution ?
    dashboardData.languageDistribution.languages.map((lang, index) => {
      const langKey = lang.toLowerCase();
      // Check if we have a specific color for this language, otherwise use 'other'
      const colorKey = (languageConfig as any)[langKey] ? langKey : 'other';
      return {
        name: lang,
        value: dashboardData.languageDistribution.percentages[index],
        fill: `var(--color-${colorKey})`
      };
    }) : []

  const developerData = dashboardData?.developerActivity ?
    dashboardData.developerActivity.developers.map((dev, index) => ({
      name: dev,
      commits: dashboardData.developerActivity.commits[index]
    })) : []

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('dashboard.refresh')}
          </Button>
          <Button onClick={runComprehensiveAnalysis} disabled={isAnalyzing}>
            <Brain className="h-4 w-4 mr-2" />
            {isAnalyzing ? t('dashboard.analyzing') : t('dashboard.run_analysis')}
          </Button>
          <Button onClick={exportKnowledgeGraph} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('dashboard.export_graph')}
          </Button>
        </div>
      </div>

      {/* Analysis Progress */}
      {analysisProgress && analysisProgress.status !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('dashboard.analysis_progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Status: {analysisProgress.status}</span>
                <span>{analysisProgress.processed || 0} / {analysisProgress.total || 0}</span>
              </div>
              <Progress value={(analysisProgress.processed / analysisProgress.total) * 100 || 0} />
              {analysisProgress.current_phase && (
                <p className="text-sm text-muted-foreground">
                  Current: {analysisProgress.current_phase}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('dashboard.analytics')}</TabsTrigger>
          <TabsTrigger value="insights">{t('dashboard.insights')}</TabsTrigger>
          <TabsTrigger value="ai">{t('dashboard.ai_features')}</TabsTrigger>
          <TabsTrigger value="search">{t('dashboard.search')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.total_commits')}</CardTitle>
                <GitCommit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.totalCommits || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.active_developers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.activeDevelopers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.code_quality')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.codeQualityScore || 0}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.technical_debt')}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant={dashboardData?.technicalDebt === 'Low' ? 'default' : 'destructive'}>
                    {dashboardData?.technicalDebt || 'Unknown'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Status */}
          {aiCapabilities && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  {t('dashboard.ai_status')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Badge variant={aiCapabilities.enabled ? 'default' : 'secondary'}>
                    {aiCapabilities.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {aiCapabilities.capabilities.length} capabilities available
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Commit Trends */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.commit_activity')}</CardTitle>
                <CardDescription>{t('dashboard.daily_trends')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={commitTrendConfig} className="h-[300px]">
                  <BarChart data={commitTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                    <XAxis 
                      dataKey="name" 
                      className="text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="commits" fill="var(--color-commits)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Language Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.language_distribution')}</CardTitle>
                <CardDescription>{t('dashboard.codebase_composition')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={languageConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                      stroke="var(--color-background)"
                      strokeWidth={2}
                    >
                      {languageData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Developer Activity */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t('dashboard.developer_contributions')}</CardTitle>
                <CardDescription>{t('dashboard.commit_count_by_dev')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={developerConfig} className="h-[300px]">
                  <BarChart data={developerData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                    <XAxis 
                      type="number" 
                      className="text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      className="text-muted-foreground"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="commits" fill="var(--color-commits)" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  {t('dashboard.development_insights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {dashboardData?.recentInsights?.length ? (
                    <div className="space-y-3">
                      {dashboardData.recentInsights.map((insight, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <h4 className="font-medium">{insight.title || `Insight ${index + 1}`}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insight.description || insight.message || 'No description available'}
                          </p>
                          {insight.confidence && (
                            <div className="mt-2">
                              <Badge variant="outline">
                                Confidence: {Math.round(insight.confidence * 100)}%
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {t('dashboard.no_insights')}
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Reusable Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  {t('dashboard.reusable_patterns')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {dashboardData?.patterns?.length ? (
                    <div className="space-y-3">
                      {dashboardData.patterns.map((pattern, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <h4 className="font-medium">{pattern.name || `Pattern ${index + 1}`}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {pattern.description || 'No description available'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {pattern.reusability_score && (
                              <Badge variant="outline">
                                Score: {pattern.reusability_score}
                              </Badge>
                            )}
                            {pattern.occurrences && (
                              <Badge variant="outline">
                                Used: {pattern.occurrences}x
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {t('dashboard.no_patterns')}
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {aiCapabilities?.enabled ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* AI Chat */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t('dashboard.ai_assistant')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-64 border rounded p-3">
                    {chatHistory.length ? (
                      <div className="space-y-3">
                        {chatHistory.map((msg, index) => (
                          <div key={index} className={`p-2 rounded ${
                            msg.type === 'user' ? 'bg-primary text-primary-foreground ml-4' : 'bg-muted mr-4'
                          }`}>
                            <p className="text-sm">{msg.message || msg.response}</p>
                            {msg.intent && (
                              <Badge variant="outline" className="mt-1">
                                {msg.intent}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {t('dashboard.start_conversation')}
                      </p>
                    )}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('dashboard.ask_ai')}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAIChat()}
                    />
                    <Button onClick={handleAIChat} disabled={!chatInput.trim()}>
                      {t('dashboard.send')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Capabilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    {t('dashboard.ai_capabilities')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aiCapabilities.capabilities.map((capability, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{capability}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">{t('dashboard.ai_disabled')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboard.configure_openai')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                {t('dashboard.semantic_search')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.search_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={t('dashboard.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                />
                <Button onClick={handleSemanticSearch} disabled={!searchQuery.trim()}>
                  {t('dashboard.search')}
                </Button>
              </div>

              <ScrollArea className="h-64">
                {searchResults.length ? (
                  <div className="space-y-3">
                    {searchResults.map((result, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <h4 className="font-medium">{result.title || `Result ${index + 1}`}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.description || result.content}
                        </p>
                        {result.similarity && (
                          <Badge variant="outline" className="mt-2">
                            Similarity: {Math.round(result.similarity * 100)}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {t('dashboard.no_search_results')}
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 