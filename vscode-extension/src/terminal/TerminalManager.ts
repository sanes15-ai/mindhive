import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';
import { CommandTranslator } from './CommandTranslator';

interface TerminalSession {
  terminal: vscode.Terminal;
  lastCommand: string;
  lastOutput: string;
  errorCount: number;
}

interface CommandHistory {
  command: string;
  timestamp: Date;
  success: boolean;
  output?: string;
}

export class TerminalManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private translator: CommandTranslator;
  private history: CommandHistory[] = [];
  private statusBarItem: vscode.StatusBarItem;

  constructor(private client: MindHiveClient) {
    this.translator = new CommandTranslator(client);
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'mindhive.openTerminalCommands';
    this.setupTerminalWatcher();
  }

  private setupTerminalWatcher() {
    // Listen for terminal close
    vscode.window.onDidCloseTerminal((terminal) => {
      for (const [id, session] of this.sessions.entries()) {
        if (session.terminal === terminal) {
          this.sessions.delete(id);
          break;
        }
      }
    });
  }

  public async executeNaturalLanguage(naturalLanguage: string) {
    this.showStatus('Translating command...');

    try {
      // Translate natural language to command
      const translation = await this.translator.translate(naturalLanguage);

      // Validate command
      const validation = this.translator.validateCommand(translation.command);

      // Show warnings if any
      if (validation.warnings.length > 0) {
        const warningMessage = validation.warnings.join('\n');
        vscode.window.showWarningMessage(warningMessage);
      }

      // Ask for confirmation if needed
      if (translation.requiresConfirmation || translation.isDangerous) {
        const confirmed = await this.confirmCommand(translation);
        if (!confirmed) {
          this.showStatus('Command cancelled');
          return;
        }
      }

      // Show alternatives if available
      if (translation.alternatives && translation.alternatives.length > 0) {
        const useAlternative = await this.offerAlternatives(translation);
        if (useAlternative) {
          return;
        }
      }

      // Execute command
      await this.executeCommand(translation.command, translation.explanation);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to execute command: ${error.message}`);
      this.showStatus('Error');
    }
  }

  private async confirmCommand(translation: any): Promise<boolean> {
    const choice = await vscode.window.showWarningMessage(
      `Execute this command?\n\n${translation.command}\n\n${translation.explanation}`,
      { modal: true },
      'Execute',
      'Show Details',
      'Cancel'
    );

    if (choice === 'Show Details') {
      // Show detailed explanation
      const explanation = `**Command:** \`${translation.command}\`\n\n**What it does:**\n${translation.explanation}\n\n**Dangerous:** ${translation.isDangerous ? 'Yes ⚠️' : 'No'}\n\n**OS:** ${process.platform}`;

      const doc = await vscode.workspace.openTextDocument({
        content: explanation,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });

      // Ask again
      return await this.confirmCommand(translation);
    }

    return choice === 'Execute';
  }

  private async offerAlternatives(translation: any): Promise<boolean> {
    const items = [
      {
        label: `$(terminal) ${translation.command}`,
        description: 'Use suggested command',
        command: translation.command,
      },
      ...translation.alternatives.map((alt: string) => ({
        label: `$(terminal) ${alt}`,
        description: 'Alternative',
        command: alt,
      })),
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Choose which command to execute',
    });

    if (!selected) {
      return false;
    }

    if (selected.command !== translation.command) {
      await this.executeCommand(selected.command, translation.explanation);
      return true;
    }

    return false;
  }

  public async executeCommand(command: string, explanation?: string) {
    this.showStatus('Executing...');

    // Get or create terminal
    const terminal = this.getOrCreateTerminal();

    // Show terminal
    terminal.show(false);

    // Send command
    terminal.sendText(command);

    // Add to history
    this.history.push({
      command,
      timestamp: new Date(),
      success: true, // We'll update this if we detect errors
    });

    // Show notification
    if (explanation) {
      vscode.window.setStatusBarMessage(`🧠 ${explanation}`, 5000);
    }

    this.showStatus('Command executed');

    // Update session
    const sessionId = this.getTerminalSessionId(terminal);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastCommand = command;
      }
    }
  }

  public async explainCommand(command: string) {
    try {
      const explanation = await this.client.explainCode(command, 'bash');

      const doc = await vscode.workspace.openTextDocument({
        content: `# Command Explanation\n\n\`\`\`bash\n${command}\n\`\`\`\n\n${explanation}`,
        language: 'markdown',
      });

      await vscode.window.showTextDocument(doc, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to explain command: ${error.message}`);
    }
  }

  public async suggestFix(errorMessage: string) {
    this.showStatus('Analyzing error...');

    try {
      const lastCommand = this.history[this.history.length - 1]?.command;
      if (!lastCommand) {
        vscode.window.showErrorMessage('No recent command to fix');
        return;
      }

      const response = await this.client.generateCode({
        prompt: `This command failed:\n\`\`\`\n${lastCommand}\n\`\`\`\n\nError message:\n\`\`\`\n${errorMessage}\n\`\`\`\n\nSuggest a fix:`,
        language: 'bash',
        context: `OS: ${process.platform}`,
      });

      const fixedCommand = response.code?.trim() || '';
      const fixExplanation = response.explanation || 'Fixed command';

      const choice = await vscode.window.showInformationMessage(
        `Suggested fix:\n\n${fixedCommand}\n\n${fixExplanation}`,
        'Execute Fix',
        'Explain',
        'Cancel'
      );

      if (choice === 'Execute Fix') {
        await this.executeCommand(fixedCommand, fixExplanation);
      } else if (choice === 'Explain') {
        await this.explainCommand(fixedCommand);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to suggest fix: ${error.message}`);
    } finally {
      this.showStatus('Ready');
    }
  }

  public async showCommandHistory() {
    if (this.history.length === 0) {
      vscode.window.showInformationMessage('No command history yet');
      return;
    }

    const items = this.history
      .slice()
      .reverse()
      .map((entry) => ({
        label: entry.command,
        description: entry.success ? '✅' : '❌',
        detail: entry.timestamp.toLocaleString(),
        command: entry.command,
      }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Command History - Select to execute again',
    });

    if (selected) {
      await this.executeCommand(selected.command);
    }
  }

  public async buildCommandSequence() {
    const sequence: string[] = [];

    while (true) {
      const naturalLanguage = await vscode.window.showInputBox({
        prompt: `Command ${sequence.length + 1} (leave empty to finish)`,
        placeHolder: 'e.g., "install dependencies"',
      });

      if (!naturalLanguage) {
        break;
      }

      const translation = await this.translator.translate(naturalLanguage);
      sequence.push(translation.command);

      vscode.window.showInformationMessage(`Added: ${translation.command}`);
    }

    if (sequence.length === 0) {
      return;
    }

    // Show sequence
    const combined = sequence.join(' && ');
    const choice = await vscode.window.showInformationMessage(
      `Execute sequence?\n\n${combined}`,
      { modal: true },
      'Execute',
      'Cancel'
    );

    if (choice === 'Execute') {
      await this.executeCommand(combined, `Running ${sequence.length} commands`);
    }
  }

  private getOrCreateTerminal(): vscode.Terminal {
    // Try to find existing MindHive terminal
    const existing = vscode.window.terminals.find((t) => t.name === '🧠 MindHive');

    if (existing) {
      return existing;
    }

    // Create new terminal
    const terminal = vscode.window.createTerminal({
      name: '🧠 MindHive',
      iconPath: new vscode.ThemeIcon('terminal'),
    });

    // Add to sessions
    const sessionId = this.getTerminalSessionId(terminal);
    if (sessionId) {
      this.sessions.set(sessionId, {
        terminal,
        lastCommand: '',
        lastOutput: '',
        errorCount: 0,
      });
    }

    return terminal;
  }

  private getTerminalSessionId(terminal: vscode.Terminal): string | undefined {
    return (terminal as any).processId?.toString();
  }

  private showStatus(message: string) {
    this.statusBarItem.text = `$(terminal) ${message}`;
    this.statusBarItem.show();

    if (message === 'Ready' || message === 'Command executed') {
      setTimeout(() => {
        this.statusBarItem.hide();
      }, 3000);
    }
  }

  public getHistory(): CommandHistory[] {
    return this.history;
  }

  public clearHistory() {
    this.history = [];
    vscode.window.showInformationMessage('Command history cleared');
  }

  public dispose() {
    this.statusBarItem.dispose();
    this.sessions.clear();
    this.history = [];
  }
}
