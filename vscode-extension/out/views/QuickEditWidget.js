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
exports.QuickEditWidget = void 0;
const vscode = __importStar(require("vscode"));
class QuickEditWidget {
    client;
    activeSession;
    statusBarItem;
    undoStack = [];
    commonSuggestions = [
        {
            label: '🛡️ Add error handling',
            description: 'Wrap in try-catch, add validation',
            instruction: 'Add comprehensive error handling with try-catch blocks and input validation',
        },
        {
            label: '📝 Add TypeScript types',
            description: 'Add type annotations',
            instruction: 'Add proper TypeScript type annotations to all variables, parameters, and return types',
        },
        {
            label: '✅ Add unit tests',
            description: 'Generate test cases',
            instruction: 'Generate comprehensive unit tests for this code',
        },
        {
            label: '📖 Add JSDoc comments',
            description: 'Document functions and classes',
            instruction: 'Add detailed JSDoc comments to all functions, classes, and complex logic',
        },
        {
            label: '⚡ Optimize performance',
            description: 'Improve speed and efficiency',
            instruction: 'Optimize this code for better performance and efficiency',
        },
        {
            label: '♻️ Refactor for readability',
            description: 'Clean up and simplify',
            instruction: 'Refactor this code for better readability and maintainability',
        },
        {
            label: '🔒 Add security checks',
            description: 'Validate input, prevent injection',
            instruction: 'Add security validation to prevent common vulnerabilities like injection attacks',
        },
        {
            label: '🎨 Apply best practices',
            description: 'Follow framework conventions',
            instruction: 'Refactor to follow best practices and framework conventions',
        },
        {
            label: '🔧 Fix bugs',
            description: 'Identify and fix issues',
            instruction: 'Identify and fix any bugs or potential issues in this code',
        },
        {
            label: '💬 Custom instruction...',
            description: 'Type your own request',
            instruction: '',
        },
    ];
    constructor(client) {
        this.client = client;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'mindhive.cancelQuickEdit';
    }
    async start() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        // Clean up any existing session
        this.dispose();
        // Get all selections (supports multi-cursor)
        const selections = editor.selections.filter(sel => !sel.isEmpty);
        // If no selections, select current line or ask user to select
        if (selections.length === 0) {
            const position = editor.selection.active;
            const line = editor.document.lineAt(position.line);
            // Check if line is empty
            if (line.text.trim().length === 0) {
                const choice = await vscode.window.showQuickPick([
                    { label: '📝 Select code first', value: 'select' },
                    { label: '✨ Generate new code here', value: 'generate' },
                ], { placeHolder: 'No code selected. What would you like to do?' });
                if (choice?.value === 'select') {
                    vscode.window.showInformationMessage('Please select some code to edit');
                    return;
                }
                // If generate, continue with empty selection
            }
        }
        const ranges = selections.length > 0
            ? selections.map(sel => new vscode.Range(sel.start, sel.end))
            : [new vscode.Range(editor.selection.active.line, 0, editor.selection.active.line, editor.document.lineAt(editor.selection.active.line).text.length)];
        const originalTexts = ranges.map(range => editor.document.getText(range));
        // Create highlight decoration
        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editor.findMatchBorder'),
            isWholeLine: false,
        });
        editor.setDecorations(decorationType, ranges);
        this.activeSession = {
            editor,
            ranges,
            originalTexts,
            decorationType,
            isGenerating: false,
        };
        // Show quick pick for common suggestions
        const quickPickItems = this.commonSuggestions.map(s => ({
            label: s.label,
            description: s.description,
            detail: s.instruction || 'Type your custom instruction',
        }));
        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: `What would you like to change? (${ranges.length} selection${ranges.length > 1 ? 's' : ''})`,
            matchOnDescription: true,
            matchOnDetail: true,
        });
        if (!selected) {
            this.dispose();
            return;
        }
        const suggestion = this.commonSuggestions.find(s => s.label === selected.label);
        let instruction;
        // If custom instruction, show input box
        if (!suggestion?.instruction) {
            const inputBox = vscode.window.createInputBox();
            inputBox.placeholder = 'Enter your instruction (e.g., "add error handling")';
            inputBox.prompt = `🧠 MindHive Quick Edit | Enter to apply, Esc to cancel`;
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
            instruction = await new Promise((resolve) => {
                inputBox.onDidAccept(() => {
                    const value = inputBox.value.trim();
                    inputBox.dispose();
                    resolve(value || undefined);
                });
                inputBox.onDidTriggerButton((button) => {
                    inputBox.dispose();
                    if (button.tooltip?.includes('Cancel')) {
                        resolve(undefined);
                    }
                    else {
                        resolve(inputBox.value.trim() || undefined);
                    }
                });
                inputBox.onDidHide(() => {
                    inputBox.dispose();
                    resolve(undefined);
                });
                inputBox.show();
            });
            if (!instruction) {
                this.dispose();
                return;
            }
        }
        else {
            instruction = suggestion.instruction;
        }
        this.showStatus('Ready');
        await this.processInstruction(instruction);
    }
    async processInstruction(instruction) {
        if (!this.activeSession)
            return;
        const { editor, ranges, originalTexts } = this.activeSession;
        this.activeSession.isGenerating = true;
        this.showStatus('Generating edits...');
        try {
            // Generate edits for each selection
            const edits = await Promise.all(ranges.map(async (range, index) => {
                const originalText = originalTexts[index];
                const context = this.buildContext(editor, range);
                return await this.generateEdit(originalText, instruction, editor.document.languageId, context);
            }));
            // Show preview
            await this.showDiffPreview(ranges, originalTexts, edits);
        }
        catch (error) {
            vscode.window.showErrorMessage(`MindHive Error: ${error.message}`);
            this.dispose();
        }
        finally {
            this.activeSession.isGenerating = false;
        }
    }
    buildContext(editor, range) {
        // Get surrounding context (25 lines before and after)
        const startLine = Math.max(0, range.start.line - 25);
        const endLine = Math.min(editor.document.lineCount - 1, range.end.line + 25);
        const contextRange = new vscode.Range(startLine, 0, endLine, 999);
        const fullContext = editor.document.getText(contextRange);
        // Get imports
        const imports = this.extractImports(editor.document);
        return `${imports}\n\n...\n\n${fullContext}`;
    }
    extractImports(document) {
        const firstLines = Math.min(30, document.lineCount);
        const imports = [];
        for (let i = 0; i < firstLines; i++) {
            const line = document.lineAt(i).text;
            if (line.trim().startsWith('import ') ||
                line.trim().startsWith('from ') ||
                line.trim().startsWith('require(') ||
                line.trim().startsWith('const ') && line.includes('require(')) {
                imports.push(line);
            }
        }
        return imports.join('\n');
    }
    async generateEdit(originalText, instruction, language, context) {
        const prompt = this.buildEditPrompt(originalText, instruction, context);
        const response = await this.client.generateCode({
            prompt,
            language,
            context,
            models: ['anthropic', 'openai'],
        });
        // Extract just the edited code
        return this.extractEditedCode(response.code || '', originalText);
    }
    buildEditPrompt(originalText, instruction, context) {
        return `Edit the following code according to this instruction: "${instruction}"

IMPORTANT:
- Only return the EDITED version of the code
- Preserve the code's structure and style
- Don't add explanations or markdown formatting
- Keep existing comments unless they need updating
- Maintain proper indentation

Original code:
\`\`\`
${originalText}
\`\`\`

Context:
${context}

Return ONLY the edited code:`;
    }
    extractEditedCode(generated, original) {
        // Remove markdown code fences if present
        let code = generated
            .replace(/^```[\w]*\n/gm, '')
            .replace(/\n```$/gm, '')
            .trim();
        // If the generated code is empty or just whitespace, return original
        if (!code || code.trim().length === 0) {
            return original;
        }
        return code;
    }
    async showDiffPreview(ranges, originalTexts, editedTexts) {
        if (!this.activeSession)
            return;
        const { editor } = this.activeSession;
        // Create preview decoration showing the new text
        const previewDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
        });
        this.activeSession.previewDecorationType = previewDecorationType;
        // Show quick pick for action
        const actions = [
            { label: '✅ Accept All', description: 'Apply all changes (Tab)', action: 'accept' },
            { label: '❌ Reject All', description: 'Keep original code (Esc)', action: 'reject' },
            { label: '👁️ Show Diff', description: 'View side-by-side comparison', action: 'diff' },
            { label: '🔄 Regenerate', description: 'Try again with same instruction', action: 'retry' },
            { label: '✏️ Modify Instruction', description: 'Change what to edit', action: 'modify' },
        ];
        // If multiple selections, add individual review option
        if (ranges.length > 1) {
            actions.splice(2, 0, {
                label: '📋 Review Each',
                description: `Review ${ranges.length} edits individually`,
                action: 'review',
            });
        }
        const choice = await vscode.window.showQuickPick(actions, {
            placeHolder: `Review ${ranges.length} edit${ranges.length > 1 ? 's' : ''} (Tab=Accept, Esc=Reject)`,
        });
        if (!choice) {
            this.dispose();
            return;
        }
        switch (choice.action) {
            case 'accept':
                await this.applyEdits(ranges, editedTexts);
                vscode.window.showInformationMessage(`✅ Applied ${ranges.length} edit${ranges.length > 1 ? 's' : ''}`);
                this.dispose();
                break;
            case 'reject':
                this.dispose();
                break;
            case 'diff':
                await this.showSideBySideDiff(originalTexts, editedTexts, editor.document.languageId);
                // After viewing diff, show options again
                await this.showDiffPreview(ranges, originalTexts, editedTexts);
                break;
            case 'retry':
                this.dispose();
                await this.start();
                break;
            case 'modify':
                this.dispose();
                await this.start();
                break;
            case 'review':
                await this.reviewIndividualEdits(ranges, originalTexts, editedTexts);
                break;
        }
    }
    async reviewIndividualEdits(ranges, originalTexts, editedTexts) {
        const acceptedEdits = [];
        for (let i = 0; i < ranges.length; i++) {
            const choice = await vscode.window.showQuickPick([
                { label: '✅ Accept', action: 'accept' },
                { label: '❌ Skip', action: 'skip' },
                { label: '👁️ View Diff', action: 'diff' },
                { label: '🛑 Cancel All', action: 'cancel' },
            ], {
                placeHolder: `Edit ${i + 1}/${ranges.length}: Review change`,
            });
            if (!choice || choice.action === 'cancel') {
                break;
            }
            if (choice.action === 'accept') {
                acceptedEdits.push({ range: ranges[i], text: editedTexts[i] });
            }
            else if (choice.action === 'diff') {
                await this.showSideBySideDiff([originalTexts[i]], [editedTexts[i]], this.activeSession.editor.document.languageId);
                i--; // Review this one again
            }
        }
        // Apply accepted edits
        if (acceptedEdits.length > 0) {
            await this.applyEdits(acceptedEdits.map(e => e.range), acceptedEdits.map(e => e.text));
            vscode.window.showInformationMessage(`✅ Applied ${acceptedEdits.length}/${ranges.length} edits`);
        }
        this.dispose();
    }
    async applyEdits(ranges, texts) {
        if (!this.activeSession)
            return;
        const { editor } = this.activeSession;
        // Save to undo stack
        this.undoStack.push({
            ranges: ranges.map(r => r),
            texts: this.activeSession.originalTexts,
        });
        // Apply all edits in a single transaction
        await editor.edit((editBuilder) => {
            // Apply in reverse order to maintain correct positions
            const sortedEdits = ranges
                .map((range, index) => ({ range, text: texts[index] }))
                .sort((a, b) => b.range.start.compareTo(a.range.start));
            for (const edit of sortedEdits) {
                editBuilder.replace(edit.range, edit.text);
            }
        }, {
            undoStopBefore: true,
            undoStopAfter: true,
        });
        // Format the edited ranges
        const formattedRanges = ranges.map(range => {
            const lines = texts[ranges.indexOf(range)].split('\n');
            return new vscode.Range(range.start.line, 0, range.start.line + lines.length - 1, lines[lines.length - 1].length);
        });
        // Try to format
        try {
            await vscode.commands.executeCommand('editor.action.formatSelection');
        }
        catch {
            // Formatting might not be available
        }
    }
    async undoLastEdit() {
        if (this.undoStack.length === 0) {
            vscode.window.showInformationMessage('No edits to undo');
            return;
        }
        const lastEdit = this.undoStack.pop();
        if (this.activeSession) {
            await this.applyEdits(lastEdit.ranges, lastEdit.texts);
            vscode.window.showInformationMessage('✅ Undo applied');
        }
    }
    async showSideBySideDiff(originalTexts, editedTexts, language) {
        // Create temporary documents for diff view
        const originalContent = originalTexts.join('\n\n// ---\n\n');
        const editedContent = editedTexts.join('\n\n// ---\n\n');
        const originalDoc = await vscode.workspace.openTextDocument({
            content: originalContent,
            language,
        });
        const editedDoc = await vscode.workspace.openTextDocument({
            content: editedContent,
            language,
        });
        await vscode.commands.executeCommand('vscode.diff', originalDoc.uri, editedDoc.uri, 'Original ↔ MindHive Quick Edit');
    }
    showStatus(message) {
        this.statusBarItem.text = `🧠 ${message}`;
        this.statusBarItem.show();
    }
    async cancel() {
        this.dispose();
        vscode.window.showInformationMessage('Quick edit cancelled');
    }
    dispose() {
        if (this.activeSession) {
            this.activeSession.decorationType.dispose();
            this.activeSession.previewDecorationType?.dispose();
            this.activeSession = undefined;
        }
        this.statusBarItem.hide();
    }
}
exports.QuickEditWidget = QuickEditWidget;
//# sourceMappingURL=QuickEditWidget.js.map