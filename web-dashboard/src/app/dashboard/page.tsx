'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  Sparkles, 
  Shield, 
  Zap, 
  Copy, 
  Check, 
  Loader2,
  AlertTriangle,
  TrendingUp,
  Code2,
  FileCode,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Code generation state
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [framework, setFramework] = useState('');
  const [provider, setProvider] = useState('anthropic');
  const [generatedCode, setGeneratedCode] = useState('');
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    totalGenerations: 0,
    totalScans: 0,
    successRate: 0,
    avgConfidence: 0,
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
      fetchUserStats();
    }
  }, [isAuthenticated, token]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalGenerations: data.totalGenerations || 0,
          totalScans: data.totalScans || 0,
          successRate: data.successRate || 0,
          avgConfidence: data.avgConfidence || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setGeneratedCode('');
    setVerification(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/code/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: prompt,
          language,
          framework: framework || undefined,
          provider,
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setGeneratedCode(data.code);
      setVerification(data.verification);
      fetchUserStats(); // Refresh stats
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedCode('// Error generating code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-400" />
                <div>
                  <h1 className="text-xl font-bold text-white">MindHive</h1>
                  <p className="text-sm text-gray-400">Welcome back, {user?.name || 'Developer'}</p>
                </div>
              </div>
              
              {/* Navigation */}
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium transition"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/memory')}
                  className="text-gray-400 hover:text-white text-sm font-medium transition"
                >
                  Memory & Learning
                </button>
              </nav>
            </div>
            <Button
              onClick={() => router.push('/auth/login')}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={<Code2 className="w-6 h-6" />}
            label="Generations"
            value={stats.totalGenerations}
            color="purple"
          />
          <StatsCard
            icon={<Shield className="w-6 h-6" />}
            label="Security Scans"
            value={stats.totalScans}
            color="blue"
          />
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Success Rate"
            value={`${Math.round(stats.successRate * 100)}%`}
            color="green"
          />
          <StatsCard
            icon={<Activity className="w-6 h-6" />}
            label="Avg Confidence"
            value={`${Math.round(stats.avgConfidence * 100)}%`}
            color="pink"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Code Generation Panel - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="glassmorphism p-6">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Code Generation</h2>
              </div>

              {/* Input Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-gray-300 mb-2 block">What do you want to build?</Label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., Create a REST API endpoint for user authentication with JWT tokens"
                    className="w-full h-32 px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">Language</Label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      disabled={loading}
                    >
                      <option value="typescript">TypeScript</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Framework (Optional)</Label>
                    <input
                      type="text"
                      value={framework}
                      onChange={(e) => setFramework(e.target.value)}
                      placeholder="e.g., Express, React"
                      className="w-full px-4 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">AI Provider</Label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full px-4 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      disabled={loading}
                    >
                      <option value="anthropic">Claude 3.5</option>
                      <option value="openai">GPT-4 Turbo</option>
                      <option value="google">Gemini 1.5</option>
                      <option value="grok">Grok Beta</option>
                    </select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg font-semibold glow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Code
                    </>
                  )}
                </Button>
              </div>

              {/* Generated Code Output */}
              {generatedCode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* NEXUS Verification Score */}
                  {verification && (
                    <div className="flex items-center justify-between p-4 bg-black/40 border border-purple-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-white font-semibold">NEXUS Verification</p>
                          <p className="text-sm text-gray-400">
                            {verification.isValid ? 'Code verified successfully' : 'Warnings detected'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">
                          {Math.round(verification.confidence * 100)}%
                        </p>
                        <p className="text-xs text-gray-400">Confidence</p>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {verification?.warnings && verification.warnings.length > 0 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-yellow-400 font-semibold mb-2">Warnings:</p>
                          <ul className="space-y-1">
                            {verification.warnings.map((warning: string, i: number) => (
                              <li key={i} className="text-sm text-yellow-300">• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Code Block */}
                  <div className="relative">
                    <div className="absolute top-3 right-3">
                      <Button
                        onClick={handleCopy}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="p-6 bg-black/60 border border-purple-500/30 rounded-lg overflow-x-auto text-sm">
                      <code className="text-gray-300">{generatedCode}</code>
                    </pre>
                  </div>
                </motion.div>
              )}
            </Card>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            <Card className="glassmorphism p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/explore')}
                  variant="outline"
                  className="w-full justify-start border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <FileCode className="w-5 h-5 mr-3" />
                  Browse Patterns
                </Button>
                <Button
                  onClick={() => router.push('/analytics')}
                  variant="outline"
                  className="w-full justify-start border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <Activity className="w-5 h-5 mr-3" />
                  View Analytics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <Zap className="w-5 h-5 mr-3" />
                  Optimize Code
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <Shield className="w-5 h-5 mr-3" />
                  Security Scan
                </Button>
              </div>
            </Card>

            <Card className="glassmorphism p-6">
              <h3 className="text-lg font-bold text-white mb-4">VS Code Extension</h3>
              <p className="text-gray-400 text-sm mb-4">
                Install our extension for AI-powered coding directly in VS Code.
              </p>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Install Extension
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color }: any) {
  const colorClasses = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
    pink: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  };

  return (
    <Card className="glassmorphism p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

