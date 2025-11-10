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
exports.BrowserPreview = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PortDetector_1 = require("./PortDetector");
const FileWatcher_1 = require("./FileWatcher");
/**
 * Browser preview manager
 * Integrates with VS Code Simple Browser or custom webview
 */
class BrowserPreview {
    panel;
    portDetector;
    fileWatcher;
    outputChannel;
    currentPort;
    disposables = [];
    reloadListenerPort = 35729; // LiveReload protocol default
    reloadServer;
    statusBarItem;
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.portDetector = new PortDetector_1.PortDetector(outputChannel);
        this.fileWatcher = new FileWatcher_1.FileWatcher(outputChannel);
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'mindhive.showPreviewOptions';
        this.disposables.push(this.statusBarItem);
        this.updateStatusBar('Ready');
    }
    /**
     * Open browser preview
     */
    async openPreview(options = {}) {
        try {
            this.outputChannel.show(true);
            this.outputChannel.appendLine('🚀 Opening browser preview...');
            // Detect port if not provided
            if (!options.port) {
                this.outputChannel.appendLine('🔍 Auto-detecting development server...');
                const bestPort = await this.portDetector.findBestPort();
                if (!bestPort) {
                    vscode.window.showErrorMessage('No development server found. Start your dev server first (npm run dev, npm start, etc.)', 'Scan Again', 'Manual Port').then(choice => {
                        if (choice === 'Scan Again') {
                            this.portDetector.clearCache();
                            this.openPreview(options);
                        }
                        else if (choice === 'Manual Port') {
                            this.promptManualPort();
                        }
                    });
                    return;
                }
                this.currentPort = bestPort;
            }
            else {
                // Use specified port
                this.currentPort = {
                    port: options.port,
                    framework: 'Custom',
                    isRunning: true,
                    url: `http://localhost:${options.port}`
                };
            }
            this.outputChannel.appendLine(`✅ Using ${this.currentPort.framework} on port ${this.currentPort.port}`);
            // Open in Simple Browser or external browser
            if (options.openExternal) {
                await this.openInExternalBrowser();
            }
            else {
                await this.openInWebview(options);
            }
            // Start hot reload if enabled
            if (options.enableHotReload !== false) {
                await this.startHotReload();
            }
            this.updateStatusBar(`Port ${this.currentPort.port}`);
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Error opening preview: ${error.message}`);
            vscode.window.showErrorMessage(`Preview error: ${error.message}`);
        }
    }
    /**
     * Open in VS Code Simple Browser
     */
    async openInExternalBrowser() {
        if (!this.currentPort)
            return;
        const uri = vscode.Uri.parse(this.currentPort.url);
        await vscode.commands.executeCommand('simpleBrowser.api.open', uri, {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: false
        });
        this.outputChannel.appendLine(`🌐 Opened in Simple Browser: ${this.currentPort.url}`);
    }
    /**
     * Open in custom webview with injection
     */
    async openInWebview(options) {
        if (!this.currentPort)
            return;
        // Create or show panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        }
        else {
            this.panel = vscode.window.createWebviewPanel('mindhivePreview', `Preview - ${this.currentPort.framework}`, vscode.ViewColumn.Beside, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: []
            });
            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.updateStatusBar('Closed');
            }, null, this.disposables);
            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(message => this.handleWebviewMessage(message), null, this.disposables);
        }
        // Generate HTML with reload injection
        const html = await this.generatePreviewHTML(options);
        this.panel.webview.html = html;
        this.outputChannel.appendLine(`🎨 Opened custom webview: ${this.currentPort.url}`);
    }
    /**
     * Generate HTML for webview with reload script injection
     */
    async generatePreviewHTML(options) {
        if (!this.currentPort)
            return '';
        const deviceClass = options.deviceEmulation || 'desktop';
        const reloadScript = await this.getReloadScript();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview - ${this.currentPort.framework}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            overflow: hidden;
            height: 100vh;
        }
        .preview-container {
            width: 100%;
            height: 100%;
            position: relative;
        }
        .preview-frame {
            width: 100%;
            height: 100%;
            border: none;
        }
        /* Device emulation */
        .device-mobile .preview-frame {
            max-width: 375px;
            height: 667px;
            margin: 0 auto;
            border: 2px solid #333;
            border-radius: 20px;
        }
        .device-tablet .preview-frame {
            max-width: 768px;
            height: 1024px;
            margin: 0 auto;
            border: 2px solid #333;
            border-radius: 10px;
        }
        .reload-indicator {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #007acc;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            z-index: 10000;
            display: none;
        }
        .reload-indicator.show {
            display: block;
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="preview-container device-${deviceClass}">
        <div class="reload-indicator" id="reloadIndicator">🔄 Reloading...</div>
        <iframe 
            class="preview-frame" 
            src="${this.currentPort.url}"
            id="previewFrame"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        ></iframe>
    </div>

    ${reloadScript}

    <script>
        const vscode = acquireVsCodeApi();
        const frame = document.getElementById('previewFrame');
        const indicator = document.getElementById('reloadIndicator');

        // Listen for console messages from iframe
        window.addEventListener('message', (event) => {
            if (event.data.type === 'console') {
                vscode.postMessage({
                    type: 'console',
                    level: event.data.level,
                    message: event.data.message
                });
            } else if (event.data.type === 'error') {
                vscode.postMessage({
                    type: 'error',
                    message: event.data.message
                });
            }
        });

        // Listen for reload commands from extension
        window.addEventListener('message', (event) => {
            const message = event.data;
            
            if (message.command === 'reload') {
                console.log('🔄 Hot reload triggered:', message.file);
                indicator.classList.add('show');
                setTimeout(() => {
                    frame.src = frame.src.split('?')[0] + '?t=' + Date.now();
                    setTimeout(() => {
                        indicator.classList.remove('show');
                    }, 1000);
                }, 100);
            } else if (message.command === 'changePort') {
                frame.src = \`http://localhost:\${message.port}\`;
            }
        });

        // Notify extension when frame loads
        frame.addEventListener('load', () => {
            vscode.postMessage({ type: 'frameLoaded', url: frame.src });
        });

        // Intercept console from iframe (if same-origin)
        try {
            const frameWindow = frame.contentWindow;
            if (frameWindow) {
                ['log', 'warn', 'error', 'info'].forEach(level => {
                    const original = frameWindow.console[level];
                    frameWindow.console[level] = function(...args) {
                        original.apply(frameWindow.console, args);
                        window.postMessage({
                            type: 'console',
                            level: level,
                            message: args.map(a => String(a)).join(' ')
                        }, '*');
                    };
                });
            }
        } catch (e) {
            // Cross-origin, can't intercept console
            console.log('⚠️ Cannot intercept console (cross-origin)');
        }
    </script>
</body>
</html>`;
    }
    /**
     * Get reload injection script
     */
    async getReloadScript() {
        try {
            const scriptPath = path.join(__dirname, 'reload-client.js');
            if (fs.existsSync(scriptPath)) {
                return `<script>${fs.readFileSync(scriptPath, 'utf8')}</script>`;
            }
        }
        catch (error) {
            // Script not found, will be created later
        }
        return `<script>
        // Minimal reload client
        console.log('🔥 Hot reload enabled');
    </script>`;
    }
    /**
     * Start hot reload watching
     */
    async startHotReload() {
        this.outputChannel.appendLine('🔥 Starting hot reload...');
        const disposable = this.fileWatcher.startWatching((event) => {
            this.handleFileChange(event);
        });
        this.disposables.push(disposable);
        this.outputChannel.appendLine('✅ Hot reload active');
    }
    /**
     * Handle file changes for hot reload
     */
    handleFileChange(event) {
        this.outputChannel.appendLine(`🔄 Reloading preview (${event.type}: ${event.relativePath})`);
        if (this.panel) {
            // Send reload command to webview
            this.panel.webview.postMessage({
                command: 'reload',
                file: event.relativePath,
                type: event.type
            });
        }
        // Update status bar temporarily
        this.statusBarItem.text = '$(sync~spin) Reloading...';
        setTimeout(() => {
            this.updateStatusBar(`Port ${this.currentPort?.port}`);
        }, 1000);
    }
    /**
     * Handle messages from webview
     */
    handleWebviewMessage(message) {
        switch (message.type) {
            case 'console':
                this.outputChannel.appendLine(`[Console ${message.level}] ${message.message}`);
                break;
            case 'error':
                this.outputChannel.appendLine(`❌ [Error] ${message.message}`);
                break;
            case 'frameLoaded':
                this.outputChannel.appendLine(`✅ Frame loaded: ${message.url}`);
                break;
        }
    }
    /**
     * Refresh preview manually
     */
    async refresh() {
        if (!this.panel) {
            vscode.window.showWarningMessage('No preview window open');
            return;
        }
        this.outputChannel.appendLine('🔄 Manual refresh triggered');
        this.fileWatcher.forceReload();
    }
    /**
     * Change port
     */
    async changePort(port) {
        this.currentPort = {
            port,
            framework: 'Custom',
            isRunning: true,
            url: `http://localhost:${port}`
        };
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'changePort',
                port
            });
        }
        this.updateStatusBar(`Port ${port}`);
        this.outputChannel.appendLine(`🔄 Changed to port ${port}`);
    }
    /**
     * Take screenshot
     */
    async takeScreenshot() {
        vscode.window.showInformationMessage('Screenshot feature coming soon!');
    }
    /**
     * Prompt for manual port entry
     */
    async promptManualPort() {
        const port = await vscode.window.showInputBox({
            prompt: 'Enter port number',
            placeHolder: '3000',
            validateInput: (value) => {
                const num = parseInt(value, 10);
                return (num > 0 && num < 65536) ? null : 'Enter valid port (1-65535)';
            }
        });
        if (port) {
            await this.openPreview({ port: parseInt(port, 10) });
        }
    }
    /**
     * Update status bar
     */
    updateStatusBar(text) {
        this.statusBarItem.text = `$(browser) Preview: ${text}`;
        this.statusBarItem.show();
    }
    /**
     * Dispose all resources
     */
    dispose() {
        this.fileWatcher.stopWatching();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        if (this.panel) {
            this.panel.dispose();
        }
        if (this.reloadServer) {
            this.reloadServer.close();
        }
        this.statusBarItem.dispose();
    }
}
exports.BrowserPreview = BrowserPreview;
//# sourceMappingURL=BrowserPreview.js.map