"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalManager = void 0;
const vscode = __importStar(require("vscode"));
const CommandTranslator_1 = require("./CommandTranslator");
class TerminalManager {
    client;
    sessions = new Map();
    translator;
    history = [];
    statusBarItem;
    constructor(client) {
        this.client = client;
        this.translator = new CommandTranslator_1.CommandTranslator(client);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'mindhive.openTerminalCommands';
        this.setupTerminalWatcher();
    }
    setupTerminalWatcher() {
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
    async executeNaturalLanguage(naturalLanguage) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to execute command: ${error.message}`);
            this.showStatus('Error');
        }
    }
    async confirmCommand(translation) {
        const choice = await vscode.window.showWarningMessage(`Execute this command?\n\n${translation.command}\n\n${translation.explanation}`, { modal: true }, 'Execute', 'Show Details', 'Cancel');
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
    async offerAlternatives(translation) {
        const items = [
            {
                label: `$(terminal) ${translation.command}`,
                description: 'Use suggested command',
                command: translation.command,
            },
            ...translation.alternatives.map((alt) => ({
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
    async executeCommand(command, explanation) {
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
    async explainCommand(command) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to explain command: ${error.message}`);
        }
    }
    async suggestFix(errorMessage) {
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
            const choice = await vscode.window.showInformationMessage(`Suggested fix:\n\n${fixedCommand}\n\n${fixExplanation}`, 'Execute Fix', 'Explain', 'Cancel');
            if (choice === 'Execute Fix') {
                await this.executeCommand(fixedCommand, fixExplanation);
            }
            else if (choice === 'Explain') {
                await this.explainCommand(fixedCommand);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to suggest fix: ${error.message}`);
        }
        finally {
            this.showStatus('Ready');
        }
    }
    async showCommandHistory() {
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
    async buildCommandSequence() {
        const sequence = [];
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
        const choice = await vscode.window.showInformationMessage(`Execute sequence?\n\n${combined}`, { modal: true }, 'Execute', 'Cancel');
        if (choice === 'Execute') {
            await this.executeCommand(combined, `Running ${sequence.length} commands`);
        }
    }
    getOrCreateTerminal() {
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
    getTerminalSessionId(terminal) {
        return terminal.processId?.toString();
    }
    showStatus(message) {
        this.statusBarItem.text = `$(terminal) ${message}`;
        this.statusBarItem.show();
        if (message === 'Ready' || message === 'Command executed') {
            setTimeout(() => {
                this.statusBarItem.hide();
            }, 3000);
        }
    }
    getHistory() {
        return this.history;
    }
    clearHistory() {
        this.history = [];
        vscode.window.showInformationMessage('Command history cleared');
    }
    dispose() {
        this.statusBarItem.dispose();
        this.sessions.clear();
        this.history = [];
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=TerminalManager.js.map