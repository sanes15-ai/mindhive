import * as vscode from 'vscode';
import { MindHiveClient, GlobalPattern } from '../client/HiveMindClient';

export class InsightsProvider implements vscode.TreeDataProvider<InsightItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<InsightItem | undefined | null | void> = new vscode.EventEmitter<InsightItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<InsightItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private insights: any[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private client: MindHiveClient
  ) {
    this.refresh();

    // Listen for new insights
    client.onEvent((event) => {
      if (event.type === 'insight:new' || event.type === 'pattern:new') {
        this.refresh();
      }
    });
  }

  refresh(): void {
    this.loadInsights();
    this._onDidChangeTreeData.fire();
  }

  private async loadInsights(): Promise<void> {
    try {
      this.insights = await this.client.getCollectiveInsights();
    } catch (error) {
      this.insights = [];
    }
  }

  getTreeItem(element: InsightItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: InsightItem): Promise<InsightItem[]> {
    if (!element) {
      // Root level - show categories
      return [
        new InsightItem('Trending Patterns', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'trending'),
        new InsightItem('Deprecations', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'deprecations'),
        new InsightItem('Best Practices', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'best-practices'),
        new InsightItem('Recent Insights', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'recent'),
      ];
    }

    if (element.type === 'category') {
      return this.getCategoryChildren(element.category!);
    }

    return [];
  }

  private async getCategoryChildren(category: string): Promise<InsightItem[]> {
    const filtered = this.insights.filter(i => i.type === category || category === 'recent');
    
    return filtered.slice(0, 10).map(insight => {
      const item = new InsightItem(
        insight.title || insight.content,
        vscode.TreeItemCollapsibleState.None,
        'insight'
      );
      
      item.description = insight.confidence ? `${Math.round(insight.confidence * 100)}%` : '';
      item.tooltip = insight.description || insight.content;
      item.command = {
        command: 'MindHive.showInsightDetail',
        title: 'Show Detail',
        arguments: [insight]
      };

      return item;
    });
  }
}

class InsightItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'category' | 'insight',
    public readonly category?: string
  ) {
    super(label, collapsibleState);
  }
}

