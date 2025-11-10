import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';

interface QualityMetrics {
  overall: number;
  security: number;
  performance: number;
  maintainability: number;
  coverage: number;
  nexusConfidence: number;
}

interface ModelConsensus {
  gpt4: { score: number; status: 'agree' | 'disagree' | 'abstain' };
  gpt5: { score: number; status: 'agree' | 'disagree' | 'abstain' };
  claude: { score: number; status: 'agree' | 'disagree' | 'abstain' };
  gemini: { score: number; status: 'agree' | 'disagree' | 'abstain' };
  grok: { score: number; status: 'agree' | 'disagree' | 'abstain' };
  perplexity: { score: number; status: 'agree' | 'disagree' | 'abstain' };
  consensus: number; // 0-100%
}

interface AgentActivity {
  codegen: boolean;
  sentinel: boolean;
  optimizer: boolean;
  securityGuard: boolean;
  oracle: boolean;
}

export class HUDManager {
  private statusBarItem: vscode.StatusBarItem;
  private decorationType: vscode.TextEditorDecorationType;
  private isVisible: boolean = false;
  private webviewPanel: vscode.WebviewPanel | undefined;
  private updateInterval: NodeJS.Timeout | undefined;
  private currentMetrics: QualityMetrics | undefined;
  private currentConsensus: ModelConsensus | undefined;
  private agentActivity: AgentActivity = {
    codegen: false,
    sentinel: false,
    optimizer: false,
    securityGuard: false,
    oracle: false,
  };

  constructor(
    private context: vscode.ExtensionContext,
    private client: MindHiveClient
  ) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.text = '$(brain) MindHive';
    this.statusBarItem.command = 'MindHive.showInsights';
    this.statusBarItem.tooltip = 'Click to show MindHive insights';

    // Create decoration type for inline insights
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        textDecoration: 'none',
        fontStyle: 'italic',
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    // Listen for editor changes
    vscode.window.onDidChangeActiveTextEditor(() => this.update());
    vscode.workspace.onDidChangeTextDocument(() => this.update());

    // Listen for MindHive events
    this.client.onEvent((event) => {
      if (event.type === 'connected') {
        this.statusBarItem.text = '$(brain) MindHive ✓';
        this.statusBarItem.tooltip = 'Connected to collective intelligence';
      } else if (event.type === 'disconnected') {
        this.statusBarItem.text = '$(brain) MindHive ✗';
        this.statusBarItem.tooltip = 'Disconnected - Click to reconnect';
      }
    });

    context.subscriptions.push(this.statusBarItem, this.decorationType);
  }

  public show(): void {
    this.isVisible = true;
    this.statusBarItem.show();
    this.showFloatingHUD();
    this.startRealtimeUpdates();
    this.update();
  }

  public hide(): void {
    this.isVisible = false;
    this.statusBarItem.hide();
    this.stopRealtimeUpdates();
    if (this.webviewPanel) {
      this.webviewPanel.dispose();
      this.webviewPanel = undefined;
    }
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.decorationType, []);
    }
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show floating HUD overlay with real-time metrics
   */
  private showFloatingHUD(): void {
    if (this.webviewPanel) {
      this.webviewPanel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'mindhiveHUD',
      '🧠 MindHive HUD',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      }
    );

    this.webviewPanel.webview.html = this.getHUDHTML();

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
      this.isVisible = false;
    });

    // Handle messages from webview
    this.webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          await this.updateHUD();
          break;
        case 'toggleAgent':
          await this.toggleAgent(message.agent);
          break;
      }
    });
  }

  /**
   * Start real-time metric updates (every 2 seconds)
   */
  private startRealtimeUpdates(): void {
    this.stopRealtimeUpdates();
    this.updateInterval = setInterval(() => {
      this.updateHUD();
    }, 2000);
  }

  /**
   * Stop real-time updates
   */
  private stopRealtimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Update HUD with latest metrics
   */
  private async updateHUD(): Promise<void> {
    if (!this.webviewPanel || !this.isVisible) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    try {
      // Get current file code
      const code = editor.document.getText();
      const language = editor.document.languageId;

      // Fetch quality metrics
      const metrics = await this.fetchQualityMetrics(code, language);
      this.currentMetrics = metrics;

      // Fetch model consensus
      const consensus = await this.fetchModelConsensus(code, language);
      this.currentConsensus = consensus;

      // Fetch agent activity
      await this.fetchAgentActivity();

      // Update webview
      this.webviewPanel.webview.postMessage({
        command: 'updateMetrics',
        metrics,
        consensus,
        agents: this.agentActivity,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('HUD update failed:', error);
    }
  }

  /**
   * Fetch quality metrics from backend
   */
  private async fetchQualityMetrics(code: string, language: string): Promise<QualityMetrics> {
    try {
      const analysis = await this.client.post('/api/v1/code/analyze', {
        code,
        language,
        includeMetrics: true,
      });

      return {
        overall: analysis.metrics?.quality || 0,
        security: analysis.metrics?.security || 0,
        performance: analysis.metrics?.performance || 0,
        maintainability: analysis.metrics?.maintainability || 0,
        coverage: analysis.metrics?.coverage || 0,
        nexusConfidence: analysis.nexusConfidence || 0,
      };
    } catch (error) {
      // Return default metrics on error
      return {
        overall: 0,
        security: 0,
        performance: 0,
        maintainability: 0,
        coverage: 0,
        nexusConfidence: 0,
      };
    }
  }

  /**
   * Fetch multi-model consensus data
   */
  private async fetchModelConsensus(code: string, language: string): Promise<ModelConsensus> {
    try {
      const result = await this.client.post('/api/v1/intelligence/consensus', {
        code,
        language,
      });

      return {
        gpt4: result.models?.gpt4 || { score: 0, status: 'abstain' },
        gpt5: result.models?.gpt5 || { score: 0, status: 'abstain' },
        claude: result.models?.claude || { score: 0, status: 'abstain' },
        gemini: result.models?.gemini || { score: 0, status: 'abstain' },
        grok: result.models?.grok || { score: 0, status: 'abstain' },
        perplexity: result.models?.perplexity || { score: 0, status: 'abstain' },
        consensus: result.consensus || 0,
      };
    } catch (error) {
      // Return default consensus on error
      return {
        gpt4: { score: 0, status: 'abstain' },
        gpt5: { score: 0, status: 'abstain' },
        claude: { score: 0, status: 'abstain' },
        gemini: { score: 0, status: 'abstain' },
        grok: { score: 0, status: 'abstain' },
        perplexity: { score: 0, status: 'abstain' },
        consensus: 0,
      };
    }
  }

  /**
   * Fetch agent activity status
   */
  private async fetchAgentActivity(): Promise<void> {
    try {
      const agents = await this.client.getAgentStatus();
      this.agentActivity = {
        codegen: agents.some(a => a.agentId === 'codegen' && a.status === 'processing'),
        sentinel: agents.some(a => a.agentId === 'sentinel' && a.status === 'processing'),
        optimizer: agents.some(a => a.agentId === 'optimizer' && a.status === 'processing'),
        securityGuard: agents.some(a => a.agentId === 'security' && a.status === 'processing'),
        oracle: agents.some(a => a.agentId === 'oracle' && a.status === 'processing'),
      };
    } catch (error) {
      // Keep previous state on error
    }
  }

  /**
   * Toggle agent on/off
   */
  private async toggleAgent(agentType: string): Promise<void> {
    try {
      await this.client.post(`/api/v1/agents/${agentType}/toggle`, {});
      await this.fetchAgentActivity();
      await this.updateHUD();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to toggle ${agentType} agent`);
    }
  }

  private async update(): Promise<void> {
    if (!this.isVisible) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const config = vscode.workspace.getConfiguration('MindHive');
    if (!config.get('showInlineInsights')) {
      return;
    }

    // Get analytics for current file
    try {
      const analytics = await this.client.getUserAnalytics();
      if (analytics) {
        this.updateStatusBar(analytics);
        await this.updateInlineDecorations(editor, analytics);
      }
    } catch (error) {
      // Silent fail - don't disrupt user
    }
  }

  private updateStatusBar(analytics: any): void {
    const velocity = analytics.codeVelocity || 0;
    const quality = analytics.codeQuality || 0;

    this.statusBarItem.text = `$(brain) Hive | Quality: ${Math.round(
      quality
    )}% | Velocity: ${velocity}`;
  }

  private async updateInlineDecorations(
    editor: vscode.TextEditor,
    analytics: any
  ): Promise<void> {
    const decorations: vscode.DecorationOptions[] = [];

    // Add insights at key locations
    const text = editor.document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect function declarations
      if (this.isFunctionDeclaration(line)) {
        const insight = await this.getFunctionInsight(line);
        if (insight) {
          decorations.push({
            range: new vscode.Range(i, line.length, i, line.length),
            renderOptions: {
              after: {
                contentText: ` 💡 ${insight}`,
              },
            },
          });
        }
      }

      // Detect imports
      if (this.isImportStatement(line)) {
        const packageName = this.extractPackageName(line);
        if (packageName) {
          const insight = await this.getPackageInsight(packageName);
          if (insight) {
            decorations.push({
              range: new vscode.Range(i, line.length, i, line.length),
              renderOptions: {
                after: {
                  contentText: ` ${insight}`,
                },
              },
            });
          }
        }
      }
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  private isFunctionDeclaration(line: string): boolean {
    return /function\s+\w+/.test(line) || /const\s+\w+\s*=\s*\(.*\)\s*=>/.test(line);
  }

  private isImportStatement(line: string): boolean {
    return /^import\s+/.test(line.trim()) || /^from\s+/.test(line.trim());
  }

  private extractPackageName(line: string): string | null {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  private async getFunctionInsight(line: string): Promise<string | null> {
    // Get insights from global patterns
    try {
      const patterns = await this.client.searchPatterns(line, { limit: 1 });
      if (patterns.length > 0) {
        const pattern = patterns[0];
        return `${pattern.usageCount.toLocaleString()} devs use similar | ${Math.round(
          pattern.successRate * 100
        )}% success`;
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  private async getPackageInsight(packageName: string): Promise<string | null> {
    // Check if package is popular or deprecated
    try {
      const insights = await this.client.getCollectiveInsights();
      const packageInsight = insights.find((i) =>
        i.content.includes(packageName)
      );

      if (packageInsight) {
        if (packageInsight.type === 'deprecation') {
          return '⚠️ Deprecated';
        } else if (packageInsight.type === 'trending') {
          return '🔥 Trending';
        }
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  /**
   * Generate HUD HTML with real-time metrics display
   */
  private getHUDHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MindHive HUD</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      overflow-y: auto;
    }

    .hud-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .refresh-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .refresh-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .metric-label {
      font-size: 14px;
      opacity: 0.9;
    }

    .metric-value {
      font-size: 20px;
      font-weight: 700;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .progress-fill.warning {
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
    }

    .progress-fill.danger {
      background: linear-gradient(90deg, #f87171, #ef4444);
    }

    .consensus-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 16px;
    }

    .model-card {
      background: rgba(255, 255, 255, 0.15);
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .model-card.agree {
      border-color: #4ade80;
      background: rgba(74, 222, 128, 0.2);
    }

    .model-card.disagree {
      border-color: #f87171;
      background: rgba(248, 113, 113, 0.2);
    }

    .model-name {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .model-score {
      font-size: 18px;
      font-weight: 700;
    }

    .model-status {
      font-size: 11px;
      margin-top: 4px;
      opacity: 0.8;
    }

    .consensus-big {
      font-size: 48px;
      font-weight: 700;
      text-align: center;
      margin: 20px 0;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .agent-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .agent-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .agent-item:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateX(5px);
    }

    .agent-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .agent-status {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #94a3b8;
      animation: pulse 2s infinite;
    }

    .agent-status.active {
      background: #4ade80;
      box-shadow: 0 0 10px #4ade80;
    }

    .agent-name {
      font-size: 14px;
      font-weight: 600;
    }

    .timestamp {
      text-align: center;
      opacity: 0.6;
      font-size: 12px;
      margin-top: 20px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .loading {
      text-align: center;
      padding: 40px;
      opacity: 0.6;
    }

    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="hud-container">
    <div class="header">
      <h1>
        <span>🧠</span>
        <span>MindHive HUD</span>
      </h1>
      <button class="refresh-btn" onclick="refresh()">🔄 Refresh</button>
    </div>

    <div id="content">
      <div class="loading">
        <div class="spinner"></div>
        <div>Loading metrics...</div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function toggleAgent(agent) {
      vscode.postMessage({ command: 'toggleAgent', agent });
    }

    window.addEventListener('message', event => {
      const message = event.data;
      
      if (message.command === 'updateMetrics') {
        updateDisplay(message.metrics, message.consensus, message.agents, message.timestamp);
      }
    });

    function updateDisplay(metrics, consensus, agents, timestamp) {
      const content = document.getElementById('content');
      
      content.innerHTML = \`
        <!-- Quality Metrics Card -->
        <div class="card">
          <div class="card-title">
            <span>📊</span>
            <span>Code Quality Metrics</span>
          </div>
          
          <div class="metric-row">
            <span class="metric-label">Overall Quality</span>
            <span class="metric-value">\${metrics.overall}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill \${getProgressClass(metrics.overall)}" style="width: \${metrics.overall}%"></div>
          </div>

          <div class="metric-row" style="margin-top: 16px;">
            <span class="metric-label">🔒 Security</span>
            <span class="metric-value">\${metrics.security}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill \${getProgressClass(metrics.security)}" style="width: \${metrics.security}%"></div>
          </div>

          <div class="metric-row" style="margin-top: 16px;">
            <span class="metric-label">⚡ Performance</span>
            <span class="metric-value">\${metrics.performance}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill \${getProgressClass(metrics.performance)}" style="width: \${metrics.performance}%"></div>
          </div>

          <div class="metric-row" style="margin-top: 16px;">
            <span class="metric-label">🔧 Maintainability</span>
            <span class="metric-value">\${metrics.maintainability}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill \${getProgressClass(metrics.maintainability)}" style="width: \${metrics.maintainability}%"></div>
          </div>

          <div class="metric-row" style="margin-top: 16px;">
            <span class="metric-label">🎯 NEXUS Confidence</span>
            <span class="metric-value">\${metrics.nexusConfidence}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill \${getProgressClass(metrics.nexusConfidence)}" style="width: \${metrics.nexusConfidence}%"></div>
          </div>
        </div>

        <!-- Multi-Model Consensus Card -->
        <div class="card">
          <div class="card-title">
            <span>🤝</span>
            <span>Multi-Model Consensus</span>
          </div>

          <div class="consensus-big">\${consensus.consensus}%</div>

          <div class="consensus-grid">
            <div class="model-card \${consensus.gpt4.status}">
              <div class="model-name">GPT-4</div>
              <div class="model-score">\${consensus.gpt4.score}%</div>
              <div class="model-status">\${consensus.gpt4.status}</div>
            </div>
            <div class="model-card \${consensus.gpt5.status}">
              <div class="model-name">GPT-5</div>
              <div class="model-score">\${consensus.gpt5.score}%</div>
              <div class="model-status">\${consensus.gpt5.status}</div>
            </div>
            <div class="model-card \${consensus.claude.status}">
              <div class="model-name">Claude</div>
              <div class="model-score">\${consensus.claude.score}%</div>
              <div class="model-status">\${consensus.claude.status}</div>
            </div>
            <div class="model-card \${consensus.gemini.status}">
              <div class="model-name">Gemini</div>
              <div class="model-score">\${consensus.gemini.score}%</div>
              <div class="model-status">\${consensus.gemini.status}</div>
            </div>
            <div class="model-card \${consensus.grok.status}">
              <div class="model-name">Grok</div>
              <div class="model-score">\${consensus.grok.score}%</div>
              <div class="model-status">\${consensus.grok.status}</div>
            </div>
            <div class="model-card \${consensus.perplexity.status}">
              <div class="model-name">Perplexity</div>
              <div class="model-score">\${consensus.perplexity.score}%</div>
              <div class="model-status">\${consensus.perplexity.status}</div>
            </div>
          </div>
        </div>

        <!-- Agent Activity Card -->
        <div class="card">
          <div class="card-title">
            <span>🤖</span>
            <span>Active Agents</span>
          </div>

          <div class="agent-list">
            <div class="agent-item" onclick="toggleAgent('codegen')">
              <div class="agent-info">
                <div class="agent-status \${agents.codegen ? 'active' : ''}"></div>
                <div class="agent-name">CodeGen Agent</div>
              </div>
              <div>\${agents.codegen ? '✅' : '⏸️'}</div>
            </div>

            <div class="agent-item" onclick="toggleAgent('sentinel')">
              <div class="agent-info">
                <div class="agent-status \${agents.sentinel ? 'active' : ''}"></div>
                <div class="agent-name">Sentinel Agent</div>
              </div>
              <div>\${agents.sentinel ? '✅' : '⏸️'}</div>
            </div>

            <div class="agent-item" onclick="toggleAgent('optimizer')">
              <div class="agent-info">
                <div class="agent-status \${agents.optimizer ? 'active' : ''}"></div>
                <div class="agent-name">Optimizer Agent</div>
              </div>
              <div>\${agents.optimizer ? '✅' : '⏸️'}</div>
            </div>

            <div class="agent-item" onclick="toggleAgent('security')">
              <div class="agent-info">
                <div class="agent-status \${agents.securityGuard ? 'active' : ''}"></div>
                <div class="agent-name">Security Guard</div>
              </div>
              <div>\${agents.securityGuard ? '✅' : '⏸️'}</div>
            </div>

            <div class="agent-item" onclick="toggleAgent('oracle')">
              <div class="agent-info">
                <div class="agent-status \${agents.oracle ? 'active' : ''}"></div>
                <div class="agent-name">Oracle Agent</div>
              </div>
              <div>\${agents.oracle ? '✅' : '⏸️'}</div>
            </div>
          </div>
        </div>

        <div class="timestamp">
          Last updated: \${new Date(timestamp).toLocaleTimeString()}
        </div>
      \`;
    }

    function getProgressClass(value) {
      if (value >= 80) return '';
      if (value >= 60) return 'warning';
      return 'danger';
    }
  </script>
</body>
</html>`;
  }
}

