import * as vscode from 'vscode';
import axios from 'axios';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class AuthManager {
  private static readonly TOKEN_KEY = 'MindHive.tokens';
  private static readonly USER_KEY = 'MindHive.user';

  constructor(private context: vscode.ExtensionContext) {}

  public async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getStoredTokens();
    return tokens !== null && !this.isTokenExpired(tokens);
  }

  public async getToken(): Promise<string | null> {
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

  public async login(): Promise<boolean> {
    try {
      const config = vscode.workspace.getConfiguration('MindHive');
      const apiUrl = config.get('apiUrl') || 'http://localhost:3000';

      // Show login options
      const method = await vscode.window.showQuickPick(
        [
          { label: 'Email & Password', value: 'credentials' },
          { label: 'OAuth (Browser)', value: 'oauth' },
        ],
        { placeHolder: 'Choose login method' }
      );

      if (!method) {
        return false;
      }

      if (method.value === 'credentials') {
        return await this.loginWithCredentials(apiUrl as string);
      } else {
        return await this.loginWithOAuth(apiUrl as string);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Login failed: ${error.message}`);
      return false;
    }
  }

  private async loginWithCredentials(apiUrl: string): Promise<boolean> {
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
    const response = await axios.post(`${apiUrl}/api/v1/auth/login`, {
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

  private async loginWithOAuth(apiUrl: string): Promise<boolean> {
    // Generate OAuth URL
    const authUrl = `${apiUrl}/api/v1/auth/oauth/authorize`;
    const callbackUrl = await vscode.env.asExternalUri(
      vscode.Uri.parse('vscode://MindHive.MindHive-vscode/oauth-callback')
    );

    const state = this.generateRandomState();
    const fullAuthUrl = `${authUrl}?callback=${encodeURIComponent(
      callbackUrl.toString()
    )}&state=${state}`;

    // Open browser for OAuth
    vscode.env.openExternal(vscode.Uri.parse(fullAuthUrl));

    // Wait for callback (simplified - in production, use proper OAuth flow)
    vscode.window.showInformationMessage(
      'Complete authentication in your browser...'
    );

    // Register URI handler for callback
    return new Promise((resolve) => {
      const disposable = vscode.window.registerUriHandler({
        handleUri: async (uri: vscode.Uri) => {
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
              const response = await axios.post(
                `${apiUrl}/api/v1/auth/oauth/token`,
                { code }
              );

              const { user, token } = response.data;

              await this.storeTokens({
                accessToken: token,
                refreshToken: token,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
              });

              await this.context.globalState.update(AuthManager.USER_KEY, user);

              vscode.window.showInformationMessage(`Welcome, ${user.name}! 🧠`);
              resolve(true);
            } catch (error: any) {
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

  public async logout(): Promise<void> {
    await this.context.secrets.delete(AuthManager.TOKEN_KEY);
    await this.context.globalState.update(AuthManager.USER_KEY, undefined);
    vscode.window.showInformationMessage('Signed out successfully');
  }

  public async getUser(): Promise<any> {
    return this.context.globalState.get(AuthManager.USER_KEY);
  }

  private async getStoredTokens(): Promise<AuthTokens | null> {
    const tokensJson = await this.context.secrets.get(AuthManager.TOKEN_KEY);
    if (!tokensJson) {
      return null;
    }
    return JSON.parse(tokensJson);
  }

  private async storeTokens(tokens: AuthTokens): Promise<void> {
    await this.context.secrets.store(
      AuthManager.TOKEN_KEY,
      JSON.stringify(tokens)
    );
  }

  private isTokenExpired(tokens: AuthTokens): boolean {
    return Date.now() >= tokens.expiresAt;
  }

  private async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const config = vscode.workspace.getConfiguration('MindHive');
      const apiUrl = config.get('apiUrl') || 'http://localhost:3000';

      const response = await axios.post(`${apiUrl}/api/v1/auth/refresh`, {
        refreshToken,
      });

      const tokens: AuthTokens = {
        accessToken: response.data.token,
        refreshToken: response.data.refreshToken || refreshToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      await this.storeTokens(tokens);
      return tokens;
    } catch (error) {
      return null;
    }
  }

  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

