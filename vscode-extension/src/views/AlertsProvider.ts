import * as vscode from 'vscode';
import { MindHiveClient, SelfHealingAlert } from '../client/HiveMindClient';

export class AlertsProvider implements vscode.TreeDataProvider<AlertItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AlertItem | undefined | null | void> = new vscode.EventEmitter<AlertItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AlertItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private alerts: SelfHealingAlert[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private client: MindHiveClient
  ) {
    this.refresh();

    // Listen for new alerts
    client.onEvent((event) => {
      if (event.type === 'alert:new') {
        this.addAlert(event.data);
      }
    });

    // Refresh periodically
    setInterval(() => this.refresh(), 10000);
  }

  refresh(): void {
    this.loadAlerts();
    this._onDidChangeTreeData.fire();
  }

  private async loadAlerts(): Promise<void> {
    try {
      this.alerts = await this.client.getAlerts();
    } catch (error) {
      this.alerts = [];
    }
  }

  private addAlert(alert: SelfHealingAlert): void {
    this.alerts.unshift(alert);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AlertItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AlertItem): Promise<AlertItem[]> {
    if (!element) {
      if (this.alerts.length === 0) {
        const item = new AlertItem('No alerts', vscode.TreeItemCollapsibleState.None, null);
        item.description = '✅';
        return [item];
      }

      return this.alerts.map(alert => {
        const item = new AlertItem(
          alert.title,
          vscode.TreeItemCollapsibleState.None,
          alert
        );
        
        item.description = this.getSeverityEmoji(alert.severity);
        item.tooltip = alert.description;
        
        if (alert.suggestedFix) {
          item.command = {
            command: 'MindHive.applyFix',
            title: 'Apply Fix',
            arguments: [alert]
          };
        }

        return item;
      });
    }

    return [];
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴 Critical';
      case 'high': return '🟠 High';
      case 'medium': return '🟡 Medium';
      case 'low': return '🟢 Low';
      default: return '⚪ Unknown';
    }
  }
}

class AlertItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly alert: SelfHealingAlert | null
  ) {
    super(label, collapsibleState);
  }
}

