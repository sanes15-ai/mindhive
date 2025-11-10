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
exports.AuthManager = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class AuthManager {
    context;
    static TOKEN_KEY = 'MindHive.tokens';
    static USER_KEY = 'MindHive.user';
    constructor(context) {
        this.context = context;
    }
    async isAuthenticated() {
        const tokens = await this.getStoredTokens();
        return tokens !== null && !this.isTokenExpired(tokens);
    }
    async getToken() {
        const tokens = await this.getStoredTokens();
        if (!tokens) {
            return null;
        }
        // Check if token is expired
        if (this.isTokenExpired(tokens)) {
            // Try to refresh
            const refreshed = await this.refreshTokens(tokens.refreshToken);
            if (!refreshed) {
                return null;
            }
            return refreshed.accessToken;
        }
        return tokens.accessToken;
    }
    async login() {
        try {
            const config = vscode.workspace.getConfiguration('MindHive');
            const apiUrl = config.get('apiUrl') || 'http://localhost:3000';
            // Show login options
            const method = await vscode.window.showQuickPick([
                { label: 'Email & Password', value: 'credentials' },
                { label: 'OAuth (Browser)', value: 'oauth' },
            ], { placeHolder: 'Choose login method' });
            if (!method) {
                return false;
            }
            if (method.value === 'credentials') {
                return await this.loginWithCredentials(apiUrl);
            }
            else {
                return await this.loginWithOAuth(apiUrl);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Login failed: ${error.message}`);
            return false;
        }
    }
    async loginWithCredentials(apiUrl) {
        const email = await vscode.window.showInputBox({
            prompt: 'Enter your email',
            placeHolder: 'user@example.com',
            validateInput: (value) => {
                if (!value.includes('@')) {
                    return 'Please enter a valid email';
                }
                return null;
            },
        });
        if (!email) {
            return false;
        }
        const password = await vscode.window.showInputBox({
            prompt: 'Enter your password',
            password: true,
        });
        if (!password) {
            return false;
        }
        // Authenticate with backend
        const response = await axios_1.default.post(`${apiUrl}/api/v1/auth/login`, {
            email,
            password,
        });
        const { user, token } = response.data;
        // Store tokens
        await this.storeTokens({
            accessToken: token,
            refreshToken: token, // In production, backend should return both
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        });
        await this.context.globalState.update(AuthManager.USER_KEY, user);
        vscode.window.showInformationMessage(`Welcome, ${user.name}! 🧠`);
        return true;
    }
    async loginWithOAuth(apiUrl) {
        // Generate OAuth URL
        const authUrl = `${apiUrl}/api/v1/auth/oauth/authorize`;
        const callbackUrl = await vscode.env.asExternalUri(vscode.Uri.parse('vscode://MindHive.MindHive-vscode/oauth-callback'));
        const state = this.generateRandomState();
        const fullAuthUrl = `${authUrl}?callback=${encodeURIComponent(callbackUrl.toString())}&state=${state}`;
        // Open browser for OAuth
        vscode.env.openExternal(vscode.Uri.parse(fullAuthUrl));
        // Wait for callback (simplified - in production, use proper OAuth flow)
        vscode.window.showInformationMessage('Complete authentication in your browser...');
        // Register URI handler for callback
        return new Promise((resolve) => {
            const disposable = vscode.window.registerUriHandler({
                handleUri: async (uri) => {
                    if (uri.path === '/oauth-callback') {
                        const params = new URLSearchParams(uri.query);
                        const code = params.get('code');
                        const returnedState = params.get('state');
                        if (returnedState !== state) {
                            vscode.window.showErrorMessage('OAuth state mismatch');
                            resolve(false);
                            return;
                        }
                        // Exchange code for token
                        try {
                            const response = await axios_1.default.post(`${apiUrl}/api/v1/auth/oauth/token`, { code });
                            const { user, token } = response.data;
                            await this.storeTokens({
                                accessToken: token,
                                refreshToken: token,
                                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
                            });
                            await this.context.globalState.update(AuthManager.USER_KEY, user);
                            vscode.window.showInformationMessage(`Welcome, ${user.name}! 🧠`);
                            resolve(true);
                        }
                        catch (error) {
                            vscode.window.showErrorMessage(`OAuth failed: ${error.message}`);
                            resolve(false);
                        }
                        disposable.dispose();
                    }
                },
            });
            // Timeout after 5 minutes
            setTimeout(() => {
                disposable.dispose();
                resolve(false);
            }, 5 * 60 * 1000);
        });
    }
    async logout() {
        await this.context.secrets.delete(AuthManager.TOKEN_KEY);
        await this.context.globalState.update(AuthManager.USER_KEY, undefined);
        vscode.window.showInformationMessage('Signed out successfully');
    }
    async getUser() {
        return this.context.globalState.get(AuthManager.USER_KEY);
    }
    async getStoredTokens() {
        const tokensJson = await this.context.secrets.get(AuthManager.TOKEN_KEY);
        if (!tokensJson) {
            return null;
        }
        return JSON.parse(tokensJson);
    }
    async storeTokens(tokens) {
        await this.context.secrets.store(AuthManager.TOKEN_KEY, JSON.stringify(tokens));
    }
    isTokenExpired(tokens) {
        return Date.now() >= tokens.expiresAt;
    }
    async refreshTokens(refreshToken) {
        try {
            const config = vscode.workspace.getConfiguration('MindHive');
            const apiUrl = config.get('apiUrl') || 'http://localhost:3000';
            const response = await axios_1.default.post(`${apiUrl}/api/v1/auth/refresh`, {
                refreshToken,
            });
            const tokens = {
                accessToken: response.data.token,
                refreshToken: response.data.refreshToken || refreshToken,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            };
            await this.storeTokens(tokens);
            return tokens;
        }
        catch (error) {
            return null;
        }
    }
    generateRandomState() {
        return Math.random().toString(36).substring(2, 15);
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=AuthManager.js.map