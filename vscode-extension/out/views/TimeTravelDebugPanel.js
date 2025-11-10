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
exports.TimeTravelDebugPanel = void 0;
const vscode = __importStar(require("vscode"));
class TimeTravelDebugPanel {
    client;
    static currentPanel;
    _panel;
    _extensionUri;
    _disposables = [];
    _currentAnalysis = null;
    constructor(panel, extensionUri, client) {
        this.client = client;
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'applyFix':
                    this.applyFix(message.fixId);
                    break;
                case 'showDetails':
                    this.showFixDetails(message.fixId);
                    break;
                case 'verifyFix':
                    this.verifyFix(message.fixId);
                    break;
                case 'dismissError':
                    this.dismissError();
                    break;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri, client) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it
        if (TimeTravelDebugPanel.currentPanel) {
            TimeTravelDebugPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel('timeTravelDebug', '🕰️ Time-Travel Debugging', column || vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'assets')],
            retainContextWhenHidden: true
        });
        TimeTravelDebugPanel.currentPanel = new TimeTravelDebugPanel(panel, extensionUri, client);
    }
    async analyzeError(error, code, language) {
        try {
            // Show loading state
            this._panel.webview.postMessage({ command: 'loading', message: 'Analyzing error pattern...' });
            // Call backend API
            const response = await this.client.post('/api/v1/debug/analyze', {
                errorMessage: error.message,
                stackTrace: error.stack || '',
                code: code,
                language: language,
                filePath: vscode.window.activeTextEditor?.document.fileName
            });
            this._currentAnalysis = response.data;
            // Update UI with results
            this._panel.webview.postMessage({
                command: 'showAnalysis',
                analysis: this._currentAnalysis
            });
            // Show success message
            const similarCount = this._currentAnalysis?.similarErrors.length || 0;
            if (similarCount > 0) {
                vscode.window.showInformationMessage(`🎯 Found ${similarCount} similar error${similarCount > 1 ? 's' : ''} with proven fixes!`);
            }
            else {
                vscode.window.showInformationMessage('🆕 New error pattern detected. AI is generating a custom solution...');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to analyze error: ${error.message}`);
            this._panel.webview.postMessage({
                command: 'error',
                message: error.message
            });
        }
    }
    async applyFix(fixId) {
        if (!this._currentAnalysis) {
            vscode.window.showErrorMessage('No analysis available');
            return;
        }
        const fix = this._currentAnalysis.recommendations.find(r => r.id === fixId);
        if (!fix) {
            vscode.window.showErrorMessage('Fix not found');
            return;
        }
        // Ask for confirmation
        const confirmation = await vscode.window.showWarningMessage(`Apply fix with ${(fix.confidenceScore * 100).toFixed(0)}% confidence?\n\n${fix.description}`, { modal: true }, 'Apply', 'Preview', 'Cancel');
        if (confirmation === 'Cancel' || !confirmation) {
            return;
        }
        if (confirmation === 'Preview') {
            await this.previewFix(fix);
            return;
        }
        try {
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Applying fix...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Making changes...' });
                // Apply all code changes
                for (const change of fix.fix.changes) {
                    await this.applyCodeChange(change);
                }
                progress.report({ increment: 50, message: 'Verifying fix...' });
                // Call backend to track fix application
                await this.client.post('/api/v1/debug/apply-fix', {
                    occurrenceId: this._currentAnalysis?.id,
                    fixId: fix.id
                });
                progress.report({ increment: 100, message: 'Done!' });
            });
            // Show success
            vscode.window.showInformationMessage(`✅ Fix applied successfully! Success rate: ${(fix.successRate * 100).toFixed(0)}%`);
            // Update panel
            this._panel.webview.postMessage({
                command: 'fixApplied',
                fixId: fixId
            });
            // Close panel after 3 seconds
            setTimeout(() => {
                this._panel.dispose();
            }, 3000);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to apply fix: ${error.message}`);
        }
    }
    async previewFix(fix) {
        const previewDoc = await vscode.workspace.openTextDocument({
            content: this.generatePreviewContent(fix),
            language: 'diff'
        });
        await vscode.window.showTextDocument(previewDoc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true
        });
    }
    generatePreviewContent(fix) {
        let content = `# Fix Preview: ${fix.description}\n\n`;
        content += `Confidence: ${(fix.confidenceScore * 100).toFixed(0)}%\n`;
        content += `Success Rate: ${(fix.successRate * 100).toFixed(0)}%\n\n`;
        content += `## Changes:\n\n`;
        for (const change of fix.fix.changes) {
            content += `### ${change.file}\n\n`;
            if (change.oldCode) {
                content += `- ${change.oldCode}\n`;
            }
            content += `+ ${change.newCode}\n\n`;
        }
        content += `## Explanation:\n${fix.explanation}\n\n`;
        content += `## Preventive Measures:\n`;
        fix.preventiveMeasures.forEach((measure, index) => {
            content += `${index + 1}. ${measure}\n`;
        });
        return content;
    }
    async applyCodeChange(change) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active editor');
        }
        const document = editor.document;
        await editor.edit(editBuilder => {
            if (change.lineNumber !== undefined && change.oldCode) {
                // Replace specific line
                const line = document.lineAt(change.lineNumber);
                editBuilder.replace(line.range, change.newCode);
            }
            else if (change.oldCode) {
                // Find and replace in document
                const text = document.getText();
                const index = text.indexOf(change.oldCode);
                if (index !== -1) {
                    const startPos = document.positionAt(index);
                    const endPos = document.positionAt(index + change.oldCode.length);
                    editBuilder.replace(new vscode.Range(startPos, endPos), change.newCode);
                }
            }
            else {
                // Insert at cursor or end
                const position = editor.selection.active;
                editBuilder.insert(position, change.newCode);
            }
        });
    }
    async showFixDetails(fixId) {
        if (!this._currentAnalysis)
            return;
        const fix = this._currentAnalysis.recommendations.find(r => r.id === fixId);
        if (!fix)
            return;
        const message = `
**${fix.description}**

**Confidence:** ${(fix.confidenceScore * 100).toFixed(0)}%
**Success Rate:** ${(fix.successRate * 100).toFixed(0)}%

**Explanation:**
${fix.explanation}

**Preventive Measures:**
${fix.preventiveMeasures.map((m, i) => `${i + 1}. ${m}`).join('\n')}
    `.trim();
        vscode.window.showInformationMessage(message, { modal: true });
    }
    async verifyFix(fixId) {
        if (!this._currentAnalysis)
            return;
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Verifying fix...',
                cancellable: false
            }, async () => {
                const response = await this.client.post('/api/v1/debug/verify-fix', {
                    occurrenceId: this._currentAnalysis?.id,
                    fixId: fixId
                });
                if (response.data.verified) {
                    vscode.window.showInformationMessage('✅ Fix verified successfully!');
                }
                else {
                    vscode.window.showWarningMessage('⚠️ Fix verification failed. Review recommended.');
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Verification failed: ${error.message}`);
        }
    }
    dismissError() {
        this._panel.dispose();
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Time-Travel Debugging</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .loading {
            text-align: center;
            padding: 40px;
        }
        .spinner {
            border: 4px solid var(--vscode-progressBar-background);
            border-top: 4px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .error-info {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .similar-errors {
            margin-bottom: 30px;
        }
        .similar-error {
            background: var(--vscode-list-hoverBackground);
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 5px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .similarity-badge {
            display: inline-block;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .recommendations {
            margin-top: 30px;
        }
        .recommendation {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 5px;
            border: 2px solid transparent;
            transition: all 0.2s;
        }
        .recommendation:hover {
            border-color: var(--vscode-focusBorder);
        }
        .confidence-bar {
            height: 6px;
            background: var(--vscode-progressBar-background);
            border-radius: 3px;
            overflow: hidden;
            margin: 10px 0;
        }
        .confidence-fill {
            height: 100%;
            background: var(--vscode-progressBar-foreground);
            transition: width 0.3s;
        }
        .confidence-high { background: #4caf50 !important; }
        .confidence-medium { background: #ff9800 !important; }
        .confidence-low { background: #f44336 !important; }
        .stats {
            display: flex;
            gap: 20px;
            margin: 15px 0;
            font-size: 13px;
        }
        .stat {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .stat-icon {
            font-size: 16px;
        }
        .buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .explanation {
            margin: 15px 0;
            padding: 15px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            font-size: 13px;
            line-height: 1.6;
        }
        .preventive-measures {
            margin-top: 15px;
        }
        .preventive-measures h4 {
            font-size: 14px;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .preventive-measures ul {
            list-style: none;
            padding-left: 0;
        }
        .preventive-measures li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
        }
        .preventive-measures li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: var(--vscode-textLink-foreground);
            font-weight: bold;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div id="content">
        <div class="empty-state">
            <div class="empty-state-icon">🕰️</div>
            <h2>Time-Travel Debugging</h2>
            <p style="margin-top: 15px;">
                Press <strong>Ctrl+Shift+E</strong> when you encounter an error<br>
                to analyze it and get AI-powered fix recommendations.
            </p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'loading':
                    showLoading(message.message);
                    break;
                case 'showAnalysis':
                    showAnalysis(message.analysis);
                    break;
                case 'error':
                    showError(message.message);
                    break;
                case 'fixApplied':
                    markFixApplied(message.fixId);
                    break;
            }
        });

        function showLoading(message) {
            document.getElementById('content').innerHTML = \`
                <div class="loading">
                    <div class="spinner"></div>
                    <p>\${message}</p>
                </div>
            \`;
        }

        function showError(message) {
            document.getElementById('content').innerHTML = \`
                <div class="error-info" style="background: var(--vscode-inputValidation-errorBackground);">
                    <strong>❌ Error:</strong> \${message}
                </div>
            \`;
        }

        function showAnalysis(analysis) {
            const similarErrors = analysis.similarErrors.map(err => \`
                <div class="similar-error">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>\${err.errorMessage.substring(0, 100)}...</strong>
                        <span class="similarity-badge">\${(err.similarity * 100).toFixed(0)}% match</span>
                    </div>
                    <div class="stats">
                        <span class="stat">
                            <span class="stat-icon">📊</span>
                            <span>\${err.occurrenceCount} occurrences</span>
                        </span>
                        <span class="stat">
                            <span class="stat-icon">✅</span>
                            <span>\${err.resolutionCount} resolutions</span>
                        </span>
                    </div>
                </div>
            \`).join('');

            const recommendations = analysis.recommendations.map(rec => {
                const confidencePercent = (rec.confidenceScore * 100).toFixed(0);
                const successPercent = (rec.successRate * 100).toFixed(0);
                const confidenceClass = rec.confidenceScore >= 0.8 ? 'confidence-high' : 
                                      rec.confidenceScore >= 0.5 ? 'confidence-medium' : 
                                      'confidence-low';
                
                return \`
                    <div class="recommendation">
                        <h3>\${rec.description}</h3>
                        <div class="stats">
                            <span class="stat">
                                <span class="stat-icon">🎯</span>
                                <strong>Confidence:</strong> \${confidencePercent}%
                            </span>
                            <span class="stat">
                                <span class="stat-icon">📈</span>
                                <strong>Success Rate:</strong> \${successPercent}%
                            </span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill \${confidenceClass}" style="width: \${confidencePercent}%"></div>
                        </div>
                        <div class="explanation">
                            <strong>📝 Explanation:</strong><br>
                            \${rec.explanation}
                        </div>
                        <div class="preventive-measures">
                            <h4>🛡️ Preventive Measures:</h4>
                            <ul>
                                \${rec.preventiveMeasures.map(m => \`<li>\${m}</li>\`).join('')}
                            </ul>
                        </div>
                        <div class="buttons">
                            <button onclick="applyFix('\${rec.id}')">✨ Apply Fix</button>
                            <button class="secondary" onclick="showDetails('\${rec.id}')">📋 Details</button>
                            <button class="secondary" onclick="verifyFix('\${rec.id}')">🔍 Verify</button>
                        </div>
                    </div>
                \`;
            }).join('');

            document.getElementById('content').innerHTML = \`
                <div class="header">
                    <h1>🕰️ Time-Travel Analysis</h1>
                    <p>Category: <strong>\${analysis.errorPattern.category}</strong> | 
                       Severity: <strong>\${analysis.errorPattern.severity}</strong></p>
                </div>

                \${analysis.similarErrors.length > 0 ? \`
                    <div class="similar-errors">
                        <h2 style="margin-bottom: 15px;">🔍 Similar Errors Found</h2>
                        \${similarErrors}
                    </div>
                \` : \`
                    <div class="error-info">
                        <strong>🆕 New Error Pattern</strong><br>
                        This is the first occurrence of this error. AI is generating a custom solution...
                    </div>
                \`}

                <div class="recommendations">
                    <h2 style="margin-bottom: 15px;">💡 Recommended Fixes</h2>
                    \${recommendations}
                </div>

                <div class="buttons" style="margin-top: 30px;">
                    <button class="secondary" onclick="dismissError()">✕ Dismiss</button>
                </div>
            \`;
        }

        function applyFix(fixId) {
            vscode.postMessage({ command: 'applyFix', fixId });
        }

        function showDetails(fixId) {
            vscode.postMessage({ command: 'showDetails', fixId });
        }

        function verifyFix(fixId) {
            vscode.postMessage({ command: 'verifyFix', fixId });
        }

        function dismissError() {
            vscode.postMessage({ command: 'dismissError' });
        }

        function markFixApplied(fixId) {
            const recommendation = document.querySelector(\`[onclick="applyFix('\${fixId}')"]\`).closest('.recommendation');
            if (recommendation) {
                recommendation.style.borderColor = '#4caf50';
                recommendation.style.opacity = '0.7';
                const buttons = recommendation.querySelector('.buttons');
                buttons.innerHTML = '<strong style="color: #4caf50;">✅ Fix Applied Successfully!</strong>';
            }
        }
    </script>
</body>
</html>`;
    }
    dispose() {
        TimeTravelDebugPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.TimeTravelDebugPanel = TimeTravelDebugPanel;
//# sourceMappingURL=TimeTravelDebugPanel.js.map