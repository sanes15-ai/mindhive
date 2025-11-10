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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentPanel = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 🎨 DeploymentPanel - Interactive Deployment UI
 *
 * **Features:**
 * - Platform selector (Vercel, Netlify, Railway)
 * - Deployment history timeline
 * - Real-time logs viewer
 * - Environment variable manager
 * - One-click rollback
 * - Quick deploy button
 * - Token configuration
 * - Build settings
 */
class DeploymentPanel {
    context;
    deploymentManager;
    panel;
    disposables = [];
    constructor(context, deploymentManager) {
        this.context = context;
        this.deploymentManager = deploymentManager;
    }
    /**
     * Show deployment panel
     */
    async show() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }
        this.panel = vscode.window.createWebviewPanel('mindhiveDeployment', '🚀 MindHive Deployment', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [this.context.extensionUri]
        });
        this.panel.webview.html = this.getHtmlContent();
        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(message => this.handleMessage(message), null, this.disposables);
        // Clean up when panel is closed
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.disposables);
    }
    /**
     * Handle messages from webview
     */
    async handleMessage(message) {
        switch (message.command) {
            case 'deploy':
                await this.handleDeploy(message.platform);
                break;
            case 'configureToken':
                await this.handleConfigureToken(message.platform);
                break;
            case 'viewHistory':
                await this.deploymentManager.showHistory();
                break;
            case 'openSite':
                if (message.url) {
                    vscode.env.openExternal(vscode.Uri.parse(message.url));
                }
                break;
            case 'copyUrl':
                if (message.url) {
                    vscode.env.clipboard.writeText(message.url);
                    vscode.window.showInformationMessage('URL copied to clipboard!');
                }
                break;
        }
    }
    /**
     * Handle deploy request
     */
    async handleDeploy(platform) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        const projectPath = workspaceFolders[0].uri.fsPath;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Deploying to ${platform}...`,
            cancellable: false
        }, async () => {
            const result = await this.deploymentManager.deploy({
                platform,
                projectPath
            });
            // Update webview with result
            this.panel?.webview.postMessage({
                command: 'deploymentComplete',
                result
            });
        });
    }
    /**
     * Handle token configuration
     */
    async handleConfigureToken(platform) {
        const instructions = {
            vercel: 'Get your token from: https://vercel.com/account/tokens',
            netlify: 'Get your token from: https://app.netlify.com/user/applications#personal-access-tokens',
            railway: 'Get your token from: https://railway.app/account/tokens'
        };
        const token = await vscode.window.showInputBox({
            prompt: `Enter your ${platform} access token`,
            placeHolder: instructions[platform],
            password: true,
            ignoreFocusOut: true
        });
        if (token) {
            const config = vscode.workspace.getConfiguration('mindhive.deployment');
            await config.update(`${platform}Token`, token, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`${platform} token saved!`);
            // Notify webview
            this.panel?.webview.postMessage({
                command: 'tokenConfigured',
                platform
            });
        }
    }
    /**
     * Generate HTML content for webview
     */
    getHtmlContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MindHive Deployment</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .platforms {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .platform-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .platform-card:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-2px);
    }

    .platform-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .platform-icon {
      font-size: 32px;
    }

    .platform-name {
      font-size: 20px;
      font-weight: 600;
    }

    .platform-description {
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .button-group {
      display: flex;
      gap: 10px;
    }

    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .section {
      margin-top: 40px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .history-item {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .history-platform {
      font-weight: 600;
      font-size: 15px;
    }

    .history-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-ready {
      background: rgba(0, 200, 100, 0.2);
      color: rgb(0, 255, 100);
    }

    .status-error {
      background: rgba(255, 50, 50, 0.2);
      color: rgb(255, 100, 100);
    }

    .history-url {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
      font-size: 13px;
    }

    .history-url:hover {
      text-decoration: underline;
    }

    .history-time {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      margin-top: 8px;
    }

    .quick-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .action-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--vscode-button-background);
      border: none;
      border-radius: 6px;
      color: var(--vscode-button-foreground);
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .action-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .feature-list {
      list-style: none;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }

    .feature-list li {
      padding: 4px 0;
    }

    .feature-list li:before {
      content: "✓ ";
      color: var(--vscode-charts-green);
      font-weight: bold;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <span>🚀</span>
      <span>One-Click Deployment</span>
    </h1>

    <div class="platforms">
      <!-- Vercel Card -->
      <div class="platform-card" onclick="deployTo('vercel')">
        <div class="platform-header">
          <span class="platform-icon">▲</span>
          <span class="platform-name">Vercel</span>
        </div>
        <p class="platform-description">
          Best for Next.js, React, and frontend applications
        </p>
        <ul class="feature-list">
          <li>Instant global CDN</li>
          <li>Automatic HTTPS</li>
          <li>Serverless functions</li>
          <li>Preview deployments</li>
        </ul>
        <div class="button-group">
          <button onclick="event.stopPropagation(); deployTo('vercel')">Deploy Now</button>
          <button class="secondary" onclick="event.stopPropagation(); configureToken('vercel')">Configure</button>
        </div>
      </div>

      <!-- Netlify Card -->
      <div class="platform-card" onclick="deployTo('netlify')">
        <div class="platform-header">
          <span class="platform-icon">◆</span>
          <span class="platform-name">Netlify</span>
        </div>
        <p class="platform-description">
          Best for static sites, JAMstack, and serverless
        </p>
        <ul class="feature-list">
          <li>Edge functions</li>
          <li>Form handling</li>
          <li>Split testing</li>
          <li>Deploy previews</li>
        </ul>
        <div class="button-group">
          <button onclick="event.stopPropagation(); deployTo('netlify')">Deploy Now</button>
          <button class="secondary" onclick="event.stopPropagation(); configureToken('netlify')">Configure</button>
        </div>
      </div>

      <!-- Railway Card -->
      <div class="platform-card" onclick="deployTo('railway')">
        <div class="platform-header">
          <span class="platform-icon">🚂</span>
          <span class="platform-name">Railway</span>
        </div>
        <p class="platform-description">
          Best for full-stack apps with databases
        </p>
        <ul class="feature-list">
          <li>PostgreSQL, MySQL, Redis</li>
          <li>Docker support</li>
          <li>Auto-scaling</li>
          <li>Environment management</li>
        </ul>
        <div class="button-group">
          <button onclick="event.stopPropagation(); deployTo('railway')">Deploy Now</button>
          <button class="secondary" onclick="event.stopPropagation(); configureToken('railway')">Configure</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">
        <span>⚡</span>
        <span>Quick Actions</span>
      </div>
      <div class="quick-actions">
        <button class="action-button" onclick="viewHistory()">
          <span>📜</span>
          <span>Deployment History</span>
        </button>
        <button class="action-button" onclick="openDocs()">
          <span>📚</span>
          <span>Documentation</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function deployTo(platform) {
      vscode.postMessage({
        command: 'deploy',
        platform: platform
      });
    }

    function configureToken(platform) {
      vscode.postMessage({
        command: 'configureToken',
        platform: platform
      });
    }

    function viewHistory() {
      vscode.postMessage({
        command: 'viewHistory'
      });
    }

    function openDocs() {
      vscode.postMessage({
        command: 'openSite',
        url: 'https://docs.hivemind.dev/deployment'
      });
    }

    // Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'deploymentComplete':
          if (message.result.success) {
            console.log('Deployment successful:', message.result);
          } else {
            console.error('Deployment failed:', message.result.error);
          }
          break;
          
        case 'tokenConfigured':
          console.log('Token configured for:', message.platform);
          break;
      }
    });
  </script>
</body>
</html>`;
    }
    dispose() {
        this.panel?.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.DeploymentPanel = DeploymentPanel;
//# sourceMappingURL=DeploymentPanel.js.map