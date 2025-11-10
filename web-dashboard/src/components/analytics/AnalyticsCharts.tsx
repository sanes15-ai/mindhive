'use client';

import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface ConsensusData {
  model: string;
  consensusRate: number;
}

interface QualityTrendData {
  date: string;
  quality: number;
  security: number;
  performance: number;
}

interface AgentActivityData {
  agent: string;
  tasks: number;
}

interface TeamProductivityData {
  member: string;
  generations: number;
  commitsToday: number;
}

interface SuccessRateData {
  name: string;
  value: number;
  color: string;
}

interface ResponseTimeData {
  time: string;
  responseTime: number;
}

interface NexusStatsData {
  date: string;
  verified: number;
  hallucinations: number;
  confidence: number;
}

interface LanguageTrendData {
  week: string;
  typescript: number;
  python: number;
  javascript: number;
  rust: number;
  go: number;
}

/**
 * Multi-Model Consensus Chart
 * Shows agreement rates between AI models
 */
export function ModelConsensusChart({ data }: { data: ConsensusData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Multi-Model Consensus
        </h2>
        <p className="text-sm text-gray-400">
          Agreement rates across AI models (higher = better quality)
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="model" stroke="#9ca3af" />
          <PolarRadiusAxis stroke="#9ca3af" />
          <Radar
            name="Consensus Rate"
            dataKey="consensusRate"
            stroke="#a855f7"
            fill="#a855f7"
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Code Quality Trends Chart
 * Shows quality, security, performance over time
 */
export function CodeQualityTrendsChart({ data }: { data: QualityTrendData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Code Quality Trends
        </h2>
        <p className="text-sm text-gray-400">
          Quality, security, and performance metrics over time
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
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
          <Bar dataKey="quality" fill="#10b981" name="Quality Score" />
          <Line
            type="monotone"
            dataKey="security"
            stroke="#3b82f6"
            name="Security Score"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="performance"
            stroke="#a855f7"
            name="Performance Score"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Agent Activity Chart
 * Shows which agents are most active
 */
export function AgentActivityChart({ data }: { data: AgentActivityData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          AI Agent Activity
        </h2>
        <p className="text-sm text-gray-400">
          Tasks completed by each specialized agent
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9ca3af" />
          <YAxis dataKey="agent" type="category" stroke="#9ca3af" width={100} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
          />
          <Bar dataKey="tasks" fill="#a855f7" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Team Productivity Chart
 * Shows team member contributions
 */
export function TeamProductivityChart({ data }: { data: TeamProductivityData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Team Productivity
        </h2>
        <p className="text-sm text-gray-400">
          Code generations per team member
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="member" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
          />
          <Bar dataKey="generations" fill="#3b82f6" />
          <Bar dataKey="commitsToday" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Success Rate Pie Chart
 * Shows distribution of successful vs failed generations
 */
export function SuccessRateChart({ data }: { data: SuccessRateData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Generation Success Rate
        </h2>
        <p className="text-sm text-gray-400">
          Breakdown of successful, warning, and failed generations
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry: SuccessRateData, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
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
  );
}

/**
 * Response Time Distribution Chart
 */
export function ResponseTimeChart({ data }: { data: ResponseTimeData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Response Time Distribution
        </h2>
        <p className="text-sm text-gray-400">
          How fast MindHive responds to your requests
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
          />
          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorResponseTime)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * NEXUS Verification Stats Chart
 */
export function NexusStatsChart({ data }: { data: NexusStatsData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          NEXUS Anti-Hallucination Stats
        </h2>
        <p className="text-sm text-gray-400">
          Code verification and hallucination detection
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
          <Line
            type="monotone"
            dataKey="verified"
            stroke="#10b981"
            name="Verified Code"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="hallucinations"
            stroke="#ef4444"
            name="Hallucinations Caught"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="confidence"
            stroke="#a855f7"
            name="Avg Confidence"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Language Popularity Over Time
 */
export function LanguageTrendsChart({ data }: { data: LanguageTrendData[] }) {
  return (
    <Card className="glassmorphism p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Language Usage Trends
        </h2>
        <p className="text-sm text-gray-400">
          Programming language usage over time
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <defs>
            {['typescript', 'python', 'javascript', 'rust', 'go'].map((lang, index) => (
              <linearGradient key={lang} id={`color${lang}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[index]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS[index]} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="week" stroke="#9ca3af" />
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
          <Area type="monotone" dataKey="typescript" stackId="1" stroke={COLORS[0]} fill={`url(#colortypescript)`} />
          <Area type="monotone" dataKey="python" stackId="1" stroke={COLORS[1]} fill={`url(#colorpython)`} />
          <Area type="monotone" dataKey="javascript" stackId="1" stroke={COLORS[2]} fill={`url(#colorjavascript)`} />
          <Area type="monotone" dataKey="rust" stackId="1" stroke={COLORS[3]} fill={`url(#colorrust)`} />
          <Area type="monotone" dataKey="go" stackId="1" stroke={COLORS[4]} fill={`url(#colorgo)`} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
