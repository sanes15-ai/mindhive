import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';
import { AuthManager } from '../auth/AuthManager';

interface PredictionContext {
  file: string;
  position: vscode.Position;
  recentChanges: string[];
  timestamp: number;
}

export class PredictiveAssistant {
  private context: PredictionContext | null = null;
  private isRunning: boolean = false;
  private changeBuffer: string[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(
    private extensionContext: vscode.ExtensionContext,
    private client: MindHiveClient,
    private authManager: AuthManager
  ) {}

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const config = vscode.workspace.getConfiguration('MindHive');
    if (!config.get('predictiveMode')) {
      return;
    }

    this.isRunning = true;

    // Listen for document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      this.onDocumentChange(event);
    });

    // Listen for cursor position changes
    vscode.window.onDidChangeTextEditorSelection((event) => {
      this.onSelectionChange(event);
    });

    console.log('🔮 Predictive Assistant started');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    console.log('🔮 Predictive Assistant stopped');
  }

  private onDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (!this.isRunning) {
      return;
    }

    // Buffer changes
    event.contentChanges.forEach((change) => {
      if (change.text) {
        this.changeBuffer.push(change.text);
      }
    });

    // Debounce predictions (wait for user to stop typing)
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.makePrediction();
    }, 1000); // 1 second delay
  }

  private onSelectionChange(
    event: vscode.TextEditorSelectionChangeEvent
  ): void {
    if (!this.isRunning) {
      return;
    }

    const editor = event.textEditor;
    this.context = {
      file: editor.document.fileName,
      position: editor.selection.active,
      recentChanges: [...this.changeBuffer],
      timestamp: Date.now(),
    };
  }

  private async makePrediction(): Promise<void> {
    if (!this.context || this.changeBuffer.length === 0) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    try {
      // Analyze recent changes to predict next action
      const prediction = await this.analyzePrediction(
        editor,
        this.changeBuffer.join('')
      );

      if (prediction && prediction.confidence > 0.7) {
        this.showPrediction(prediction);
      }

      // Clear buffer
      this.changeBuffer = [];
    } catch (error) {
      // Silent fail - don't disrupt user
      console.error('Prediction failed:', error);
    }
  }

  private async analyzePrediction(
    editor: vscode.TextEditor,
    recentText: string
  ): Promise<any> {
    // Use AI to predict what user will need next
    const context = editor.document.getText();
    const language = editor.document.languageId;

    // Simple heuristics + AI prediction
    const predictions: any[] = [];

    // Heuristic 1: If user just wrote a function, suggest tests
    if (this.containsFunctionDeclaration(recentText)) {
      predictions.push({
        type: 'test',
        message: 'Generate tests for this function?',
        confidence: 0.8,
        action: 'generateTests',
      });
    }

    // Heuristic 2: If user imported a package, suggest usage examples
    if (this.containsImportStatement(recentText)) {
      const packageName = this.extractPackageName(recentText);
      if (packageName) {
        predictions.push({
          type: 'example',
          message: `Show ${packageName} usage examples?`,
          confidence: 0.75,
          action: 'showExamples',
          data: { packageName },
        });
      }
    }

    // Heuristic 3: If user wrote error-prone code, suggest verification
    if (this.containsPotentialBug(recentText)) {
      predictions.push({
        type: 'verify',
        message: 'Verify this code with Nexus?',
        confidence: 0.85,
        action: 'verifyCode',
      });
    }

    // Return highest confidence prediction
    return predictions.sort((a, b) => b.confidence - a.confidence)[0];
  }

  private showPrediction(prediction: any): void {
    vscode.window
      .showInformationMessage(
        `🔮 ${prediction.message}`,
        'Yes',
        'Not Now',
        'Disable'
      )
      .then((choice) => {
        if (choice === 'Yes') {
          this.executePredictionAction(prediction);
        } else if (choice === 'Disable') {
          const config = vscode.workspace.getConfiguration('MindHive');
          config.update('predictiveMode', false, true);
          this.stop();
        }
      });
  }

  private async executePredictionAction(prediction: any): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    switch (prediction.action) {
      case 'generateTests':
        await vscode.commands.executeCommand('MindHive.generateCode');
        break;

      case 'showExamples':
        const patterns = await this.client.searchPatterns(
          prediction.data.packageName
        );
        this.showPatternsQuickPick(patterns);
        break;

      case 'verifyCode':
        await vscode.commands.executeCommand('MindHive.verifyCode');
        break;

      default:
        break;
    }
  }

  private async showPatternsQuickPick(
    patterns: any[]
  ): Promise<void> {
    if (patterns.length === 0) {
      vscode.window.showInformationMessage('No examples found');
      return;
    }

    const items = patterns.map((pattern) => ({
      label: pattern.title,
      description: `${pattern.usageCount.toLocaleString()} uses | ${Math.round(
        pattern.successRate * 100
      )}% success`,
      detail: pattern.description,
      pattern,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an example to insert',
    });

    if (selected) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, selected.pattern.code);
        });
      }
    }
  }

  private containsFunctionDeclaration(text: string): boolean {
    return /function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>/.test(text);
  }

  private containsImportStatement(text: string): boolean {
    return /^import\s+|^from\s+/.test(text.trim());
  }

  private extractPackageName(text: string): string | null {
    const match = text.match(/from\s+['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  private containsPotentialBug(text: string): boolean {
    // Simple checks for common bugs
    const bugPatterns = [
      /==\s*null(?!\?)/,  // null comparison without ??
      /console\.log/,      // console.log in production
      /eval\(/,            // eval usage
      /innerHTML\s*=/,     // innerHTML (XSS risk)
    ];

    return bugPatterns.some((pattern) => pattern.test(text));
  }
}

