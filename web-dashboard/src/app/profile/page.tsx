'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Brain,
  User,
  Key,
  Shield,
  Zap,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, token, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    company: '',
    website: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    securityAlerts: true,
    weeklyDigest: false,
    defaultProvider: 'openai',
    defaultLanguage: 'typescript',
    theme: 'dark'
  });

  const [apiKeys, setApiKeys] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        bio: (user as any).bio || '',
        company: (user as any).company || '',
        website: (user as any).website || ''
      });
      fetchUserData();
    }
  }, [isAuthenticated, user]);

  const fetchUserData = async () => {
    try {
      const [keysResponse, prefsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/api-keys`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/preferences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        setApiKeys(keysData.keys || []);
      }

      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();
        setPreferences({ ...preferences, ...prefsData });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to change password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'New API Key' })
      });

      if (response.ok) {
        fetchUserData();
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchUserData();
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
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
                <p className="text-sm text-gray-400">Profile & Settings</p>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Account Settings
          </h1>
          <p className="text-gray-400">
            Manage your profile, security, and preferences
          </p>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">Changes saved successfully!</p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'preferences', label: 'Preferences', icon: Zap },
            { id: 'api-keys', label: 'API Keys', icon: Key }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-black/40 text-gray-400 hover:bg-black/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card className="glassmorphism p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white mb-2">Full Name</Label>
                  <Input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="bg-black/40 border-purple-500/30 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-white mb-2">Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="bg-black/40 border-purple-500/30 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white mb-2">Bio</Label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white mb-2">Company</Label>
                  <Input
                    type="text"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    className="bg-black/40 border-purple-500/30 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-white mb-2">Website</Label>
                  <Input
                    type="url"
                    value={profile.website}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    className="bg-black/40 border-purple-500/30 text-white"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <Card className="glassmorphism p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Security Settings</h2>
            
            <div className="space-y-6">
              <div>
                <Label className="text-white mb-2">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="bg-black/40 border-purple-500/30 text-white pr-12"
                  />
                  <button
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-white mb-2">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="bg-black/40 border-purple-500/30 text-white pr-12"
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-white mb-2">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="bg-black/40 border-purple-500/30 text-white"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                ) : (
                  <><Shield className="w-4 h-4 mr-2" /> Change Password</>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <Card className="glassmorphism p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Preferences</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-black/40 rounded-lg cursor-pointer">
                    <div>
                      <p className="text-white font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-400">Receive updates via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-black/40 rounded-lg cursor-pointer">
                    <div>
                      <p className="text-white font-medium">Security Alerts</p>
                      <p className="text-sm text-gray-400">Get notified about security events</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.securityAlerts}
                      onChange={(e) => setPreferences({ ...preferences, securityAlerts: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-black/40 rounded-lg cursor-pointer">
                    <div>
                      <p className="text-white font-medium">Weekly Digest</p>
                      <p className="text-sm text-gray-400">Summary of your activity</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.weeklyDigest}
                      onChange={(e) => setPreferences({ ...preferences, weeklyDigest: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Defaults</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-white mb-2">Default AI Provider</Label>
                    <select
                      value={preferences.defaultProvider}
                      onChange={(e) => setPreferences({ ...preferences, defaultProvider: e.target.value })}
                      className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="openai">OpenAI GPT-4</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="google">Google Gemini</option>
                      <option value="grok">Grok</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-white mb-2">Default Language</Label>
                    <select
                      value={preferences.defaultLanguage}
                      onChange={(e) => setPreferences({ ...preferences, defaultLanguage: e.target.value })}
                      className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="typescript">TypeScript</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSavePreferences}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Preferences</>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <Card className="glassmorphism p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">API Keys</h2>
                <p className="text-gray-400">Manage your API keys for programmatic access</p>
              </div>
              <Button
                onClick={generateApiKey}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Key className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>
            </div>

            <div className="space-y-4">
              {apiKeys.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No API keys yet. Generate one to get started.</p>
              ) : (
                apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 bg-black/40 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{key.name}</p>
                      <p className="text-sm text-gray-400 font-mono">{key.key}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(key.key)}
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteApiKey(key.id)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

