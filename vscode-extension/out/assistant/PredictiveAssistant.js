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
exports.PredictiveAssistant = void 0;
const vscode = __importStar(require("vscode"));
class PredictiveAssistant {
    extensionContext;
    client;
    authManager;
    context = null;
    isRunning = false;
    changeBuffer = [];
    debounceTimer = null;
    constructor(extensionContext, client, authManager) {
        this.extensionContext = extensionContext;
        this.client = client;
        this.authManager = authManager;
    }
    async start() {
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
    stop() {
        this.isRunning = false;
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        console.log('🔮 Predictive Assistant stopped');
    }
    onDocumentChange(event) {
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
    onSelectionChange(event) {
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
    async makePrediction() {
        if (!this.context || this.changeBuffer.length === 0) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        try {
            // Analyze recent changes to predict next action
            const prediction = await this.analyzePrediction(editor, this.changeBuffer.join(''));
            if (prediction && prediction.confidence > 0.7) {
                this.showPrediction(prediction);
            }
            // Clear buffer
            this.changeBuffer = [];
        }
        catch (error) {
            // Silent fail - don't disrupt user
            console.error('Prediction failed:', error);
        }
    }
    async analyzePrediction(editor, recentText) {
        // Use AI to predict what user will need next
        const context = editor.document.getText();
        const language = editor.document.languageId;
        // Simple heuristics + AI prediction
        const predictions = [];
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
    showPrediction(prediction) {
        vscode.window
            .showInformationMessage(`🔮 ${prediction.message}`, 'Yes', 'Not Now', 'Disable')
            .then((choice) => {
            if (choice === 'Yes') {
                this.executePredictionAction(prediction);
            }
            else if (choice === 'Disable') {
                const config = vscode.workspace.getConfiguration('MindHive');
                config.update('predictiveMode', false, true);
                this.stop();
            }
        });
    }
    async executePredictionAction(prediction) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        switch (prediction.action) {
            case 'generateTests':
                await vscode.commands.executeCommand('MindHive.generateCode');
                break;
            case 'showExamples':
                const patterns = await this.client.searchPatterns(prediction.data.packageName);
                this.showPatternsQuickPick(patterns);
                break;
            case 'verifyCode':
                await vscode.commands.executeCommand('MindHive.verifyCode');
                break;
            default:
                break;
        }
    }
    async showPatternsQuickPick(patterns) {
        if (patterns.length === 0) {
            vscode.window.showInformationMessage('No examples found');
            return;
        }
        const items = patterns.map((pattern) => ({
            label: pattern.title,
            description: `${pattern.usageCount.toLocaleString()} uses | ${Math.round(pattern.successRate * 100)}% success`,
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
    containsFunctionDeclaration(text) {
        return /function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>/.test(text);
    }
    containsImportStatement(text) {
        return /^import\s+|^from\s+/.test(text.trim());
    }
    extractPackageName(text) {
        const match = text.match(/from\s+['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    }
    containsPotentialBug(text) {
        // Simple checks for common bugs
        const bugPatterns = [
            /==\s*null(?!\?)/, // null comparison without ??
            /console\.log/, // console.log in production
            /eval\(/, // eval usage
            /innerHTML\s*=/, // innerHTML (XSS risk)
        ];
        return bugPatterns.some((pattern) => pattern.test(text));
    }
}
exports.PredictiveAssistant = PredictiveAssistant;
//# sourceMappingURL=PredictiveAssistant.js.map