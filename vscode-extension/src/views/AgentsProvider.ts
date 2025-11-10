import * as vscode from 'vscode';
import { MindHiveClient, AgentStatus } from '../client/HiveMindClient';

export class AgentsProvider implements vscode.TreeDataProvider<AgentItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AgentItem | undefined | null | void> = new vscode.EventEmitter<AgentItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AgentItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private agents: AgentStatus[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private client: MindHiveClient
  ) {
    this.refresh();

    // Listen for agent status updates
    client.onEvent((event) => {
      if (event.type === 'agent:status') {
        this.updateAgentStatus(event.data);
      }
    });

    // Refresh periodically
    setInterval(() => this.refresh(), 5000);
  }

  refresh(): void {
    this.loadAgents();
    this._onDidChangeTreeData.fire();
  }

  private async loadAgents(): Promise<void> {
    try {
      this.agents = await this.client.getAgentStatus();
    } catch (error) {
      this.agents = [];
    }
  }

  private updateAgentStatus(status: AgentStatus): void {
    const index = this.agents.findIndex(a => a.agentId === status.agentId);
    if (index !== -1) {
      this.agents[index] = status;
    } else {
      this.agents.push(status);
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AgentItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AgentItem): Promise<AgentItem[]> {
    if (!element) {
      // Show all agents
      return this.agents.map(agent => {
        const label = agent.status === 'processing' && agent.currentTask 
          ? `${agent.name} (${agent.currentTask})`
          : agent.name;
        
        const item = new AgentItem(label, agent);
        
        item.description = this.getStatusEmoji(agent.status);
        item.tooltip = agent.currentTask || `Status: ${agent.status}`;

        return item;
      });
    }

    return [];
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'idle': return '⚪ Idle';
      case 'processing': return '🟢 Active';
      case 'error': return '🔴 Error';
      default: return '⚫ Unknown';
    }
  }
}

class AgentItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly agent: AgentStatus
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }
}

