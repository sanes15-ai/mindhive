import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';
import { AuthManager } from '../auth/AuthManager';
import { HUDManager } from '../hud/HUDManager';
import { AgentStatusBar } from '../views/AgentStatusBar';
import { PredictiveAssistant } from '../assistant/PredictiveAssistant';
import { TimeTravelDebugPanel } from '../views/TimeTravelDebugPanel';

export class CommandHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private client: MindHiveClient,
    private authManager: AuthManager,
    private hudManager: HUDManager,
    private agentStatusBar: AgentStatusBar,
    private predictiveAssistant: PredictiveAssistant
  ) {}

  // 🕰️ Time-Travel Debugging Command
  public async timeTravelDebug(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    // Get error from user input or diagnostics
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    let errorMessage = '';
    let errorStack = '';

    if (diagnostics.length > 0) {
      // Use first error from diagnostics
      const firstError = diagnostics.find(d => d.severity === vscode.DiagnosticSeverity.Error);
      if (firstError) {
        errorMessage = firstError.message;
        errorStack = `at ${editor.document.fileName}:${firstError.range.start.line + 1}:${firstError.range.start.character + 1}`;
      }
    }

    // If no diagnostics, ask user to describe the error
    if (!errorMessage) {
      const input = await vscode.window.showInputBox({
        prompt: '🕰️ Describe the error or paste error message',
        placeHolder: 'e.g., TypeError: Cannot read property "name" of undefined',
        ignoreFocusOut: true
      });

      if (!input) {
        return;
      }

      errorMessage = input;
    }

    // Create or show panel
    TimeTravelDebugPanel.createOrShow(this.context.extensionUri, this.client);

    // Create error object
    const error = new Error(errorMessage);
    error.stack = errorStack || `at ${editor.document.fileName}:${editor.selection.active.line + 1}`;

    // Get code context
    const code = editor.document.getText();
    const language = editor.document.languageId;

    // Analyze error
    await TimeTravelDebugPanel.currentPanel?.analyzeError(error, code, language);
  }

  public async askMindHive(): Promise<void> {
    const question = await vscode.window.showInputBox({
      prompt: '🧠 Ask MindHive anything...',
      placeHolder: 'e.g., How do I implement JWT authentication?',
    });

    if (!question) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Asking MindHive...',
        cancellable: false,
      },
      async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          const context = editor ? editor.document.getText() : undefined;

          const result = await this.client.generateCode({
            prompt: question,
            language: editor?.document.languageId,
            context,
          });

          // Show result in new document
          const doc = await vscode.workspace.openTextDocument({
            content: result.code || result.answer,
            language: editor?.document.languageId || 'markdown',
          });

          await vscode.window.showTextDocument(doc);

          // Show verification info
          if (result.verification) {
            const confidence = Math.round(result.verification.confidence * 100);
            vscode.window.showInformationMessage(
              `✅ Nexus Verified (${confidence}% confidence)`
            );
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed: ${error.message}`);
        }
      }
    );
  }

  public async generateCode(): Promise<void> {
    const prompt = await vscode.window.showInputBox({
      prompt: '💡 Describe the feature you want to build',
      placeHolder: 'e.g., Create a REST API endpoint for user registration',
    });

    if (!prompt) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating code...',
        cancellable: false,
      },
      async () => {
        try {
          const result = await this.client.generateCode({
            prompt,
            language: editor.document.languageId,
            context: editor.document.getText(),
          });

          // Insert at cursor
          await editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, result.code);
          });

          vscode.window.showInformationMessage(
            `✅ Generated with ${result.confidence}% confidence`
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(`Failed: ${error.message}`);
        }
      }
    );
  }

  public async verifyCode(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const code = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Verifying with Nexus...',
        cancellable: false,
      },
      async () => {
        try {
          const result = await this.client.verifyCode(
            code,
            editor.document.languageId
          );

          const confidence = Math.round(result.confidence * 100);

          if (result.isValid) {
            vscode.window.showInformationMessage(
              `✅ Code verified (${confidence}% confidence)`
            );
          } else {
            const warnings = result.warnings.join('\n');
            vscode.window.showWarningMessage(
              `⚠️ Issues found (${confidence}% confidence):\n${warnings}`
            );
          }

          // Show detailed results
          this.showVerificationResults(result);
        } catch (error: any) {
          vscode.window.showErrorMessage(`Verification failed: ${error.message}`);
        }
      }
    );
  }

  public async optimizeCode(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('Please select code to optimize');
      return;
    }

    const code = editor.document.getText(selection);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Optimizing code...',
        cancellable: false,
      },
      async () => {
        try {
          const result = await this.client.optimizeCode(
            code,
            editor.document.languageId
          );

          // Show diff
          const original = await vscode.workspace.openTextDocument({
            content: code,
            language: editor.document.languageId,
          });

          const optimized = await vscode.workspace.openTextDocument({
            content: result.optimizedCode,
            language: editor.document.languageId,
          });

          await vscode.commands.executeCommand(
            'vscode.diff',
            original.uri,
            optimized.uri,
            'Original ↔ Optimized'
          );

          // Show improvement metrics
          if (result.improvements) {
            vscode.window.showInformationMessage(
              `🚀 ${result.improvements.join(', ')}`
            );
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`Optimization failed: ${error.message}`);
        }
      }
    );
  }

  public async fixBug(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const code = selection.isEmpty
      ? editor.document.getText()
      : editor.document.getText(selection);

    // Get error message if available
    const error = await vscode.window.showInputBox({
      prompt: 'Describe the bug or paste error message (optional)',
      placeHolder: 'e.g., TypeError: Cannot read property...',
    });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing and fixing...',
        cancellable: false,
      },
      async () => {
        try {
          const result = await this.client.fixBug(
            code,
            editor.document.languageId,
            error
          );

          // Apply fix
          if (result.fixedCode) {
            const apply = await vscode.window.showInformationMessage(
              `🔧 Fix found with ${result.confidence}% confidence. Apply?`,
              'Apply',
              'Show Diff',
              'Cancel'
            );

            if (apply === 'Apply') {
              await editor.edit((editBuilder) => {
                if (selection.isEmpty) {
                  const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(editor.document.getText().length)
                  );
                  editBuilder.replace(fullRange, result.fixedCode);
                } else {
                  editBuilder.replace(selection, result.fixedCode);
                }
              });

              vscode.window.showInformationMessage('✅ Fix applied');
            } else if (apply === 'Show Diff') {
              const original = await vscode.workspace.openTextDocument({
                content: code,
                language: editor.document.languageId,
              });

              const fixed = await vscode.workspace.openTextDocument({
                content: result.fixedCode,
                language: editor.document.languageId,
              });

              await vscode.commands.executeCommand(
                'vscode.diff',
                original.uri,
                fixed.uri,
                'Before ↔ After Fix'
              );
            }
          }

          // Show explanation
          if (result.explanation) {
            vscode.window.showInformationMessage(result.explanation);
          }
        } catch (error: any) {
          vscode.window.showErrorMessage(`Bug fix failed: ${error.message}`);
        }
      }
    );
  }

  public async showInsights(): Promise<void> {
    await vscode.commands.executeCommand('workbench.view.extension.MindHive');
  }

  public async toggleHUD(): Promise<void> {
    this.hudManager.toggle();
  }

  public async showAgentPanel(): Promise<void> {
    await this.agentStatusBar.showAgentDetails();
  }

  public async showAgentDetails(): Promise<void> {
    await this.agentStatusBar.showAgentDetails();
  }

  public async toggleAgentStatus(): Promise<void> {
    this.agentStatusBar.toggle();
  }

  public async login(): Promise<void> {
    const success = await this.authManager.login();
    if (success) {
      await this.client.connect();
      await this.predictiveAssistant.start();
      vscode.window.showInformationMessage('🧠 Connected to MindHive');
    }
  }

  public async logout(): Promise<void> {
    await this.authManager.logout();
    this.client.disconnect();
    this.predictiveAssistant.stop();
    vscode.window.showInformationMessage('Disconnected from MindHive');
  }

  public async openSettings(): Promise<void> {
    await vscode.commands.executeCommand(
      'workbench.action.openSettings',
      'MindHive'
    );
  }

  public async applyFix(fix: any): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    await editor.edit((editBuilder) => {
      const range = new vscode.Range(
        editor.document.positionAt(fix.startOffset),
        editor.document.positionAt(fix.endOffset)
      );
      editBuilder.replace(range, fix.fixedCode);
    });

    vscode.window.showInformationMessage('✅ Fix applied');
  }

  public async dismissAlert(alert: any): Promise<void> {
    // Dismiss alert (implementation depends on alert storage)
    vscode.window.showInformationMessage('Alert dismissed');
  }

  private showVerificationResults(result: any): void {
    const panel = vscode.window.createWebviewPanel(
      'MindHiveVerification',
      'Nexus Verification Results',
      vscode.ViewColumn.Beside,
      {}
    );

    panel.webview.html = this.getVerificationHtml(result);
  }

  private getVerificationHtml(result: any): string {
    const confidence = Math.round(result.confidence * 100);
    const statusColor = result.isValid ? '#4caf50' : '#ff9800';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              padding: 20px;
              background: #1e1e1e;
              color: #d4d4d4;
            }
            .header {
              display: flex;
              align-items: center;
              margin-bottom: 20px;
            }
            .status {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: ${statusColor};
              margin-right: 10px;
            }
            .confidence {
              font-size: 24px;
              font-weight: bold;
              color: ${statusColor};
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 10px;
              color: #569cd6;
            }
            .warning {
              background: #ff98001a;
              padding: 10px;
              border-left: 3px solid #ff9800;
              margin-bottom: 10px;
            }
            .suggestion {
              background: #4caf501a;
              padding: 10px;
              border-left: 3px solid #4caf50;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="status"></div>
            <h2>Verification Results</h2>
          </div>
          <div class="confidence">${confidence}% Confidence</div>
          
          ${result.warnings.length > 0 ? `
            <div class="section">
              <div class="section-title">⚠️ Warnings</div>
              ${result.warnings.map((w: string) => `<div class="warning">${w}</div>`).join('')}
            </div>
          ` : ''}
          
          ${result.suggestions.length > 0 ? `
            <div class="section">
              <div class="section-title">💡 Suggestions</div>
              ${result.suggestions.map((s: string) => `<div class="suggestion">${s}</div>`).join('')}
            </div>
          ` : ''}
          
          ${result.metadata ? `
            <div class="section">
              <div class="section-title">📊 Metadata</div>
              <pre>${JSON.stringify(result.metadata, null, 2)}</pre>
            </div>
          ` : ''}
        </body>
      </html>
    `;
  }

  // ====================================================================
  // CODE ACTION COMMANDS
  // ====================================================================

  public async applyCodeFix(
    document: vscode.TextDocument,
    range: vscode.Range,
    fix: string,
    description: string
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, fix);
    
    const success = await vscode.workspace.applyEdit(edit);
    
    if (success) {
      vscode.window.showInformationMessage(`✅ Applied: ${description}`);
    } else {
      vscode.window.showErrorMessage('Failed to apply fix');
    }
  }

  public async generateFix(
    document: vscode.TextDocument,
    range: vscode.Range,
    issue: any
  ): Promise<void> {
    const code = document.getText(range);
    
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating fix...',
          cancellable: false,
        },
        async () => {
          const result = await this.client.post('/api/v1/code/generate-fix', {
            code,
            language: document.languageId,
            issue: issue.message,
            type: issue.type,
          });

          if (result.fixedCode) {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, range, result.fixedCode);
            await vscode.workspace.applyEdit(edit);
            vscode.window.showInformationMessage(`✅ Fix applied with ${result.confidence}% confidence`);
          }
        }
      );
    } catch (error: any) {
      vscode.window.showErrorMessage(`Fix generation failed: ${error.message}`);
    }
  }

  public async applyPattern(
    document: vscode.TextDocument,
    range: vscode.Range,
    pattern: any
  ): Promise<void> {
    const code = document.getText(range);
    
    try {
      const result = await this.client.post('/api/v1/intelligence/apply-pattern', {
        code,
        language: document.languageId,
        patternId: pattern.id || pattern.name,
      });

      if (result.transformedCode) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, result.transformedCode);
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Applied pattern: ${pattern.name}`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Pattern application failed: ${error.message}`);
    }
  }

  public async simplifyCode(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<void> {
    const code = document.getText(range);
    
    try {
      const result = await this.client.post('/api/v1/code/simplify', {
        code,
        language: document.languageId,
      });

      if (result.simplifiedCode) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, result.simplifiedCode);
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(
          `✅ Complexity reduced from ${result.originalComplexity} to ${result.newComplexity}`
        );
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Simplification failed: ${error.message}`);
    }
  }

  public async extractFunction(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<void> {
    const code = document.getText(range);
    
    const functionName = await vscode.window.showInputBox({
      prompt: 'Enter function name',
      placeHolder: 'e.g., handleUserInput',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Function name is required';
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
          return 'Invalid function name';
        }
        return null;
      },
    });

    if (!functionName) {
      return;
    }

    try {
      const result = await this.client.post('/api/v1/code/extract-function', {
        code,
        language: document.languageId,
        functionName,
        context: document.getText(),
      });

      if (result.extractedFunction && result.callSite) {
        const edit = new vscode.WorkspaceEdit();
        
        // Replace selected code with function call
        edit.replace(document.uri, range, result.callSite);
        
        // Insert function definition above
        const insertPosition = new vscode.Position(range.start.line, 0);
        edit.insert(document.uri, insertPosition, result.extractedFunction + '\n\n');
        
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`✅ Extracted to function: ${functionName}`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Extraction failed: ${error.message}`);
    }
  }

  public async improveMaintainability(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<void> {
    const code = document.getText(range);
    
    try {
      const result = await this.client.post('/api/v1/code/improve-maintainability', {
        code,
        language: document.languageId,
      });

      if (result.improvedCode) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, result.improvedCode);
        await vscode.workspace.applyEdit(edit);
        
        const improvements = result.improvements?.join(', ') || 'various improvements';
        vscode.window.showInformationMessage(`✅ Applied: ${improvements}`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Improvement failed: ${error.message}`);
    }
  }

  public async addDocumentation(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<void> {
    const code = document.getText(range);
    
    try {
      const result = await this.client.post('/api/v1/code/generate-docs', {
        code,
        language: document.languageId,
        style: 'jsdoc', // or 'python-docstring', etc.
      });

      if (result.documentation) {
        const edit = new vscode.WorkspaceEdit();
        const insertPosition = new vscode.Position(range.start.line, 0);
        const indent = document.lineAt(range.start.line).firstNonWhitespaceCharacterIndex;
        const indentedDocs = result.documentation
          .split('\n')
          .map((line: string) => ' '.repeat(indent) + line)
          .join('\n') + '\n';
        
        edit.insert(document.uri, insertPosition, indentedDocs);
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage('✅ Documentation added');
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Documentation generation failed: ${error.message}`);
    }
  }

  public async generateTests(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<void> {
    const code = document.getText(range);
    
    try {
      const result = await this.client.post('/api/v1/code/generate-tests', {
        code,
        language: document.languageId,
        framework: 'auto', // Auto-detect test framework
      });

      if (result.tests) {
        // Create new test file
        const testFileName = document.fileName.replace(/\.(ts|js|py)$/, '.test$1');
        const testUri = vscode.Uri.file(testFileName);
        
        const edit = new vscode.WorkspaceEdit();
        edit.createFile(testUri, { ignoreIfExists: true });
        edit.insert(testUri, new vscode.Position(0, 0), result.tests);
        
        await vscode.workspace.applyEdit(edit);
        
        // Open test file
        const testDoc = await vscode.workspace.openTextDocument(testUri);
        await vscode.window.showTextDocument(testDoc);
        
        vscode.window.showInformationMessage(`✅ Generated ${result.testCount} test(s)`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Test generation failed: ${error.message}`);
    }
  }

  public async explainCode(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<void> {
    const code = document.getText(range);
    
    try {
      const explanation = await this.client.explainCode(code, document.languageId);
      
      // Show in markdown preview
      const panel = vscode.window.createWebviewPanel(
        'codeExplanation',
        'Code Explanation',
        vscode.ViewColumn.Beside,
        { enableScripts: false }
      );

      panel.webview.html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                padding: 20px;
                line-height: 1.6;
                color: var(--vscode-foreground);
                background: var(--vscode-editor-background);
              }
              h1 { color: var(--vscode-textLink-foreground); }
              code {
                background: var(--vscode-textCodeBlock-background);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
              }
              pre {
                background: var(--vscode-textCodeBlock-background);
                padding: 12px;
                border-radius: 6px;
                overflow-x: auto;
              }
            </style>
          </head>
          <body>
            <h1>💡 Code Explanation</h1>
            <div>${explanation.replace(/\n/g, '<br>')}</div>
            <hr>
            <h2>Original Code</h2>
            <pre><code>${this.escapeHtml(code)}</code></pre>
          </body>
        </html>
      `;
    } catch (error: any) {
      vscode.window.showErrorMessage(`Explanation failed: ${error.message}`);
    }
  }

  public async fixAllErrors(
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): Promise<void> {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Fixing ${diagnostics.length} error(s)...`,
          cancellable: false,
        },
        async () => {
          const errors = diagnostics.map(d => ({
            message: d.message,
            line: d.range.start.line,
            code: document.getText(d.range),
          }));

          const result = await this.client.post('/api/v1/code/fix-multiple', {
            code: document.getText(),
            language: document.languageId,
            errors,
          });

          if (result.fixedCode) {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
              document.lineAt(0).range.start,
              document.lineAt(document.lineCount - 1).range.end
            );
            edit.replace(document.uri, fullRange, result.fixedCode);
            await vscode.workspace.applyEdit(edit);
            
            vscode.window.showInformationMessage(
              `✅ Fixed ${result.fixedCount} error(s) with ${result.confidence}% confidence`
            );
          }
        }
      );
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error fixing failed: ${error.message}`);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

