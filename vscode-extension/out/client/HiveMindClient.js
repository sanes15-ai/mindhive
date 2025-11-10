"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiveMindClient = exports.MindHiveClient = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
const socket_io_client_1 = require("socket.io-client");
class MindHiveClient {
    context;
    authManager;
    http;
    ws = null;
    config;
    eventEmitter = new vscode.EventEmitter();
    onEvent = this.eventEmitter.event;
    constructor(context, authManager) {
        this.context = context;
        this.authManager = authManager;
        this.config = this.loadConfig();
        this.http = axios_1.default.create({
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
    loadConfig() {
        const config = vscode.workspace.getConfiguration('MindHive');
        return {
            apiUrl: config.get('apiUrl') || 'http://localhost:3000',
            wsUrl: config.get('wsUrl') || 'ws://localhost:3000',
            nexusStrictness: config.get('nexusStrictness') || 'high',
            preferredModels: config.get('preferredModels') || ['anthropic', 'openai'],
        };
    }
    async connect() {
        const token = await this.authManager.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        this.ws = (0, socket_io_client_1.io)(this.config.wsUrl, {
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
        this.ws.on('pattern:new', (pattern) => {
            this.eventEmitter.fire({ type: 'pattern:new', data: pattern });
        });
        this.ws.on('agent:status', (status) => {
            this.eventEmitter.fire({ type: 'agent:status', data: status });
        });
        this.ws.on('alert:new', (alert) => {
            this.eventEmitter.fire({ type: 'alert:new', data: alert });
        });
        this.ws.on('insight:new', (insight) => {
            this.eventEmitter.fire({ type: 'insight:new', data: insight });
        });
    }
    disconnect() {
        if (this.ws) {
            this.ws.disconnect();
            this.ws = null;
        }
    }
    async reconnect() {
        this.disconnect();
        await this.connect();
    }
    // Code Generation
    async generateCode(request) {
        try {
            const response = await this.http.post('/api/v1/code/generate', {
                ...request,
                models: request.models || this.config.preferredModels,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Code generation failed');
        }
    }
    // Nexus Verification
    async verifyCode(code, language) {
        try {
            const response = await this.http.post('/api/v1/code/verify', {
                code,
                language,
                strictness: this.config.nexusStrictness,
            });
            return response.data.result;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Code verification failed');
        }
    }
    // Code Explanation
    async explainCode(code, language) {
        try {
            const response = await this.http.post('/api/v1/code/explain', {
                code,
                language,
            });
            return response.data.explanation;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Code explanation failed');
        }
    }
    // Code Optimization
    async optimizeCode(code, language) {
        try {
            const response = await this.http.post('/api/v1/code/optimize', {
                code,
                language,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Code optimization failed');
        }
    }
    // Bug Fix
    async fixBug(code, language, error) {
        try {
            const response = await this.http.post('/api/v1/code/fix', {
                code,
                language,
                error,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Bug fix failed');
        }
    }
    // Global Patterns
    async searchPatterns(query, filters) {
        try {
            const response = await this.http.get('/api/v1/intelligence/patterns', {
                params: { query, ...filters },
            });
            return response.data.patterns;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Pattern search failed');
        }
    }
    // Success Prediction
    async predictSuccess(code, language) {
        try {
            const response = await this.http.post('/api/v1/intelligence/predict', {
                code,
                language,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Success prediction failed');
        }
    }
    // Agent Operations
    async triggerAgent(agentType, task) {
        try {
            const endpoint = `/api/v1/agents/${agentType}`;
            const response = await this.http.post(endpoint, task);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Agent trigger failed');
        }
    }
    // Get Agent Status
    async getAgentStatus() {
        try {
            const response = await this.http.get('/api/v1/agents/status');
            return response.data.agents;
        }
        catch (error) {
            return [];
        }
    }
    // Security Alerts
    async getAlerts() {
        try {
            const response = await this.http.get('/api/v1/analytics/security-scans');
            return response.data.scans.map((scan) => ({
                id: scan.id,
                severity: scan.severity,
                title: scan.vulnerabilityType,
                description: scan.details,
                suggestedFix: scan.suggestedFix,
                confidence: scan.confidence,
                timestamp: new Date(scan.scanDate),
            }));
        }
        catch (error) {
            return [];
        }
    }
    // Collective Insights
    async getCollectiveInsights() {
        try {
            const response = await this.http.get('/api/v1/intelligence/insights');
            return response.data.insights;
        }
        catch (error) {
            return [];
        }
    }
    // Analytics
    async getUserAnalytics() {
        try {
            const response = await this.http.get('/api/v1/analytics/user');
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    // Memory System
    async getOrCreateProjectMemory(projectPath, projectName) {
        try {
            const response = await this.http.post('/api/v1/memory/projects', {
                projectPath,
                projectName,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get project memory');
        }
    }
    async addChatMessage(projectMemoryId, role, content) {
        try {
            const response = await this.http.post('/api/v1/memory/chat', {
                projectMemoryId,
                role,
                content,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to add chat message');
        }
    }
    async getUserMemoryProfile() {
        try {
            const response = await this.http.get('/api/v1/memory/profile');
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    async getProjectMemory(projectId) {
        try {
            const response = await this.http.get(`/api/v1/memory/projects/${projectId}`);
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    async provideGenerationFeedback(generationId, feedback) {
        try {
            const response = await this.http.patch(`/api/v1/memory/generations/${generationId}/feedback`, feedback);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to provide feedback');
        }
    }
    // Generic HTTP methods for custom API calls
    async get(endpoint, params) {
        try {
            const response = await this.http.get(endpoint, { params });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || `GET ${endpoint} failed`);
        }
    }
    async post(endpoint, data) {
        try {
            const response = await this.http.post(endpoint, data);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || `POST ${endpoint} failed`);
        }
    }
    async patch(endpoint, data) {
        try {
            const response = await this.http.patch(endpoint, data);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || `PATCH ${endpoint} failed`);
        }
    }
    async delete(endpoint) {
        try {
            const response = await this.http.delete(endpoint);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || `DELETE ${endpoint} failed`);
        }
    }
    // Chat completion method for multi-model consensus
    async chat(messages, options) {
        try {
            const response = await this.http.post('/api/v1/code/generate', {
                prompt: messages[messages.length - 1].content,
                context: messages.slice(0, -1).map(m => m.content).join('\n'),
                models: options?.models || this.config.preferredModels,
                temperature: options?.temperature,
                maxTokens: options?.maxTokens,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Chat completion failed');
        }
    }
}
exports.MindHiveClient = MindHiveClient;
exports.HiveMindClient = MindHiveClient;
//# sourceMappingURL=HiveMindClient.js.map