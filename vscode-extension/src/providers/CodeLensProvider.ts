import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';

export class CodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(private client: MindHiveClient) {}

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Add CodeLens for function declarations
      if (this.isFunctionDeclaration(line)) {
        const range = new vscode.Range(i, 0, i, line.length);
        
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(lightbulb) Ask MindHive',
            command: 'MindHive.ask',
            arguments: []
          })
        );

        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '$(verified) Verify',
            command: 'MindHive.verifyCode',
            arguments: []
          })
        );
      }
    }

    return codeLenses;
  }

  private isFunctionDeclaration(line: string): boolean {
    return /function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>/.test(line);
  }

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}

