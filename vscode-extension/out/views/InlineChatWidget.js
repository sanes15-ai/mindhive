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
exports.InlineChatWidget = void 0;
const vscode = __importStar(require("vscode"));
class InlineChatWidget {
    client;
    activeSession;
    statusBarItem;
    constructor(client) {
        this.client = client;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }
    async start() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        // Clean up any existing session
        this.dispose();
        const selection = editor.selection;
        const range = selection.isEmpty
            ? new vscode.Range(editor.selection.active.line, 0, editor.selection.active.line, editor.document.lineAt(editor.selection.active.line).text.length)
            : new vscode.Range(selection.start, selection.end);
        const originalText = editor.document.getText(range);
        // Create highlight decoration
        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editor.findMatchBorder'),
        });
        editor.setDecorations(decorationType, [range]);
        // Create input box
        const inputBox = vscode.window.createInputBox();
        inputBox.placeholder = 'What would you like to do? (e.g., "fix this", "add error handling")';
        inputBox.prompt = '🧠 MindHive Inline Chat - Press Enter to apply, Esc to cancel';
        inputBox.buttons = [
            {
                iconPath: new vscode.ThemeIcon('check'),
                tooltip: 'Apply (Enter)',
            },
            {
                iconPath: new vscode.ThemeIcon('discard'),
                tooltip: 'Cancel (Esc)',
            },
        ];
        this.activeSession = {
            editor,
            range,
            originalText,
            decorationType,
            inputBox,
        };
        // Handle input
        inputBox.onDidAccept(async () => {
            let instruction = inputBox.value;
            if (!instruction) {
                // Show quick picks for common actions if no custom input
                inputBox.hide();
                const quickPicks = [
                    '💡 Explain this code',
                    '🔧 Fix bugs',
                    '✨ Refactor for readability',
                    '📝 Add documentation',
                    '⚡ Optimize performance',
                    '🔒 Security check',
                    '✅ Generate tests',
                    '💬 Custom instruction...',
                ];
                const selected = await vscode.window.showQuickPick(quickPicks, {
                    placeHolder: 'Choose an action or enter custom instruction',
                    ignoreFocusOut: true,
                });
                if (!selected) {
                    this.dispose();
                    return;
                }
                if (selected.includes('Custom instruction')) {
                    inputBox.value = '';
                    inputBox.show();
                    return;
                }
                instruction = selected.replace(/^[^\s]+\s/, '');
            }
            inputBox.hide();
            await this.processInstruction(instruction);
        });
        inputBox.onDidTriggerButton((button) => {
            if (button.tooltip?.includes('Cancel')) {
                this.dispose();
            }
        });
        inputBox.onDidHide(() => {
            this.dispose();
        });
        inputBox.show();
        this.showStatus('Ready');
    }
    async processInstruction(instruction) {
        if (!this.activeSession)
            return;
        const { editor, range, originalText } = this.activeSession;
        this.showStatus('Generating...');
        try {
            // Parse instruction
            const action = this.parseInstruction(instruction);
            let result;
            switch (action.type) {
                case 'explain':
                    result = await this.explainCode(originalText, editor.document.languageId);
                    await this.showExplanation(result);
                    this.dispose();
                    return;
                case 'fix':
                    result = await this.fixCode(originalText, editor.document.languageId, action.context);
                    break;
                case 'refactor':
                    result = await this.refactorCode(originalText, editor.document.languageId, action.context);
                    break;
                case 'document':
                    result = await this.addDocumentation(originalText, editor.document.languageId);
                    break;
                case 'optimize':
                    result = await this.optimizeCode(originalText, editor.document.languageId);
                    break;
                case 'security':
                    const verification = await this.client.verifyCode(originalText, editor.document.languageId);
                    await this.showSecurityResults(verification);
                    this.dispose();
                    return;
                case 'test':
                    result = await this.generateTests(originalText, editor.document.languageId);
                    await this.showTestsPreview(result, editor.document.languageId);
                    this.dispose();
                    return;
                case 'custom':
                default:
                    result = await this.customEdit(originalText, editor.document.languageId, instruction);
                    break;
            }
            // Show diff preview
            await this.showDiffPreview(originalText, result, range);
        }
        catch (error) {
            vscode.window.showErrorMessage(`MindHive Error: ${error.message}`);
            this.dispose();
        }
    }
    parseInstruction(instruction) {
        const lower = instruction.toLowerCase();
        if (lower.includes('explain'))
            return { type: 'explain' };
        if (lower.includes('fix') || lower.includes('bug'))
            return { type: 'fix', context: instruction };
        if (lower.includes('refactor') || lower.includes('improve') || lower.includes('clean'))
            return { type: 'refactor', context: instruction };
        if (lower.includes('document') || lower.includes('comment') || lower.includes('doc'))
            return { type: 'document' };
        if (lower.includes('optimize') || lower.includes('performance') || lower.includes('speed'))
            return { type: 'optimize' };
        if (lower.includes('security') || lower.includes('safe') || lower.includes('vulnerability'))
            return { type: 'security' };
        if (lower.includes('test'))
            return { type: 'test' };
        return { type: 'custom', context: instruction };
    }
    async explainCode(code, language) {
        return await this.client.explainCode(code, language);
    }
    async fixCode(code, language, context) {
        const prompt = context
            ? `Fix this code: ${context}\n\n${code}`
            : `Fix any bugs or issues in this code:\n\n${code}`;
        const response = await this.client.generateCode({
            prompt,
            language,
            context: code,
        });
        return response.code || code;
    }
    async refactorCode(code, language, context) {
        const prompt = context
            ? `Refactor this code: ${context}\n\n${code}`
            : `Refactor this code for better readability and maintainability:\n\n${code}`;
        const response = await this.client.generateCode({
            prompt,
            language,
            context: code,
        });
        return response.code || code;
    }
    async addDocumentation(code, language) {
        const response = await this.client.generateCode({
            prompt: `Add comprehensive documentation (JSDoc/comments) to this code:\n\n${code}`,
            language,
            context: code,
        });
        return response.code || code;
    }
    async optimizeCode(code, language) {
        const response = await this.client.optimizeCode(code, language);
        return response.code || code;
    }
    async generateTests(code, language) {
        const response = await this.client.generateCode({
            prompt: `Generate comprehensive unit tests for this code:\n\n${code}`,
            language,
            context: code,
        });
        return response.code || '';
    }
    async customEdit(code, language, instruction) {
        const response = await this.client.generateCode({
            prompt: `${instruction}\n\nCode:\n${code}`,
            language,
            context: code,
        });
        return response.code || code;
    }
    async showDiffPreview(original, modified, range) {
        if (!this.activeSession)
            return;
        const { editor } = this.activeSession;
        // Create preview decoration with modified text
        const previewDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
            after: {
                contentText: ' ← MindHive suggestion (Tab to accept, Esc to reject)',
                color: new vscode.ThemeColor('editorCodeLens.foreground'),
            },
        });
        // Show quick pick for accept/reject
        const choice = await vscode.window.showQuickPick([
            { label: '✅ Accept', description: 'Apply the changes (Tab)', action: 'accept' },
            { label: '❌ Reject', description: 'Keep original code (Esc)', action: 'reject' },
            { label: '👁️ Show Diff', description: 'View side-by-side comparison', action: 'diff' },
            { label: '🔄 Regenerate', description: 'Try again', action: 'retry' },
        ], {
            placeHolder: 'Review MindHive suggestion',
        });
        if (!choice) {
            this.dispose();
            return;
        }
        switch (choice.action) {
            case 'accept':
                await editor.edit((editBuilder) => {
                    editBuilder.replace(range, modified);
                });
                vscode.window.showInformationMessage('✅ Changes applied');
                this.dispose();
                break;
            case 'reject':
                this.dispose();
                break;
            case 'diff':
                await this.showSideBySideDiff(original, modified, editor.document.languageId);
                this.dispose();
                break;
            case 'retry':
                this.dispose();
                await this.start();
                break;
        }
    }
    async showSideBySideDiff(original, modified, language) {
        // Create temporary documents for diff view
        const originalDoc = await vscode.workspace.openTextDocument({
            content: original,
            language,
        });
        const modifiedDoc = await vscode.workspace.openTextDocument({
            content: modified,
            language,
        });
        await vscode.commands.executeCommand('vscode.diff', originalDoc.uri, modifiedDoc.uri, 'Original ↔ MindHive Suggestion');
    }
    async showExplanation(explanation) {
        const doc = await vscode.workspace.openTextDocument({
            content: `# Code Explanation\n\n${explanation}`,
            language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true,
        });
    }
    async showSecurityResults(verification) {
        let content = `# Security Scan Results\n\n`;
        content += `**Status:** ${verification.isValid ? '✅ Passed' : '⚠️ Issues Found'}\n`;
        content += `**Confidence:** ${(verification.confidence * 100).toFixed(0)}%\n\n`;
        if (verification.warnings.length > 0) {
            content += `## Warnings\n`;
            verification.warnings.forEach((warning) => {
                content += `- ${warning}\n`;
            });
        }
        if (verification.suggestions.length > 0) {
            content += `\n## Suggestions\n`;
            verification.suggestions.forEach((suggestion) => {
                content += `- ${suggestion}\n`;
            });
        }
        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown',
        });
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true,
        });
    }
    async showTestsPreview(tests, language) {
        const doc = await vscode.workspace.openTextDocument({
            content: tests,
            language,
        });
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false,
        });
        vscode.window.showInformationMessage('✅ Tests generated! Review and save to your test file.', 'Save to...').then((choice) => {
            if (choice === 'Save to...') {
                vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(`test.${language}`),
                    filters: {
                        'Test Files': [language],
                    },
                }).then(async (uri) => {
                    if (uri) {
                        await vscode.workspace.fs.writeFile(uri, Buffer.from(tests, 'utf8'));
                        vscode.window.showInformationMessage(`Tests saved to ${uri.fsPath}`);
                    }
                });
            }
        });
    }
    showStatus(message) {
        this.statusBarItem.text = `🧠 MindHive: ${message}`;
        this.statusBarItem.show();
    }
    dispose() {
        if (this.activeSession) {
            this.activeSession.decorationType.dispose();
            this.activeSession.inputBox?.dispose();
            this.activeSession = undefined;
        }
        this.statusBarItem.hide();
    }
}
exports.InlineChatWidget = InlineChatWidget;
//# sourceMappingURL=InlineChatWidget.js.map