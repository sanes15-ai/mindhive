/**
 * 🎨 COLLABORATION PANEL
 * 
 * Beautiful real-time collaboration UI:
 * - Live user list with avatars
 * - Activity feed
 * - Shared chat
 * - File browser
 * - Session controls
 * - AI assistant integration
 */

import * as vscode from 'vscode';
import { CollaborationEngine, CollaborationSession, Participant } from '../services/collaboration/CollaborationEngine';
import { PresenceManager, PresenceState } from '../services/collaboration/PresenceManager';
import { AICollaborator } from '../services/collaboration/AICollaborator';
import { CommentThreadManager } from '../services/collaboration/CommentThread';

// ============================================================================
// COLLABORATION PANEL
// ============================================================================

export class CollabPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];
  
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly collaborationEngine: CollaborationEngine,
    private readonly presenceManager: PresenceManager,
    private readonly aiCollaborator: AICollaborator,
    private readonly commentManager: CommentThreadManager
  ) {
    this.setupEventListeners();
  }
  
  // ==========================================================================
  // PANEL MANAGEMENT
  // ==========================================================================
  
  /**
   * Show collaboration panel
   */
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }
    
    // Create webview panel
    this.panel = vscode.window.createWebviewPanel(
      'mindhiveCollaboration',
      '👥 Collaboration',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );
    
    // Set icon
    this.panel.iconPath = {
      light: vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'collab-light.svg'),
      dark: vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'collab-dark.svg')
    };
    
    // Set HTML content
    this.panel.webview.html = this.getHtmlContent();
    
    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables
    );
    
    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.disposables
    );
    
    // Send initial state
    this.sendUpdate();
  }
  
  /**
   * Hide panel
   */
  hide(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }
  
  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================
  
  private setupEventListeners(): void {
    // Collaboration engine events
    this.collaborationEngine.on('participant-joined', (participant: Participant) => {
      this.sendUpdate();
      this.showNotification(`${participant.name} joined the session`, 'info');
    });
    
    this.collaborationEngine.on('participant-left', (participant: Participant) => {
      this.sendUpdate();
      this.showNotification(`${participant.name} left the session`, 'info');
    });
    
    this.collaborationEngine.on('participant-updated', () => {
      this.sendUpdate();
    });
    
    this.collaborationEngine.on('document-changed', () => {
      this.sendUpdate();
    });
    
    // Presence events
    this.presenceManager.on('status-changed', () => {
      this.sendUpdate();
    });
    
    this.presenceManager.on('activity', () => {
      this.sendUpdate();
    });
    
    // AI events
    this.aiCollaborator.on('ai-action-proposed', () => {
      this.sendUpdate();
    });
    
    this.aiCollaborator.on('ai-suggestion-created', () => {
      this.sendUpdate();
    });
    
    // Comment events
    this.commentManager.on('thread-created', () => {
      this.sendUpdate();
    });
  }
  
  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'startSession':
        await this.handleStartSession(message.config);
        break;
      
      case 'leaveSession':
        await this.handleLeaveSession();
        break;
      
      case 'sendChat':
        await this.handleSendChat(message.text);
        break;
      
      case 'createComment':
        await this.handleCreateComment(message.data);
        break;
      
      case 'resolveComment':
        await this.handleResolveComment(message.threadId);
        break;
      
      case 'askAI':
        await this.handleAskAI(message.question);
        break;
      
      case 'acceptAISuggestion':
        await this.handleAcceptAISuggestion(message.suggestionId);
        break;
      
      case 'refresh':
        this.sendUpdate();
        break;
    }
  }
  
  private async handleStartSession(config: any): Promise<void> {
    try {
      await this.collaborationEngine.startSession(config);
      this.sendUpdate();
      this.showNotification('Collaboration session started!', 'success');
    } catch (error: any) {
      this.showNotification(`Failed to start session: ${error.message}`, 'error');
    }
  }
  
  private async handleLeaveSession(): Promise<void> {
    try {
      await this.collaborationEngine.leaveSession();
      this.sendUpdate();
      this.showNotification('Left collaboration session', 'info');
    } catch (error: any) {
      this.showNotification(`Failed to leave session: ${error.message}`, 'error');
    }
  }
  
  private async handleSendChat(text: string): Promise<void> {
    // In real implementation, integrate with chat system
    this.showNotification('Chat sent!', 'success');
  }
  
  private async handleCreateComment(data: any): Promise<void> {
    try {
      const session = this.collaborationEngine.getCurrentSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const author = Array.from(session.participants.values())[0];
      this.commentManager.createThread(
        data.filePath,
        data.range,
        {
          clientId: author.clientId,
          name: author.name,
          email: author.email
        },
        data.content
      );
      
      this.sendUpdate();
      this.showNotification('Comment created!', 'success');
    } catch (error: any) {
      this.showNotification(`Failed to create comment: ${error.message}`, 'error');
    }
  }
  
  private async handleResolveComment(threadId: string): Promise<void> {
    try {
      const session = this.collaborationEngine.getCurrentSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const author = Array.from(session.participants.values())[0];
      this.commentManager.resolveThread(threadId, author.clientId);
      
      this.sendUpdate();
      this.showNotification('Comment resolved!', 'success');
    } catch (error: any) {
      this.showNotification(`Failed to resolve comment: ${error.message}`, 'error');
    }
  }
  
  private async handleAskAI(question: string): Promise<void> {
    try {
      const assistance = await this.aiCollaborator.provideAssistance('explain', question);
      this.sendMessage({
        command: 'aiResponse',
        response: assistance
      });
    } catch (error: any) {
      this.showNotification(`AI error: ${error.message}`, 'error');
    }
  }
  
  private async handleAcceptAISuggestion(suggestionId: string): Promise<void> {
    try {
      this.aiCollaborator.acceptSuggestion(suggestionId);
      this.sendUpdate();
      this.showNotification('AI suggestion accepted!', 'success');
    } catch (error: any) {
      this.showNotification(`Failed to accept suggestion: ${error.message}`, 'error');
    }
  }
  
  // ==========================================================================
  // COMMUNICATION
  // ==========================================================================
  
  private sendUpdate(): void {
    if (!this.panel) {
      return;
    }
    
    const session = this.collaborationEngine.getCurrentSession();
    const presenceStates = this.presenceManager.getAllPresence();
    const aiStats = this.aiCollaborator.getStatistics();
    const commentStats = this.commentManager.getStatistics();
    const syncStatus = this.collaborationEngine.getSyncStatus();
    
    this.sendMessage({
      command: 'update',
      data: {
        session,
        participants: session ? Array.from(session.participants.values()) : [],
        presenceStates,
        aiStats,
        commentStats,
        syncStatus,
        aiSuggestions: this.aiCollaborator.getSuggestions(),
        recentComments: this.commentManager.filterThreads({ isResolved: false }).slice(0, 5)
      }
    });
  }
  
  private sendMessage(message: any): void {
    if (this.panel) {
      this.panel.webview.postMessage(message);
    }
  }
  
  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    this.sendMessage({
      command: 'notification',
      message,
      type
    });
  }
  
  // ==========================================================================
  // HTML CONTENT
  // ==========================================================================
  
  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MindHive Collaboration</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
    }
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10B981;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .section {
      margin-bottom: 24px;
      padding: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .participant {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      transition: all 0.2s;
    }
    
    .participant:hover {
      background: var(--vscode-list-hoverBackground);
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
    
    .participant-info {
      flex: 1;
    }
    
    .participant-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .participant-status {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .activity-feed {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .activity-item {
      padding: 12px;
      margin-bottom: 8px;
      background: var(--vscode-editor-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      border-radius: 4px;
    }
    
    .activity-time {
      font-size: 11px;
      opacity: 0.6;
    }
    
    .button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
      width: 100%;
      margin-top: 8px;
    }
    
    .button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    .button-secondary {
      background: transparent;
      border: 1px solid var(--vscode-button-border);
    }
    
    .ai-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    
    .ai-suggestion {
      background: rgba(255, 255, 255, 0.1);
      padding: 12px;
      border-radius: 6px;
      margin-top: 12px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    
    .stat-card {
      padding: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: var(--vscode-textLink-foreground);
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .notification-success {
      background: #10B981;
      color: white;
    }
    
    .notification-error {
      background: #EF4444;
      color: white;
    }
    
    .notification-info {
      background: #3B82F6;
      color: white;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.6;
    }
    
    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>👥 Collaboration</h1>
    <div class="status-indicator" id="statusIndicator"></div>
  </div>
  
  <div id="sessionStatus" class="section">
    <div class="section-title">📡 Session Status</div>
    <div id="sessionInfo"></div>
  </div>
  
  <div class="ai-section">
    <div class="section-title" style="color: white;">🤖 AI Assistant</div>
    <div id="aiInfo"></div>
    <div id="aiSuggestions"></div>
  </div>
  
  <div class="section">
    <div class="section-title">👥 Participants (<span id="participantCount">0</span>)</div>
    <div id="participants"></div>
  </div>
  
  <div class="section">
    <div class="section-title">📊 Statistics</div>
    <div class="stats-grid" id="stats"></div>
  </div>
  
  <div class="section">
    <div class="section-title">💬 Recent Comments</div>
    <div id="comments"></div>
  </div>
  
  <div class="section">
    <div class="section-title">⚡ Activity Feed</div>
    <div class="activity-feed" id="activityFeed"></div>
  </div>
  
  <div id="notificationContainer"></div>
  
  <script>
    const vscode = acquireVsCodeApi();
    let currentState = {};
    
    // Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'update':
          currentState = message.data;
          updateUI();
          break;
        
        case 'notification':
          showNotification(message.message, message.type);
          break;
        
        case 'aiResponse':
          showAIResponse(message.response);
          break;
      }
    });
    
    function updateUI() {
      updateSessionStatus();
      updateParticipants();
      updateAISection();
      updateStats();
      updateComments();
      updateActivityFeed();
    }
    
    function updateSessionStatus() {
      const info = document.getElementById('sessionInfo');
      const { session, syncStatus } = currentState;
      
      if (!session) {
        info.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">🚀</div>
            <p>No active session</p>
            <button class="button" onclick="startSession()">Start Collaboration</button>
          </div>
        \`;
        return;
      }
      
      info.innerHTML = \`
        <p><strong>Session ID:</strong> \${session.sessionId}</p>
        <p><strong>Status:</strong> \${syncStatus.connectionState}</p>
        <p><strong>Synced:</strong> \${syncStatus.isSynced ? '✅ Yes' : '⏳ Syncing...'}</p>
        <button class="button button-secondary" onclick="leaveSession()">Leave Session</button>
      \`;
    }
    
    function updateParticipants() {
      const container = document.getElementById('participants');
      const count = document.getElementById('participantCount');
      const { participants = [] } = currentState;
      
      count.textContent = participants.length;
      
      if (participants.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No participants</p></div>';
        return;
      }
      
      container.innerHTML = participants.map(p => \`
        <div class="participant">
          <div class="avatar" style="background: \${p.color}">
            \${p.name.charAt(0).toUpperCase()}
          </div>
          <div class="participant-info">
            <div class="participant-name">\${p.name}</div>
            <div class="participant-status">\${p.isOnline ? '🟢 Online' : '⚫ Offline'}</div>
          </div>
        </div>
      \`).join('');
    }
    
    function updateAISection() {
      const info = document.getElementById('aiInfo');
      const suggestions = document.getElementById('aiSuggestions');
      const { aiStats, aiSuggestions = [] } = currentState;
      
      if (!aiStats) return;
      
      info.innerHTML = \`
        <p>\${aiStats.isThinking ? '🤔 Thinking...' : '💡 Ready to help'}</p>
        <p><strong>Active Actions:</strong> \${aiStats.activeActions}</p>
        <p><strong>Suggestions:</strong> \${aiStats.pendingSuggestions}</p>
      \`;
      
      if (aiSuggestions.length > 0) {
        suggestions.innerHTML = aiSuggestions.map(s => \`
          <div class="ai-suggestion">
            <strong>\${s.title}</strong>
            <p style="font-size: 14px; margin-top: 8px;">\${s.description}</p>
            <button class="button" onclick="acceptAISuggestion('\${s.id}')" style="margin-top: 8px; padding: 6px 12px; font-size: 12px;">Accept</button>
          </div>
        \`).join('');
      }
    }
    
    function updateStats() {
      const container = document.getElementById('stats');
      const { commentStats, syncStatus } = currentState;
      
      if (!commentStats) return;
      
      container.innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${syncStatus.participantCount}</div>
          <div class="stat-label">Online</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${commentStats.activeThreads}</div>
          <div class="stat-label">Active Threads</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${commentStats.totalComments}</div>
          <div class="stat-label">Comments</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${commentStats.filesWithComments}</div>
          <div class="stat-label">Files</div>
        </div>
      \`;
    }
    
    function updateComments() {
      const container = document.getElementById('comments');
      const { recentComments = [] } = currentState;
      
      if (recentComments.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No recent comments</p></div>';
        return;
      }
      
      container.innerHTML = recentComments.map(thread => \`
        <div class="activity-item">
          <strong>\${thread.comments[0].author.name}</strong>
          <p style="margin-top: 4px;">\${thread.comments[0].content}</p>
          <div class="activity-time">\${new Date(thread.createdAt).toLocaleString()}</div>
          <button class="button button-secondary" onclick="resolveComment('\${thread.id}')" style="padding: 4px 12px; font-size: 12px; margin-top: 8px;">Resolve</button>
        </div>
      \`).join('');
    }
    
    function updateActivityFeed() {
      const feed = document.getElementById('activityFeed');
      // In real implementation, show actual activity
      feed.innerHTML = '<div class="empty-state"><p>Activity feed coming soon...</p></div>';
    }
    
    function showNotification(message, type) {
      const container = document.getElementById('notificationContainer');
      const notification = document.createElement('div');
      notification.className = \`notification notification-\${type}\`;
      notification.textContent = message;
      
      container.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
    
    function showAIResponse(response) {
      showNotification(response, 'info');
    }
    
    function startSession() {
      vscode.postMessage({
        command: 'startSession',
        config: {
          documentId: 'default-doc',
          userName: 'User',
          enableWebRTC: true,
          enableIndexedDB: true
        }
      });
    }
    
    function leaveSession() {
      vscode.postMessage({ command: 'leaveSession' });
    }
    
    function acceptAISuggestion(suggestionId) {
      vscode.postMessage({ command: 'acceptAISuggestion', suggestionId });
    }
    
    function resolveComment(threadId) {
      vscode.postMessage({ command: 'resolveComment', threadId });
    }
    
    // Request initial data
    vscode.postMessage({ command: 'refresh' });
  </script>
</body>
</html>`;
  }
  
  // ==========================================================================
  // DISPOSE
  // ==========================================================================
  
  dispose(): void {
    this.hide();
    
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
