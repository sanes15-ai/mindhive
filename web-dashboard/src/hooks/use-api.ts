import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

// Generic API hook with error handling and loading states
export function useAPI<T>(
  endpoint: string,
  options?: RequestInit,
  autoFetch = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const fetchData = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options?.headers,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && token) {
      fetchData();
    }
  }, [endpoint, token, autoFetch]);

  return { data, loading, error, refetch: fetchData };
}

// Code Generation Hook
export function useCodeGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const generateCode = async (params: {
    prompt: string;
    language: string;
    framework?: string;
    provider?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/code/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Code generation failed');
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateCode, loading, error };
}

// NEXUS Scanning Hook
export function useNEXUSScan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const scanCode = async (params: {
    code: string;
    language: string;
    framework?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/intelligence/nexus-scan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'NEXUS scan failed');
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { scanCode, loading, error };
}

// Analytics Hook
export function useAnalytics(timeRange = '7d') {
  const endpoint = `/api/v1/analytics/user?timeRange=${timeRange}`;
  return useAPI<any>(endpoint);
}

// Detailed Analytics Hook
export function useDetailedAnalytics(timeRange = '7d') {
  const endpoint = `/api/v1/analytics/detailed?timeRange=${timeRange}`;
  return useAPI<any>(endpoint);
}

// Global Patterns Hook
export function useGlobalPatterns(filters?: {
  language?: string;
  category?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.language) params.append('language', filters.language);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const endpoint = `/api/v1/intelligence/global-patterns?${params.toString()}`;
  return useAPI<any>(endpoint);
}

// User Profile Hook
export function useUserProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const updateProfile = async (data: {
    name?: string;
    email?: string;
    bio?: string;
    company?: string;
    website?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Profile update failed');
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
}

// Password Change Hook
export function usePasswordChange() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  const changePassword = async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password change failed');
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading, error };
}

// API Keys Hook
export function useAPIKeys() {
  const endpoint = '/api/v1/auth/api-keys';
  const { data, loading, error, refetch } = useAPI<any>(endpoint);
  const { token } = useAuthStore();

  const generateKey = async (name: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate API key');
    }

    await refetch();
    return response.json();
  };

  const deleteKey = async (keyId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}/${keyId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete API key');
    }

    await refetch();
  };

  return {
    keys: data?.keys || [],
    loading,
    error,
    generateKey,
    deleteKey,
    refetch,
  };
}

// Preferences Hook
export function usePreferences() {
  const endpoint = '/api/v1/auth/preferences';
  const { data, loading, error, refetch } = useAPI<any>(endpoint);
  const { token } = useAuthStore();

  const updatePreferences = async (preferences: any) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }

    await refetch();
    return response.json();
  };

  return {
    preferences: data,
    loading,
    error,
    updatePreferences,
    refetch,
  };
}

// Team Management Hook
export function useTeams() {
  const endpoint = '/api/v1/teams';
  const { data, loading, error, refetch } = useAPI<any>(endpoint);
  const { token } = useAuthStore();

  const createTeam = async (teamData: {
    name: string;
    description?: string;
  }) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create team');
    }

    await refetch();
    return response.json();
  };

  const inviteMembers = async (teamId: string, emails: string[]) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}/${teamId}/invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ emails }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to invite members');
    }

    return response.json();
  };

  return {
    teams: data?.teams || [],
    loading,
    error,
    createTeam,
    inviteMembers,
    refetch,
  };
}

// Agents Hook
export function useAgents() {
  const endpoint = '/api/v1/agents';
  const { data, loading, error, refetch } = useAPI<any>(endpoint);
  const { token } = useAuthStore();

  const assignTask = async (agentId: string, taskData: any) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}/${agentId}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to assign task');
    }

    return response.json();
  };

  return {
    agents: data?.agents || [],
    loading,
    error,
    assignTask,
    refetch,
  };
}

// WebSocket Hook for real-time updates
export function useWebSocket(channel: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    // This would connect to your WebSocket server
    // Implementation depends on your WebSocket setup
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}?token=${token}&channel=${channel}`
    );

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    return () => ws.close();
  }, [token, channel]);

  return { connected, messages };
}

