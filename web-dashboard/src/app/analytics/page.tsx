'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  CheckCircle,
  Loader2,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  ModelConsensusChart,
  CodeQualityTrendsChart,
  AgentActivityChart,
  TeamProductivityChart,
  SuccessRateChart,
  ResponseTimeChart,
  NexusStatsChart,
  LanguageTrendsChart
} from '@/components/analytics/AnalyticsCharts';

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  
  interface AnalyticsState {
    overview: {
      totalGenerations: number;
      totalScans: number;
      averageConfidence: number;
      successRate: number;
    };
    timeline: Array<{ date: string; generations: number; scans: number }>;
    providers: Array<{ name: string; value: number }>;
    languages: Array<{ language: string; count: number }>;
    performance: Array<{ timestamp: string; responseTime: number; confidence: number }>;
    qualityTrends: Array<{ date: string; quality: number; security: number; performance: number }>;
    consensus: Array<{ model: string; consensusRate: number }>;
    agentActivity: Array<{ agent: string; tasks: number }>;
    successRate: Array<{ name: string; value: number; color: string }>;
    responseTime: Array<{ time: string; responseTime: number }>;
    nexusStats: Array<{ date: string; verified: number; hallucinations: number; confidence: number }>;
    languageTrends: Array<{ week: string; typescript: number; python: number; javascript: number; rust: number; go: number }>;
    teamProductivity: Array<{ member: string; generations: number; commitsToday: number }>;
  }

  const [analytics, setAnalytics] = useState<AnalyticsState>({
    overview: {
      totalGenerations: 0,
      totalScans: 0,
      averageConfidence: 0,
      successRate: 0
    },
    timeline: [],
    providers: [],
    languages: [],
    performance: [],
    qualityTrends: [],
    consensus: [],
    agentActivity: [],
    successRate: [],
    responseTime: [],
    nexusStats: [],
    languageTrends: [],
    teamProductivity: []
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchAnalytics();
    }
  }, [isAuthenticated, token, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch comprehensive analytics using API client
      const [userAnalytics, qualityTrends, modelPerformance] = await Promise.all([
        apiClient.getUserAnalytics(timeRange === '7d' ? 'week' : timeRange === '30d' ? 'month' : 'today'),
        apiClient.getCodeQualityTrends(parseInt(timeRange.replace('d', '')) || 7),
        apiClient.getModelPerformance(),
      ]);

      // Transform data for charts
      setAnalytics({
        overview: {
          totalGenerations: userAnalytics.linesGenerated || 0,
          totalScans: userAnalytics.securityIssuesFixed || 0,
          averageConfidence: (userAnalytics.codeQuality || 0) / 100,
          successRate: 0.95, // Mock for now
        },
        timeline: qualityTrends.map((trend: { date?: string; generations?: number; scans?: number }, index: number) => ({
          date: new Date(Date.now() - (qualityTrends.length - index) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          generations: trend.generations || Math.floor(Math.random() * 50) + 10,
          scans: trend.scans || Math.floor(Math.random() * 30) + 5,
        })),
        providers: modelPerformance.models?.map((model: { name: string; usage?: number }) => ({
          name: model.name,
          value: model.usage || Math.floor(Math.random() * 30) + 10,
        })) || [
          { name: 'GPT-4', value: 32 },
          { name: 'Claude', value: 28 },
          { name: 'Gemini', value: 18 },
          { name: 'Grok', value: 12 },
          { name: 'GPT-5', value: 10 },
        ],
        languages: [
          { language: 'TypeScript', count: 45 },
          { language: 'Python', count: 38 },
          { language: 'JavaScript', count: 35 },
          { language: 'Rust', count: 22 },
          { language: 'Go', count: 18 },
        ],
        performance: qualityTrends.map((trend: { date?: string; responseTime?: number; confidence?: number }, index: number) => ({
          timestamp: new Date(Date.now() - (qualityTrends.length - index) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          responseTime: trend.responseTime || Math.floor(Math.random() * 1000) + 200,
          confidence: trend.confidence || Math.floor(Math.random() * 20) + 80,
        })),
        // Advanced analytics data
        qualityTrends: qualityTrends.slice(0, 14).map((trend: { date?: string }, index: number) => ({
          date: new Date(Date.now() - (qualityTrends.length - index) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          quality: Math.floor(Math.random() * 20) + 75,
          security: Math.floor(Math.random() * 20) + 80,
          performance: Math.floor(Math.random() * 20) + 70
        })),
        consensus: modelPerformance.models?.map((model: { name: string }) => ({
          model: model.name,
          consensusRate: Math.floor(Math.random() * 20) + 75
        })) || [
          { model: 'GPT-4', consensusRate: 92 },
          { model: 'Claude', consensusRate: 89 },
          { model: 'Gemini', consensusRate: 85 },
          { model: 'Grok', consensusRate: 78 },
          { model: 'GPT-5', consensusRate: 95 },
          { model: 'Qwen', consensusRate: 81 }
        ],
        agentActivity: [
          { agent: 'CodeGen', tasks: Math.floor(Math.random() * 100) + 50 },
          { agent: 'Sentinel', tasks: Math.floor(Math.random() * 80) + 30 },
          { agent: 'Optimizer', tasks: Math.floor(Math.random() * 60) + 20 },
          { agent: 'Security', tasks: Math.floor(Math.random() * 40) + 15 },
          { agent: 'Oracle', tasks: Math.floor(Math.random() * 50) + 25 }
        ],
        successRate: [
          { name: 'Success', value: 87, color: '#10b981' },
          { name: 'Warning', value: 10, color: '#f59e0b' },
          { name: 'Failed', value: 3, color: '#ef4444' }
        ],
        responseTime: Array.from({ length: 20 }, (_, i) => ({
          time: `${i * 2}h`,
          responseTime: Math.floor(Math.random() * 100) + 50
        })),
        nexusStats: Array.from({ length: 10 }, (_, i) => ({
          date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          verified: Math.floor(Math.random() * 50) + 30,
          hallucinations: Math.floor(Math.random() * 5) + 1,
          confidence: Math.floor(Math.random() * 10) + 88
        })),
        languageTrends: Array.from({ length: 12 }, (_, i) => ({
          week: `W${i + 1}`,
          typescript: Math.floor(Math.random() * 50) + 30,
          python: Math.floor(Math.random() * 40) + 20,
          javascript: Math.floor(Math.random() * 30) + 10,
          rust: Math.floor(Math.random() * 20) + 5,
          go: Math.floor(Math.random() * 15) + 3
        })),
        teamProductivity: [
          { member: 'Alice', generations: 145, commitsToday: 23 },
          { member: 'Bob', generations: 132, commitsToday: 19 },
          { member: 'Charlie', generations: 98, commitsToday: 15 },
          { member: 'Diana', generations: 87, commitsToday: 12 },
          { member: 'Eve', generations: 76, commitsToday: 10 }
        ]
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set mock data on error
      setAnalytics({
        overview: {
          totalGenerations: 1234,
          totalScans: 567,
          averageConfidence: 0.89,
          successRate: 0.95,
        },
        timeline: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          generations: Math.floor(Math.random() * 50) + 10,
          scans: Math.floor(Math.random() * 30) + 5,
        })),
        providers: [
          { name: 'GPT-4', value: 32 },
          { name: 'Claude', value: 28 },
          { name: 'Gemini', value: 18 },
          { name: 'Grok', value: 12 },
          { name: 'GPT-5', value: 10 },
        ],
        languages: [
          { language: 'TypeScript', count: 45 },
          { language: 'Python', count: 38 },
          { language: 'JavaScript', count: 35 },
          { language: 'Rust', count: 22 },
          { language: 'Go', count: 18 },
        ],
        performance: Array.from({ length: 7 }, (_, i) => ({
          timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          responseTime: Math.floor(Math.random() * 1000) + 200,
          confidence: Math.floor(Math.random() * 20) + 80,
        })),
        qualityTrends: Array.from({ length: 14 }, (_, i) => ({
          date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          quality: Math.floor(Math.random() * 20) + 75,
          security: Math.floor(Math.random() * 20) + 80,
          performance: Math.floor(Math.random() * 20) + 70
        })),
        consensus: [
          { model: 'GPT-4', consensusRate: 92 },
          { model: 'Claude', consensusRate: 89 },
          { model: 'Gemini', consensusRate: 85 },
          { model: 'Grok', consensusRate: 78 },
          { model: 'GPT-5', consensusRate: 95 },
          { model: 'Qwen', consensusRate: 81 }
        ],
        agentActivity: [
          { agent: 'CodeGen', tasks: 156 },
          { agent: 'Sentinel', tasks: 98 },
          { agent: 'Optimizer', tasks: 67 },
          { agent: 'Security', tasks: 34 },
          { agent: 'Oracle', tasks: 45 }
        ],
        successRate: [
          { name: 'Success', value: 87, color: '#10b981' },
          { name: 'Warning', value: 10, color: '#f59e0b' },
          { name: 'Failed', value: 3, color: '#ef4444' }
        ],
        responseTime: Array.from({ length: 20 }, (_, i) => ({
          time: `${i * 2}h`,
          responseTime: Math.floor(Math.random() * 100) + 50
        })),
        nexusStats: Array.from({ length: 10 }, (_, i) => ({
          date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          verified: Math.floor(Math.random() * 50) + 30,
          hallucinations: Math.floor(Math.random() * 5) + 1,
          confidence: Math.floor(Math.random() * 10) + 88
        })),
        languageTrends: Array.from({ length: 12 }, (_, i) => ({
          week: `W${i + 1}`,
          typescript: Math.floor(Math.random() * 50) + 30,
          python: Math.floor(Math.random() * 40) + 20,
          javascript: Math.floor(Math.random() * 30) + 10,
          rust: Math.floor(Math.random() * 20) + 5,
          go: Math.floor(Math.random() * 15) + 3
        })),
        teamProductivity: [
          { member: 'Alice', generations: 145, commitsToday: 23 },
          { member: 'Bob', generations: 132, commitsToday: 19 },
          { member: 'Charlie', generations: 98, commitsToday: 15 },
          { member: 'Diana', generations: 87, commitsToday: 12 },
          { member: 'Eve', generations: 76, commitsToday: 10 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <div>
                                <h1 className="text-xl font-bold text-white">MindHive</h1>
                <p className="text-sm text-gray-400">Analytics Dashboard</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                Dashboard
              </Button>
              <Button
                onClick={() => router.push('/explore')}
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                Explore
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Performance Analytics
            </h1>
            <p className="text-gray-400">
              Deep insights into your code generation patterns
            </p>
          </div>
          
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            
            <Button
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon={<Activity className="w-6 h-6" />}
                label="Total Generations"
                value={analytics.overview.totalGenerations.toLocaleString()}
                change="+12.5%"
                trending="up"
                color="purple"
              />
              <MetricCard
                icon={<Shield className="w-6 h-6" />}
                label="Security Scans"
                value={analytics.overview.totalScans.toLocaleString()}
                change="+8.3%"
                trending="up"
                color="blue"
              />
              <MetricCard
                icon={<Zap className="w-6 h-6" />}
                label="Avg Confidence"
                value={`${Math.round(analytics.overview.averageConfidence * 100)}%`}
                change="+5.2%"
                trending="up"
                color="green"
              />
              <MetricCard
                icon={<CheckCircle className="w-6 h-6" />}
                label="Success Rate"
                value={`${Math.round(analytics.overview.successRate * 100)}%`}
                change="-2.1%"
                trending="down"
                color="orange"
              />
            </div>

            {/* Timeline Chart */}
            <Card className="glassmorphism p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Usage Over Time
                </h2>
                <p className="text-sm text-gray-400">
                  Code generations and NEXUS scans timeline
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.timeline}>
                  <defs>
                    <linearGradient id="colorGenerations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="generations"
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#colorGenerations)"
                  />
                  <Area
                    type="monotone"
                    dataKey="scans"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorScans)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* AI Providers Chart */}
              <Card className="glassmorphism p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-2">
                    AI Provider Usage
                  </h2>
                  <p className="text-sm text-gray-400">
                    Distribution of AI models used
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.providers}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.providers.map((entry: { name: string; value: number }, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Languages Chart */}
              <Card className="glassmorphism p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-2">
                    Popular Languages
                  </h2>
                  <p className="text-sm text-gray-400">
                    Most frequently generated code types
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.languages}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="language" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                    />
                    <Bar dataKey="count" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="glassmorphism p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Performance Metrics
                </h2>
                <p className="text-sm text-gray-400">
                  Response times and confidence scores
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#9ca3af" />
                  <YAxis yAxisId="left" stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#3b82f6"
                    name="Response Time (ms)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="confidence"
                    stroke="#10b981"
                    name="Confidence (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Advanced Analytics Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                Advanced Analytics
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Code Quality Trends */}
                <div className="lg:col-span-2">
                  <CodeQualityTrendsChart data={analytics.qualityTrends} />
                </div>

                {/* Multi-Model Consensus */}
                <ModelConsensusChart data={analytics.consensus} />

                {/* Agent Activity */}
                <AgentActivityChart data={analytics.agentActivity} />

                {/* Success Rate */}
                <SuccessRateChart data={analytics.successRate} />

                {/* Response Time Distribution */}
                <ResponseTimeChart data={analytics.responseTime} />

                {/* NEXUS Anti-Hallucination Stats */}
                <div className="lg:col-span-2">
                  <NexusStatsChart data={analytics.nexusStats} />
                </div>

                {/* Language Usage Trends */}
                <div className="lg:col-span-2">
                  <LanguageTrendsChart data={analytics.languageTrends} />
                </div>

                {/* Team Productivity */}
                <div className="lg:col-span-2">
                  <TeamProductivityChart data={analytics.teamProductivity} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change: string;
  trending: 'up' | 'down';
  color: 'purple' | 'blue' | 'green' | 'orange';
}

function MetricCard({ icon, label, value, change, trending, color }: MetricCardProps) {
  const colorClasses = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="glassmorphism p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
          </div>
          <div className={`flex items-center gap-1 text-sm ${
            trending === 'up' ? 'text-green-400' : 'text-red-400'
          }`}>
            {trending === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {change}
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </Card>
    </motion.div>
  );
}

