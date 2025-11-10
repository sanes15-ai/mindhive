import * as vscode from 'vscode';
import { MindHiveClient, AgentStatus } from '../client/HiveMindClient';

/**
 * AGENT STATUS BAR - Real-time Agent Activity Display
 * 
 * Shows live status of all 5 AI agents in the VS Code status bar:
 * - CodeGen Agent: Code generation and completion
 * - Sentinel Agent: Error detection and monitoring
 * - Optimizer Agent: Performance optimization
 * - Security Guard: Security scanning
 * - Oracle Agent: Predictive analytics
 * 
 * Features:
 * - Real-time status updates every 2 seconds
 * - Click to see detailed agent info
 * - Color-coded status indicators
 * - Task progress display
 * - Confidence scores
 */

interface AgentStatusItem {
  agent: AgentStatus;
  statusBarItem: vscode.StatusBarItem;
}

export class AgentStatusBar {
  private statusItems: Map<string, AgentStatusItem> = new Map();
  private updateInterval: NodeJS.Timeout | undefined;
  private mainStatusItem: vscode.StatusBarItem;
  private isVisible: boolean = false;

  private agentConfig = [
    { id: 'codegen', name: 'CodeGen', icon: '🤖', priority: 100 },
    { id: 'sentinel', name: 'Sentinel', icon: '🛡️', priority: 99 },
    { id: 'optimizer', name: 'Optimizer', icon: '⚡', priority: 98 },
    { id: 'security', name: 'Security', icon: '🔒', priority: 97 },
    { id: 'oracle', name: 'Oracle', icon: '🔮', priority: 96 },
  ];

  constructor(
    private context: vscode.ExtensionContext,
    private client: MindHiveClient
  ) {
    // Create main status item (shows total active agents)
    this.mainStatusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      101
    );
    this.mainStatusItem.command = 'mindhive.showAgentPanel';
    this.mainStatusItem.tooltip = 'Click to view agent details';
    context.subscriptions.push(this.mainStatusItem);

    // Create individual status items for each agent
    this.agentConfig.forEach(config => {
      const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        config.priority
      );
      statusBarItem.command = 'mindhive.showAgentDetails';
      statusBarItem.text = `${config.icon} ${config.name}`;
      
      this.statusItems.set(config.id, {
        agent: {
          agentId: config.id,
          name: config.name,
          status: 'idle',
        },
        statusBarItem,
      });

      context.subscriptions.push(statusBarItem);
    });

    // Listen for agent events from WebSocket
    this.client.onEvent((event) => {
      if (event.type === 'agent:status') {
        this.updateAgentStatus(event.data);
      }
    });
  }

  /**
   * Show agent status bar items
   */
  public show(): void {
    this.isVisible = true;
    this.mainStatusItem.show();
    this.statusItems.forEach(item => item.statusBarItem.show());
    this.startRealtimeUpdates();
  }

  /**
   * Hide agent status bar items
   */
  public hide(): void {
    this.isVisible = false;
    this.mainStatusItem.hide();
    this.statusItems.forEach(item => item.statusBarItem.hide());
    this.stopRealtimeUpdates();
  }

  /**
   * Toggle agent status bar visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Start real-time status updates
   */
  private startRealtimeUpdates(): void {
    this.stopRealtimeUpdates();
    
    // Initial update
    this.updateAllAgents();

    // Update every 2 seconds
    this.updateInterval = setInterval(() => {
      this.updateAllAgents();
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
   * Fetch and update all agent statuses
   */
  private async updateAllAgents(): Promise<void> {
    if (!this.isVisible) {
      return;
    }

    try {
      const agents = await this.client.getAgentStatus();
      
      // Update each agent
      agents.forEach(agent => {
        this.updateAgentStatus(agent);
      });

      // Update main status item with active count
      const activeCount = agents.filter(a => a.status === 'processing').length;
      this.updateMainStatus(activeCount, agents.length);
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    }
  }

  /**
   * Update individual agent status
   */
  private updateAgentStatus(agent: AgentStatus): void {
    const item = this.statusItems.get(agent.agentId);
    if (!item) {
      return;
    }

    // Update stored agent data
    item.agent = agent;

    // Get agent config
    const config = this.agentConfig.find(c => c.id === agent.agentId);
    if (!config) {
      return;
    }

    // Build status text with color coding
    let text = `${config.icon} ${config.name}`;
    let color = undefined;
    let tooltip = `${config.name} Agent`;

    switch (agent.status) {
      case 'processing':
        text += ' $(sync~spin)';
        color = new vscode.ThemeColor('statusBarItem.warningForeground');
        tooltip += ` - ACTIVE${agent.currentTask ? ': ' + agent.currentTask : ''}`;
        if (agent.confidence) {
          tooltip += `\nConfidence: ${Math.round(agent.confidence * 100)}%`;
        }
        break;

      case 'error':
        text += ' $(error)';
        color = new vscode.ThemeColor('statusBarItem.errorForeground');
        tooltip += ' - ERROR';
        break;

      case 'idle':
      default:
        text += ' $(circle-outline)';
        color = new vscode.ThemeColor('statusBarItem.foreground');
        tooltip += ' - Idle';
        break;
    }

    // Update status bar item
    item.statusBarItem.text = text;
    item.statusBarItem.color = color;
    item.statusBarItem.tooltip = tooltip;
  }

  /**
   * Update main status item showing total agent activity
   */
  private updateMainStatus(activeCount: number, totalCount: number): void {
    let text = '🧠 Agents';
    let color = undefined;
    let tooltip = 'MindHive Agents';

    if (activeCount > 0) {
      text += ` (${activeCount} active)`;
      color = new vscode.ThemeColor('statusBarItem.warningForeground');
      tooltip += `\n${activeCount} of ${totalCount} agents are currently processing`;
    } else {
      text += ' (idle)';
      tooltip += '\nAll agents idle - Click to view details';
    }

    this.mainStatusItem.text = text;
    this.mainStatusItem.color = color;
    this.mainStatusItem.tooltip = tooltip;
  }

  /**
   * Show detailed agent information in quick pick
   */
  public async showAgentDetails(): Promise<void> {
    const items: vscode.QuickPickItem[] = [];

    this.statusItems.forEach((item, agentId) => {
      const config = this.agentConfig.find(c => c.id === agentId);
      if (!config) {
        return;
      }

      let description = '';
      let detail = '';

      switch (item.agent.status) {
        case 'processing':
          description = '$(sync~spin) ACTIVE';
          detail = item.agent.currentTask || 'Processing...';
          if (item.agent.confidence) {
            detail += ` (${Math.round(item.agent.confidence * 100)}% confidence)`;
          }
          break;

        case 'error':
          description = '$(error) ERROR';
          detail = 'Agent encountered an error';
          break;

        case 'idle':
        default:
          description = '$(circle-outline) Idle';
          detail = 'Waiting for tasks';
          break;
      }

      items.push({
        label: `${config.icon} ${config.name} Agent`,
        description,
        detail,
      });
    });

    // Add overall status
    const activeCount = Array.from(this.statusItems.values())
      .filter(i => i.agent.status === 'processing').length;
    
    items.unshift({
      label: '$(info) Overall Status',
      description: activeCount > 0 ? `${activeCount} active` : 'All idle',
      detail: `${this.statusItems.size} agents monitoring your code`,
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Agent Status Overview',
      ignoreFocusOut: true,
    });

    if (selected) {
      // Could show more detailed info or trigger agent actions
      vscode.window.showInformationMessage(selected.detail || 'No additional information');
    }
  }

  /**
   * Send notification when agent starts/completes task
   */
  public async notifyAgentActivity(agent: AgentStatus, started: boolean): Promise<void> {
    const config = this.agentConfig.find(c => c.id === agent.agentId);
    if (!config) {
      return;
    }

    const message = started
      ? `${config.icon} ${config.name} started: ${agent.currentTask}`
      : `${config.icon} ${config.name} completed task`;

    // Show notification in bottom-right
    const action = await vscode.window.showInformationMessage(
      message,
      'View Details',
      'Dismiss'
    );

    if (action === 'View Details') {
      this.showAgentDetails();
    }
  }

  /**
   * Get current status of specific agent
   */
  public getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.statusItems.get(agentId)?.agent;
  }

  /**
   * Get all agent statuses
   */
  public getAllStatuses(): AgentStatus[] {
    return Array.from(this.statusItems.values()).map(item => item.agent);
  }
}
