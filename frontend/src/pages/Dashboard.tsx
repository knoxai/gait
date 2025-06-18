import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useTranslation } from "react-i18next"
import { useWebSocket } from "@/hooks/useWebSocket"
import type { DashboardData } from "@/lib/types"
import {
  BarChart3,
  TrendingUp,
  Users,
  GitCommit,
  Clock,
  Zap,
  Brain,
  Activity,
  RefreshCw,
  Lightbulb,
  Code,
  FileText,
  Bug,
  Wrench,
  TestTube,
  Gauge,
  Network,
  ArrowLeft
} from "lucide-react"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function Dashboard() {
  const { t } = useTranslation()
  const { isConnected, connectionStatus } = useWebSocket('/ws/dashboard')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)
      try {
        // This would be replaced with actual API call
        const mockData: DashboardData = {
          repositoryStats: {
            totalCommits: 1247,
            activeDevelopers: 8,
            codeQualityScore: 85,
            technicalDebt: 12
          },
          commitActivity: {
            daily: Array.from({ length: 30 }, (_, i) => ({
              date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              count: Math.floor(Math.random() * 20) + 5
            })),
            weekly: Array.from({ length: 12 }, (_, i) => ({
              week: `Week ${i + 1}`,
              count: Math.floor(Math.random() * 100) + 50
            })),
            monthly: Array.from({ length: 6 }, (_, i) => ({
              month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en', { month: 'short' }),
              count: Math.floor(Math.random() * 300) + 200
            }))
          },
          languageDistribution: [
            { language: 'TypeScript', percentage: 45, lines: 25430 },
            { language: 'Go', percentage: 30, lines: 18250 },
            { language: 'JavaScript', percentage: 15, lines: 9120 },
            { language: 'CSS', percentage: 7, lines: 4200 },
            { language: 'HTML', percentage: 3, lines: 1800 }
          ],
          developerContributions: [
            { name: 'Pablo Wang', commits: 342, additions: 15420, deletions: 8230 },
            { name: 'Alex Chen', commits: 287, additions: 12340, deletions: 6780 },
            { name: 'Sarah Johnson', commits: 198, additions: 9870, deletions: 4560 },
            { name: 'Mike Davis', commits: 156, additions: 7650, deletions: 3420 },
            { name: 'Lisa Zhang', commits: 134, additions: 6230, deletions: 2890 }
          ],
          semanticTrends: {
            features: 45,
            fixes: 23,
            refactoring: 18,
            documentation: 8,
            testing: 4,
            performance: 2
          },
          insights: [
            {
              title: t('analysis.api_implementation'),
              description: t('analysis.added_new_rest_api'),
              confidence: 92,
              type: 'feature'
            },
            {
              title: t('analysis.database_migration'),
              description: t('analysis.updated_database_schema'),
              confidence: 88,
              type: 'improvement'
            },
            {
              title: t('analysis.authentication_logic'),
              description: t('analysis.implemented_jwt_auth'),
              confidence: 95,
              type: 'security'
            }
          ],
          timeline: [
            {
              date: new Date().toISOString(),
              event: 'Major Release',
              description: 'Version 2.0 released with new features',
              type: 'release'
            },
            {
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              event: 'Security Update',
              description: 'Fixed authentication vulnerabilities',
              type: 'security'
            },
            {
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              event: 'Performance Optimization',
              description: 'Improved query performance by 40%',
              type: 'performance'
            }
          ]
        }
        setDashboardData(mockData)
        setLastUpdated(new Date())
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [t])

  const refreshDashboard = () => {
    setIsLoading(true)
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false)
      setLastUpdated(new Date())
    }, 1000)
  }

  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('status.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Git View
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
              </div>
              <Badge variant={isConnected ? "default" : "secondary"} className="ml-2">
                {isConnected ? t('dashboard.real_time') : t('dashboard.offline')}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('actions.refresh_dashboard')}
              </Button>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.total_commits')}</CardTitle>
                <GitCommit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.repositoryStats.totalCommits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +12% {t('stats.current_period')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.active_developers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.repositoryStats.activeDevelopers}</div>
                <p className="text-xs text-muted-foreground">
                  +2 this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.code_quality_score')}</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.repositoryStats.codeQualityScore}%</div>
                <p className="text-xs text-muted-foreground">
                  +5% improvement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.technical_debt')}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.repositoryStats.technicalDebt}%</div>
                <p className="text-xs text-muted-foreground">
                  -3% reduction
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commit Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  {t('dashboard.commit_activity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData?.commitActivity.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Language Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  {t('dashboard.language_distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData?.languageDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ language, percentage }) => `${language} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {dashboardData?.languageDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Developer Contributions & Semantic Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Developer Contributions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  {t('dashboard.developer_contributions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData?.developerContributions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="commits" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Semantic Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  {t('dashboard.semantic_trends')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dashboardData?.semanticTrends || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getSemanticIcon(key)}
                        <span className="text-sm font-medium">{t(`semantic.${key}`)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(value / 50) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights & Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  {t('dashboard.ai_insights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-4">
                    {dashboardData?.insights.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">{t('insights.no_available')}</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          {t('actions.analyze_now')}
                        </Button>
                      </div>
                    ) : (
                      dashboardData?.insights.map((insight, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge variant="secondary">{insight.confidence}%</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Development Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  {t('dashboard.development_timeline')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-4">
                    {dashboardData?.timeline.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">{t('timeline.no_data')}</p>
                      </div>
                    ) : (
                      dashboardData?.timeline.map((event, index) => (
                        <div key={index} className="flex space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{event.event}</h4>
                              <Badge variant="outline">{event.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Knowledge Graph */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Network className="h-5 w-5 mr-2" />
                {t('dashboard.knowledge_graph')}
              </CardTitle>
              <CardDescription>
                Visual representation of code relationships and dependencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Knowledge graph visualization</p>
                  <p className="text-sm text-muted-foreground mt-1">Interactive network of code components</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-8 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()} • 
          Connection: {connectionStatus} • 
          ADES Dashboard v2.0
        </div>
      </div>
    </div>
  )
}

function getSemanticIcon(type: string) {
  switch (type) {
    case 'features':
      return <Zap className="h-4 w-4 text-blue-500" />
    case 'fixes':
      return <Bug className="h-4 w-4 text-red-500" />
    case 'refactoring':
      return <Wrench className="h-4 w-4 text-yellow-500" />
    case 'documentation':
      return <FileText className="h-4 w-4 text-green-500" />
    case 'testing':
      return <TestTube className="h-4 w-4 text-purple-500" />
    case 'performance':
      return <TrendingUp className="h-4 w-4 text-orange-500" />
    default:
      return <Code className="h-4 w-4 text-gray-500" />
  }
} 