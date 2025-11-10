import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * MINDHIVE WEB API CLIENT
 * 
 * Complete API client for web dashboard with:
 * - Authentication management
 * - Code operations (generate, verify, optimize, fix)
 * - Agent management
 * - Analytics and metrics
 * - Team collaboration
 * - Memory/project management
 * - Intelligence patterns
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface CodeGenerationRequest {
  prompt: string;
  language: string;
  context?: string;
  models?: string[];
}

export interface CodeGenerationResponse {
  code: string;
  explanation: string;
  confidence: number;
  models: string[];
  verificationResult: {
    isValid: boolean;
    confidence: number;
    warnings: string[];
  };
}

export interface AgentStatus {
  agentId: string;
  name: string;
  status: 'idle' | 'processing' | 'error';
  currentTask?: string;
  confidence?: number;
}

export interface Analytics {
  codeVelocity: number;
  codeQuality: number;
  linesGenerated: number;
  bugsFixed: number;
  testsGenerated: number;
  securityIssuesFixed: number;
  timeperiod: 'today' | 'week' | 'month' | 'all';
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  activity: {
    linesGenerated: number;
    commitsToday: number;
    activeNow: boolean;
  };
}

class MindHiveAPIClient {
  private http: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.http.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.token = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('mindhive_token');
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('mindhive_token');
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mindhive_token', token);
    }
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mindhive_token');
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  // ===================================================================
  // AUTHENTICATION
  // ===================================================================

  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const response = await this.http.post('/api/v1/auth/register', { email, password, name });
    this.setToken(response.data.token);
    return response.data;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.http.post('/api/v1/auth/login', { email, password });
    this.setToken(response.data.token);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.http.post('/api/v1/auth/logout');
    this.clearToken();
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.http.get('/api/v1/auth/me');
    return response.data;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await this.http.patch('/api/v1/auth/profile', updates);
    return response.data;
  }

  // ===================================================================
  // CODE OPERATIONS
  // ===================================================================

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const response = await this.http.post('/api/v1/code/generate', request);
    return response.data;
  }

  async verifyCode(code: string, language: string): Promise<any> {
    const response = await this.http.post('/api/v1/code/verify', { code, language });
    return response.data;
  }

  async optimizeCode(code: string, language: string): Promise<any> {
    const response = await this.http.post('/api/v1/code/optimize', { code, language });
    return response.data;
  }

  async fixBug(code: string, language: string, error?: string): Promise<any> {
    const response = await this.http.post('/api/v1/code/fix', { code, language, error });
    return response.data;
  }

  async explainCode(code: string, language: string): Promise<string> {
    const response = await this.http.post('/api/v1/code/explain', { code, language });
    return response.data.explanation;
  }

  // ===================================================================
  // AGENT MANAGEMENT
  // ===================================================================

  async getAgentStatus(): Promise<AgentStatus[]> {
    const response = await this.http.get('/api/v1/agents/status');
    return response.data.agents;
  }

  async triggerAgent(agentType: string, task: any): Promise<any> {
    const response = await this.http.post(`/api/v1/agents/${agentType}`, task);
    return response.data;
  }

  async getAgentHistory(agentId: string, limit = 50): Promise<any[]> {
    const response = await this.http.get(`/api/v1/agents/${agentId}/history`, {
      params: { limit },
    });
    return response.data.history;
  }

  // ===================================================================
  // ANALYTICS
  // ===================================================================

  async getUserAnalytics(timeperiod: 'today' | 'week' | 'month' | 'all' = 'week'): Promise<Analytics> {
    const response = await this.http.get('/api/v1/analytics/user', {
      params: { timeperiod },
    });
    return response.data;
  }

  async getTeamAnalytics(teamId: string, timeperiod: 'week' | 'month' | 'all' = 'week'): Promise<any> {
    const response = await this.http.get(`/api/v1/analytics/team/${teamId}`, {
      params: { timeperiod },
    });
    return response.data;
  }

  async getCodeQualityTrends(days = 30): Promise<any[]> {
    const response = await this.http.get('/api/v1/analytics/quality-trends', {
      params: { days },
    });
    return response.data.trends;
  }

  async getModelPerformance(): Promise<any> {
    const response = await this.http.get('/api/v1/analytics/model-performance');
    return response.data;
  }

  // ===================================================================
  // TEAM MANAGEMENT
  // ===================================================================

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const response = await this.http.get(`/api/v1/teams/${teamId}/members`);
    return response.data.members;
  }

  async inviteTeamMember(teamId: string, email: string, role: 'admin' | 'member'): Promise<any> {
    const response = await this.http.post(`/api/v1/teams/${teamId}/invite`, { email, role });
    return response.data;
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    await this.http.delete(`/api/v1/teams/${teamId}/members/${memberId}`);
  }

  async updateMemberRole(teamId: string, memberId: string, role: 'admin' | 'member'): Promise<void> {
    await this.http.patch(`/api/v1/teams/${teamId}/members/${memberId}`, { role });
  }

  // ===================================================================
  // INTELLIGENCE & PATTERNS
  // ===================================================================

  async searchPatterns(query: string, filters?: any): Promise<any[]> {
    const response = await this.http.get('/api/v1/intelligence/patterns', {
      params: { query, ...filters },
    });
    return response.data.patterns;
  }

  async getCollectiveInsights(): Promise<any[]> {
    const response = await this.http.get('/api/v1/intelligence/insights');
    return response.data.insights;
  }

  async predictSuccess(code: string, language: string): Promise<any> {
    const response = await this.http.post('/api/v1/intelligence/predict', {
      code,
      language,
    });
    return response.data;
  }

  // ===================================================================
  // MEMORY & PROJECTS
  // ===================================================================

  async getProjects(): Promise<any[]> {
    const response = await this.http.get('/api/v1/memory/projects');
    return response.data.projects;
  }

  async getProjectMemory(projectId: string): Promise<any> {
    const response = await this.http.get(`/api/v1/memory/projects/${projectId}`);
    return response.data;
  }

  async getUserMemoryProfile(): Promise<any> {
    const response = await this.http.get('/api/v1/memory/profile');
    return response.data;
  }

  // ===================================================================
  // SECURITY
  // ===================================================================

  async getSecurityScans(limit = 20): Promise<any[]> {
    const response = await this.http.get('/api/v1/analytics/security-scans', {
      params: { limit },
    });
    return response.data.scans;
  }

  async runSecurityScan(code: string, language: string): Promise<any> {
    const response = await this.http.post('/api/v1/security/scan', { code, language });
    return response.data;
  }

  // ===================================================================
  // SETTINGS
  // ===================================================================

  async getSettings(): Promise<any> {
    const response = await this.http.get('/api/v1/settings');
    return response.data;
  }

  async updateSettings(settings: any): Promise<any> {
    const response = await this.http.patch('/api/v1/settings', settings);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new MindHiveAPIClient();

// Export class for testing
export default MindHiveAPIClient;
