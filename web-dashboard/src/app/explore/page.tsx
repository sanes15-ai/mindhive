'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  Search, 
  TrendingUp, 
  Users, 
  CheckCircle,
  Copy,
  ExternalLink,
  Filter,
  Loader2,
  GitFork
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
      fetchPatterns();
    }
  }, [isAuthenticated, token, selectedLanguage, selectedCategory]);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLanguage !== 'all') params.append('language', selectedLanguage);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      params.append('limit', '20');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/intelligence/global-patterns?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPatterns(data.patterns || []);
      }
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatterns = patterns.filter(pattern =>
    pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pattern.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <p className="text-sm text-gray-400">Explore Global Patterns</p>
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
                onClick={() => router.push('/analytics')}
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-4">
              Discover Proven Code Patterns
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Learn from {patterns.length.toLocaleString()}+ verified patterns used by developers worldwide
            </p>
          </motion.div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search patterns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 bg-black/40 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500 text-lg"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400">Filter by:</span>
          </div>
          
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Languages</option>
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="authentication">Authentication</option>
            <option value="api">API Design</option>
            <option value="database">Database</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
            <option value="testing">Testing</option>
          </select>

          <Button
            onClick={fetchPatterns}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            Apply Filters
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Trending This Week"
            value="847"
            color="purple"
          />
          <StatsCard
            icon={<Users className="w-6 h-6" />}
            label="Active Developers"
            value="127K+"
            color="blue"
          />
          <StatsCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Verified Patterns"
            value="94%"
            color="green"
          />
        </div>

        {/* Patterns Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No patterns found. Try different filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatterns.map((pattern, index) => (
              <PatternCard key={pattern.id} pattern={pattern} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color }: any) {
  const colorClasses = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
  };

  return (
    <Card className="glassmorphism p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function PatternCard({ pattern, index }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pattern.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glassmorphism p-6 hover:border-purple-500/50 transition-all duration-300 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
              {pattern.name}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2">
              {pattern.description}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
            {pattern.language}
          </span>
          {pattern.framework && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
              {pattern.framework}
            </span>
          )}
          <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
            {pattern.category}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400">Usage</p>
            <div className="flex items-center gap-1">
              <GitFork className="w-3 h-3 text-purple-400" />
              <p className="text-sm font-semibold text-white">
                {pattern.usageCount.toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400">Success</p>
            <p className="text-sm font-semibold text-green-400">
              {Math.round(pattern.successRate * 100)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Confidence</p>
            <p className="text-sm font-semibold text-purple-400">
              {Math.round(pattern.confidenceScore * 100)}%
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            size="sm"
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

