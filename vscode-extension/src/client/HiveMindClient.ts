import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import { AuthManager } from '../auth/AuthManager';

export interface MindHiveConfig {
  apiUrl: string;
  wsUrl: string;
  nexusStrictness: 'low' | 'medium' | 'high';
  preferredModels: string[];
}

export interface CodeGenerationRequest {
  prompt: string;
  language?: string;
  context?: string;
  models?: string[];
}

export interface CodeVerificationResult {
  isValid: boolean;
  confidence: number;
  warnings: string[];
  suggestions: string[];
  metadata: any;
}

export interface GlobalPattern {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  usageCount: number;
  successRate: number;
  verificationCount: number;
  tags: string[];
}

export interface AgentStatus {
  agentId: string;
  name: string;
  status: 'idle' | 'processing' | 'error';
  currentTask?: string;
  confidence?: number;
}

export interface SelfHealingAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestedFix?: string;
  confidence?: number;
  timestamp: Date;
}

export class MindHiveClient {
  private http: AxiosInstance;
  private ws: Socket | null = null;
  private config: MindHiveConfig;
  private eventEmitter = new vscode.EventEmitter<any>();

  public readonly onEvent = this.eventEmitter.event;

  constructor(
    private context: vscode.ExtensionContext,
    private authManager: AuthManager
  ) {
    this.config = this.loadConfig();
    this.http = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000,
    });

    // Add auth interceptor
    this.http.interceptors.request.use(async (config) => {
      const token = await this.authManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Watch for config changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('MindHive')) {
        this.config = this.loadConfig();
        if (this.ws?.connected) {
          this.reconnect();
        }
      }
    });
  }

  private loadConfig(): MindHiveConfig {
    const config = vscode.workspace.getConfiguration('MindHive');
    return {
      apiUrl: config.get('apiUrl') || 'http://localhost:3000',
      wsUrl: config.get('wsUrl') || 'ws://localhost:3000',
      nexusStrictness: config.get('nexusStrictness') || 'high',
      preferredModels: config.get('preferredModels') || ['anthropic', 'openai'],
    };
  }

  public async connect(): Promise<void> {
    const token = await this.authManager.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    this.ws = io(this.config.wsUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    this.ws.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.eventEmitter.fire({ type: 'connected' });
    });

    this.ws.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.eventEmitter.fire({ type: 'disconnected' });
    });

    this.ws.on('pattern:new', (pattern: GlobalPattern) => {
      this.eventEmitter.fire({ type: 'pattern:new', data: pattern });
    });

    this.ws.on('agent:status', (status: AgentStatus) => {
      this.eventEmitter.fire({ type: 'agent:status', data: status });
    });

    this.ws.on('alert:new', (alert: SelfHealingAlert) => {
      this.eventEmitter.fire({ type: 'alert:new', data: alert });
    });

    this.ws.on('insight:new', (insight: any) => {
      this.eventEmitter.fire({ type: 'insight:new', data: insight });
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
  }

  private async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  // Code Generation
  public async generateCode(request: CodeGenerationRequest): Promise<any> {
    try {
      const response = await this.http.post('/api/v1/code/generate', {
        ...request,
        models: request.models || this.config.preferredModels,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Code generation failed');
    }
  }

  // Nexus Verification
  public async verifyCode(code: string, language: string): Promise<CodeVerificationResult> {
    try {
      const response = await this.http.post('/api/v1/code/verify', {
        code,
        language,
        strictness: this.config.nexusStrictness,
      });
      return response.data.result;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Code verification failed');
    }
  }

  // Code Explanation
  public async explainCode(code: string, language: string): Promise<string> {
    try {
      const response = await this.http.post('/api/v1/code/explain', {
        code,
        language,
      });
      return response.data.explanation;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Code explanation failed');
    }
  }

  // Code Optimization
  public async optimizeCode(code: string, language: string): Promise<any> {
    try {
      const response = await this.http.post('/api/v1/code/optimize', {
        code,
        language,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Code optimization failed');
    }
  }

  // Bug Fix
  public async fixBug(code: string, language: string, error?: string): Promise<any> {
    try {
      const response = await this.http.post('/api/v1/code/fix', {
        code,
        language,
        error,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Bug fix failed');
    }
  }

  // Global Patterns
  public async searchPatterns(query: string, filters?: any): Promise<GlobalPattern[]> {
    try {
      const response = await this.http.get('/api/v1/intelligence/patterns', {
        params: { query, ...filters },
      });
      return response.data.patterns;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Pattern search failed');
    }
  }

  // Success Prediction
  public async predictSuccess(code: string, language: string): Promise<any> {
    try {
      const response = await this.http.post('/api/v1/intelligence/predict', {
        code,
        language,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Success prediction failed');
    }
  }

  // Agent Operations
  public async triggerAgent(agentType: string, task: any): Promise<any> {
    try {
      const endpoint = `/api/v1/agents/${agentType}`;
      const response = await this.http.post(endpoint, task);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Agent trigger failed');
    }
  }

  // Get Agent Status
  public async getAgentStatus(): Promise<AgentStatus[]> {
    try {
      const response = await this.http.get('/api/v1/agents/status');
      return response.data.agents;
    } catch (error: any) {
      return [];
    }
  }

  // Security Alerts
  public async getAlerts(): Promise<SelfHealingAlert[]> {
    try {
      const response = await this.http.get('/api/v1/analytics/security-scans');
      return response.data.scans.map((scan: any) => ({
        id: scan.id,
        severity: scan.severity,
        title: scan.vulnerabilityType,
        description: scan.details,
        suggestedFix: scan.suggestedFix,
        confidence: scan.confidence,
        timestamp: new Date(scan.scanDate),
      }));
    } catch (error: any) {
      return [];
    }
  }

  // Collective Insights
  public async getCollectiveInsights(): Promise<any[]> {
    try {
      const response = await this.http.get('/api/v1/intelligence/insights');
      return response.data.insights;
    } catch (error: any) {
      return [];
    }
  }

  // Analytics
  public async getUserAnalytics(): Promise<any> {
    try {
      const response = await this.http.get('/api/v1/analytics/user');
      return response.data;
    } catch (error: any) {
      return null;
    }
  }

  // Memory System
  public async getOrCreateProjectMemory(
    projectPath: string,
    projectName: string
  ): Promise<{ id: string; projectName: string; projectPath: string }> {
    try {
      const response = await this.http.post('/api/v1/memory/projects', {
        projectPath,
        projectName,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get project memory');
    }
  }

  public async addChatMessage(
    projectMemoryId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<any> {
    try {
      const response = await this.http.post('/api/v1/memory/chat', {
        projectMemoryId,
        role,
        content,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add chat message');
    }
  }

  public async getUserMemoryProfile(): Promise<any> {
    try {
      const response = await this.http.get('/api/v1/memory/profile');
      return response.data;
    } catch (error: any) {
      return null;
    }
  }

  public async getProjectMemory(projectId: string): Promise<any> {
    try {
      const response = await this.http.get(`/api/v1/memory/projects/${projectId}`);
      return response.data;
    } catch (error: any) {
      return null;
    }
  }

  public async provideGenerationFeedback(
    generationId: string,
    feedback: {
      userAccepted?: boolean;
      userEdited?: boolean;
      userEditedCode?: string;
      userRating?: number;
    }
  ): Promise<any> {
    try {
      const response = await this.http.patch(
        `/api/v1/memory/generations/${generationId}/feedback`,
        feedback
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to provide feedback');
    }
  }

  // Generic HTTP methods for custom API calls
  public async get<T = any>(endpoint: string, params?: any): Promise<T> {
    try {
      const response = await this.http.get(endpoint, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `GET ${endpoint} failed`);
    }
  }

  public async post<T = any>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.http.post(endpoint, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `POST ${endpoint} failed`);
    }
  }

  public async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.http.patch(endpoint, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `PATCH ${endpoint} failed`);
    }
  }

  public async delete<T = any>(endpoint: string): Promise<T> {
    try {
      const response = await this.http.delete(endpoint);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `DELETE ${endpoint} failed`);
    }
  }

  // Chat completion method for multi-model consensus
  public async chat(messages: Array<{ role: string; content: string }>, options?: {
    models?: string[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<any> {
    try {
      const response = await this.http.post('/api/v1/code/generate', {
        prompt: messages[messages.length - 1].content,
        context: messages.slice(0, -1).map(m => m.content).join('\n'),
        models: options?.models || this.config.preferredModels,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Chat completion failed');
    }
  }
}

// Export alias for backward compatibility
export { MindHiveClient as HiveMindClient };

