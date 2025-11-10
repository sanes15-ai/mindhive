import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';

export class HoverProvider implements vscode.HoverProvider {
  constructor(private client: MindHiveClient) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
      return null;
    }

    const word = document.getText(range);
    
    // Get line context
    const line = document.lineAt(position.line).text;

    try {
      // Check if this is a package/import
      if (this.isImportLine(line)) {
        const packageName = this.extractPackageName(line);
        if (packageName) {
          const insights = await this.client.getCollectiveInsights();
          const packageInsight = insights.find(i => i.content.includes(packageName));
          
          if (packageInsight) {
            return new vscode.Hover(
              new vscode.MarkdownString(`**MindHive Insight**\n\n${packageInsight.content}`)
            );
          }
        }
      }

      // Get explanation for the symbol
      const explanation = await this.client.explainCode(word, document.languageId);
      
      if (explanation) {
        return new vscode.Hover(
          new vscode.MarkdownString(`**MindHive**\n\n${explanation}`)
        );
      }
    } catch (error) {
      // Silent fail
    }

    return null;
  }

  private isImportLine(line: string): boolean {
    return /^import\s+|^from\s+/.test(line.trim());
  }

  private extractPackageName(line: string): string | null {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }
}

