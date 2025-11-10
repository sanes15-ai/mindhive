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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const HiveMindClient_1 = require("./client/HiveMindClient");
const AuthManager_1 = require("./auth/AuthManager");
const InsightsProvider_1 = require("./views/InsightsProvider");
const AgentsProvider_1 = require("./views/AgentsProvider");
const AlertsProvider_1 = require("./views/AlertsProvider");
const ChatPanelProvider_1 = require("./views/ChatPanelProvider");
const InlineChatWidget_1 = require("./views/InlineChatWidget");
const QuickEditWidget_1 = require("./views/QuickEditWidget");
const TerminalManager_1 = require("./terminal/TerminalManager");
const AgentOrchestrator_1 = require("./agent/AgentOrchestrator");
const CodeLensProvider_1 = require("./providers/CodeLensProvider");
const InlineCompletionProvider_1 = require("./providers/InlineCompletionProvider");
const HoverProvider_1 = require("./providers/HoverProvider");
const CodeActionsProvider_1 = require("./providers/CodeActionsProvider");
const HUDManager_1 = require("./hud/HUDManager");
const PredictiveAssistant_1 = require("./assistant/PredictiveAssistant");
const CommandHandler_1 = require("./commands/CommandHandler");
const BrowserPreview_1 = require("./preview/BrowserPreview");
const DeploymentManager_1 = require("./deployment/DeploymentManager");
const DeploymentPanel_1 = require("./deployment/DeploymentPanel");
const CollaborationEngine_1 = require("./services/collaboration/CollaborationEngine");
const CursorSync_1 = require("./services/collaboration/CursorSync");
const PresenceManager_1 = require("./services/collaboration/PresenceManager");
const AICollaborator_1 = require("./services/collaboration/AICollaborator");
const CommentThread_1 = require("./services/collaboration/CommentThread");
const CollabPanel_1 = require("./collaboration/CollabPanel");
const AgentStatusBar_1 = require("./views/AgentStatusBar");
let client;
let authManager;
let hudManager;
let agentStatusBar;
let predictiveAssistant;
let inlineChatWidget;
let quickEditWidget;
let terminalManager;
let agentOrchestrator;
let browserPreview;
let deploymentManager;
let deploymentPanel;
let collaborationEngine;
let cursorSync;
let presenceManager;
let aiCollaborator;
let commentManager;
let collabPanel;
let collabStatusBar;
async function activate(context) {
    console.log('🧠 MindHive extension activated');
    // Initialize core services
    authManager = new AuthManager_1.AuthManager(context);
    client = new HiveMindClient_1.MindHiveClient(context, authManager);
    hudManager = new HUDManager_1.HUDManager(context, client);
    agentStatusBar = new AgentStatusBar_1.AgentStatusBar(context, client);
    predictiveAssistant = new PredictiveAssistant_1.PredictiveAssistant(context, client, authManager);
    // Show agent status bar by default
    agentStatusBar.show();
    // Register view providers
    const insightsProvider = new InsightsProvider_1.InsightsProvider(context, client);
    const agentsProvider = new AgentsProvider_1.AgentsProvider(context, client);
    const alertsProvider = new AlertsProvider_1.AlertsProvider(context, client);
    const chatPanelProvider = new ChatPanelProvider_1.ChatPanelProvider(context.extensionUri, client, authManager);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('MindHive.insights', insightsProvider), vscode.window.registerTreeDataProvider('MindHive.agents', agentsProvider), vscode.window.registerTreeDataProvider('MindHive.alerts', alertsProvider), vscode.window.registerWebviewViewProvider(ChatPanelProvider_1.ChatPanelProvider.viewType, chatPanelProvider));
    // Initialize inline chat widget
    inlineChatWidget = new InlineChatWidget_1.InlineChatWidget(client);
    context.subscriptions.push(inlineChatWidget);
    // Initialize quick edit widget
    quickEditWidget = new QuickEditWidget_1.QuickEditWidget(client);
    context.subscriptions.push(quickEditWidget);
    // Initialize terminal manager
    terminalManager = new TerminalManager_1.TerminalManager(client);
    context.subscriptions.push(terminalManager);
    // Initialize agent orchestrator
    agentOrchestrator = new AgentOrchestrator_1.AgentOrchestrator(client);
    context.subscriptions.push(agentOrchestrator);
    // Initialize browser preview
    const outputChannel = vscode.window.createOutputChannel('MindHive Preview');
    browserPreview = new BrowserPreview_1.BrowserPreview(outputChannel);
    context.subscriptions.push(browserPreview);
    context.subscriptions.push(outputChannel);
    // Initialize deployment manager
    const deploymentOutputChannel = vscode.window.createOutputChannel('MindHive Deployment');
    deploymentManager = new DeploymentManager_1.DeploymentManager(deploymentOutputChannel);
    deploymentPanel = new DeploymentPanel_1.DeploymentPanel(context, deploymentManager);
    context.subscriptions.push(deploymentManager);
    context.subscriptions.push(deploymentPanel);
    context.subscriptions.push(deploymentOutputChannel);
    // Initialize collaboration system 🔥
    const collabOutputChannel = vscode.window.createOutputChannel('MindHive Collaboration');
    collaborationEngine = new CollaborationEngine_1.CollaborationEngine();
    cursorSync = new CursorSync_1.CursorSync();
    presenceManager = new PresenceManager_1.PresenceManager();
    aiCollaborator = new AICollaborator_1.AICollaborator();
    commentManager = new CommentThread_1.CommentThreadManager();
    collabPanel = new CollabPanel_1.CollabPanel(context, collaborationEngine, presenceManager, aiCollaborator, commentManager);
    // Create collaboration status bar item
    collabStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    collabStatusBar.text = "$(radio-tower) Collab: Offline";
    collabStatusBar.command = 'mindhive.showCollabPanel';
    collabStatusBar.show();
    context.subscriptions.push(collaborationEngine, cursorSync, presenceManager, aiCollaborator, commentManager, collabPanel, collabOutputChannel, collabStatusBar);
    // Setup collaboration event listeners
    collaborationEngine.on('session-started', () => {
        collabStatusBar.text = "$(radio-tower) Collab: Connected";
        collabStatusBar.backgroundColor = undefined;
    });
    collaborationEngine.on('session-ended', () => {
        collabStatusBar.text = "$(radio-tower) Collab: Offline";
    });
    collaborationEngine.on('participant-joined', () => {
        const session = collaborationEngine.getCurrentSession();
        const count = session?.participants.size ?? 0;
        collabStatusBar.text = `$(radio-tower) Collab: ${count} online`;
    });
    // Register language providers
    const codeLensProvider = new CodeLensProvider_1.CodeLensProvider(client);
    const inlineCompletionProvider = new InlineCompletionProvider_1.InlineCompletionProvider(client, authManager);
    const hoverProvider = new HoverProvider_1.HoverProvider(client);
    const codeActionsProvider = new CodeActionsProvider_1.CodeActionsProvider(client);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ pattern: '**/*' }, codeLensProvider), vscode.languages.registerInlineCompletionItemProvider({ pattern: '**/*' }, inlineCompletionProvider), vscode.languages.registerHoverProvider({ pattern: '**/*' }, hoverProvider), vscode.languages.registerCodeActionsProvider({ pattern: '**/*' }, codeActionsProvider));
    // Initialize command handler
    const commandHandler = new CommandHandler_1.CommandHandler(context, client, authManager, hudManager, agentStatusBar, predictiveAssistant);
    // Register all commands
    registerCommands(context, commandHandler);
    // Initialize WebSocket connection if authenticated
    if (await authManager.isAuthenticated()) {
        await client.connect();
        await predictiveAssistant.start();
    }
    // Show welcome message for first-time users
    const hasShownWelcome = context.globalState.get('MindHive.hasShownWelcome');
    if (!hasShownWelcome) {
        showWelcomeMessage(context);
        context.globalState.update('MindHive.hasShownWelcome', true);
    }
    // Start HUD if enabled
    const config = vscode.workspace.getConfiguration('MindHive');
    if (config.get('showInlineInsights')) {
        hudManager.show();
    }
    console.log('✅ MindHive ready');
}
function registerCommands(context, handler) {
    const commands = [
        vscode.commands.registerCommand('MindHive.ask', () => handler.askMindHive()),
        vscode.commands.registerCommand('MindHive.chat', () => vscode.commands.executeCommand('workbench.view.extension.mindhive-sidebar')),
        vscode.commands.registerCommand('MindHive.inlineChat', () => inlineChatWidget.start()),
        vscode.commands.registerCommand('MindHive.quickEdit', () => quickEditWidget.start()),
        vscode.commands.registerCommand('MindHive.cancelQuickEdit', () => quickEditWidget.cancel()),
        vscode.commands.registerCommand('MindHive.terminalCommand', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'What do you want to do?',
                placeHolder: 'e.g., "install dependencies", "run tests"'
            });
            if (input)
                await terminalManager.executeNaturalLanguage(input);
        }),
        vscode.commands.registerCommand('MindHive.explainCommand', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter command to explain',
                placeHolder: 'e.g., "git rebase -i HEAD~3"'
            });
            if (input)
                await terminalManager.explainCommand(input);
        }),
        vscode.commands.registerCommand('MindHive.commandHistory', () => terminalManager.showCommandHistory()),
        vscode.commands.registerCommand('MindHive.buildSequence', () => terminalManager.buildCommandSequence()),
        // Agent Mode Commands
        vscode.commands.registerCommand('MindHive.agentMode', async () => {
            const input = await vscode.window.showInputBox({
                prompt: '🤖 What would you like the agent to do?',
                placeHolder: 'e.g., "Add user authentication", "Fix all failing tests", "Refactor this file"',
                ignoreFocusOut: true
            });
            if (input) {
                try {
                    await agentOrchestrator.executeAgentRequest(input, {
                        requireApproval: true,
                        runTests: true,
                        autoCommit: false
                    });
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Agent failed: ${error}`);
                }
            }
        }),
        vscode.commands.registerCommand('MindHive.agentQuick', async () => {
            const input = await vscode.window.showInputBox({
                prompt: '⚡ Quick Agent Task (no approval needed)',
                placeHolder: 'e.g., "Add JSDoc to this function", "Fix this bug"'
            });
            if (input) {
                await agentOrchestrator.executeAgentRequest(input, {
                    requireApproval: false,
                    runTests: false
                });
            }
        }),
        vscode.commands.registerCommand('MindHive.showAgentPanel', () => {
            const session = agentOrchestrator.getCurrentSession();
            if (session) {
                vscode.window.showInformationMessage(`Agent Status: ${session.status}\nTasks: ${session.tasks.filter(t => t.status === 'completed').length}/${session.tasks.length} completed`);
            }
            else {
                vscode.window.showInformationMessage('No active agent session. Use "Agent Mode" to start!');
            }
        }),
        vscode.commands.registerCommand('MindHive.agentCapabilities', () => {
            const capabilities = agentOrchestrator.getCapabilities();
            const enabledCount = capabilities.filter(c => c.enabled).length;
            vscode.window.showInformationMessage(`🤖 Agent has ${enabledCount} capabilities enabled:\n\n${capabilities.filter(c => c.enabled).map(c => `✅ ${c.name}`).join('\n')}`);
        }),
        // Browser Preview Commands
        vscode.commands.registerCommand('mindhive.openPreview', async () => {
            await browserPreview.openPreview({ enableHotReload: true });
        }),
        vscode.commands.registerCommand('mindhive.openPreviewExternal', async () => {
            await browserPreview.openPreview({ openExternal: true, enableHotReload: true });
        }),
        vscode.commands.registerCommand('mindhive.refreshPreview', () => {
            browserPreview.refresh();
        }),
        vscode.commands.registerCommand('mindhive.selectPort', async () => {
            const port = await vscode.window.showInputBox({
                prompt: 'Enter port number',
                placeHolder: '3000',
                validateInput: (value) => {
                    const num = parseInt(value, 10);
                    return (num > 0 && num < 65536) ? null : 'Enter valid port (1-65535)';
                }
            });
            if (port) {
                await browserPreview.changePort(parseInt(port, 10));
            }
        }),
        vscode.commands.registerCommand('mindhive.screenshotPreview', () => {
            browserPreview.takeScreenshot();
        }),
        vscode.commands.registerCommand('mindhive.showPreviewOptions', async () => {
            const choice = await vscode.window.showQuickPick([
                { label: '$(browser) Open Preview', value: 'open' },
                { label: '$(globe) Open in External Browser', value: 'external' },
                { label: '$(refresh) Refresh', value: 'refresh' },
                { label: '$(wrench) Select Port', value: 'port' },
                { label: '$(device-camera) Screenshot', value: 'screenshot' }
            ], { placeHolder: 'Browser Preview Options' });
            if (choice) {
                switch (choice.value) {
                    case 'open':
                        await browserPreview.openPreview({ enableHotReload: true });
                        break;
                    case 'external':
                        await browserPreview.openPreview({ openExternal: true });
                        break;
                    case 'refresh':
                        browserPreview.refresh();
                        break;
                    case 'port':
                        await vscode.commands.executeCommand('mindhive.selectPort');
                        break;
                    case 'screenshot':
                        browserPreview.takeScreenshot();
                        break;
                }
            }
        }),
        // Deployment Commands
        vscode.commands.registerCommand('mindhive.deploy', async () => {
            await deploymentManager.quickDeploy();
        }),
        vscode.commands.registerCommand('mindhive.deployToVercel', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders)
                return;
            await deploymentManager.deploy({
                platform: 'vercel',
                projectPath: workspaceFolders[0].uri.fsPath
            });
        }),
        vscode.commands.registerCommand('mindhive.deployToNetlify', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders)
                return;
            await deploymentManager.deploy({
                platform: 'netlify',
                projectPath: workspaceFolders[0].uri.fsPath
            });
        }),
        vscode.commands.registerCommand('mindhive.deployToRailway', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders)
                return;
            await deploymentManager.deploy({
                platform: 'railway',
                projectPath: workspaceFolders[0].uri.fsPath
            });
        }),
        vscode.commands.registerCommand('mindhive.showDeploymentPanel', async () => {
            await deploymentPanel.show();
        }),
        vscode.commands.registerCommand('mindhive.deploymentHistory', async () => {
            await deploymentManager.showHistory();
        }),
        vscode.commands.registerCommand('mindhive.configureDeploymentTokens', async () => {
            const platform = await vscode.window.showQuickPick([
                { label: 'Vercel', value: 'vercel' },
                { label: 'Netlify', value: 'netlify' },
                { label: 'Railway', value: 'railway' }
            ], { placeHolder: 'Select platform to configure' });
            if (platform) {
                await vscode.commands.executeCommand(`mindhive.configure${platform.label}Token`);
            }
        }),
        vscode.commands.registerCommand('mindhive.showDeploymentOptions', async () => {
            const choice = await vscode.window.showQuickPick([
                { label: '$(rocket) Quick Deploy', value: 'deploy', description: 'Auto-detect and deploy' },
                { label: '$(globe) Deploy to Vercel', value: 'vercel', description: 'Best for Next.js & React' },
                { label: '$(cloud) Deploy to Netlify', value: 'netlify', description: 'Best for static sites' },
                { label: '$(server) Deploy to Railway', value: 'railway', description: 'Best for full-stack' },
                { label: '$(wrench) Show Deployment Panel', value: 'panel', description: 'Interactive deployment UI' },
                { label: '$(history) Deployment History', value: 'history', description: 'View past deployments' },
                { label: '$(key) Configure Tokens', value: 'tokens', description: 'Setup API tokens' }
            ], { placeHolder: 'Deployment Options' });
            if (choice) {
                switch (choice.value) {
                    case 'open':
                        vscode.commands.executeCommand('mindhive.openPreview');
                        break;
                    case 'external':
                        vscode.commands.executeCommand('mindhive.openPreviewExternal');
                        break;
                    case 'refresh':
                        vscode.commands.executeCommand('mindhive.refreshPreview');
                        break;
                    case 'port':
                        vscode.commands.executeCommand('mindhive.selectPort');
                        break;
                    case 'screenshot':
                        vscode.commands.executeCommand('mindhive.screenshotPreview');
                        break;
                }
            }
        }),
        // 🔥 COLLABORATION COMMANDS 🔥
        vscode.commands.registerCommand('mindhive.startCollaboration', async () => {
            const userName = await vscode.window.showInputBox({ prompt: 'Enter your name', placeHolder: 'John Doe' });
            if (!userName)
                return;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders)
                return;
            try {
                await collaborationEngine.startSession({ documentId: workspaceFolders[0].uri.fsPath, userName, enableWebRTC: true, enableIndexedDB: true });
                vscode.window.showInformationMessage('🎉 Collaboration session started!');
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed: ${error.message}`);
            }
        }),
        vscode.commands.registerCommand('mindhive.joinCollaboration', async () => await vscode.commands.executeCommand('mindhive.startCollaboration')),
        vscode.commands.registerCommand('mindhive.leaveCollaboration', async () => {
            await collaborationEngine.leaveSession();
            vscode.window.showInformationMessage('Left collaboration session');
        }),
        vscode.commands.registerCommand('mindhive.showCollabPanel', async () => await collabPanel.show()),
        vscode.commands.registerCommand('mindhive.shareSession', async () => {
            const session = collaborationEngine.getCurrentSession();
            if (!session)
                return vscode.window.showWarningMessage('No active session');
            vscode.env.clipboard.writeText(`mindhive://join/${session.roomName}`);
            vscode.window.showInformationMessage('📋 Session link copied!');
        }),
        vscode.commands.registerCommand('mindhive.showParticipants', async () => {
            const participants = collaborationEngine.getParticipants();
            await vscode.window.showQuickPick(participants.map(p => ({ label: `${p.isOnline ? '🟢' : '⚫'} ${p.name}`, description: p.email })), { placeHolder: 'Participants' });
        }),
        vscode.commands.registerCommand('mindhive.toggleAICollaborator', async () => {
            const config = vscode.workspace.getConfiguration('mindhive.collaboration');
            const enabled = config.get('enableAI', true);
            await config.update('enableAI', !enabled, true);
            vscode.window.showInformationMessage(`🤖 AI Collaborator ${!enabled ? 'enabled' : 'disabled'}`);
        }),
        vscode.commands.registerCommand('mindhive.createComment', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor)
                return;
            const comment = await vscode.window.showInputBox({ prompt: 'Enter comment' });
            if (!comment)
                return;
            vscode.window.showInformationMessage('💬 Comment created!');
        }),
        vscode.commands.registerCommand('mindhive.showComments', async () => {
            const threads = commentManager.getAllThreads();
            await vscode.window.showQuickPick(threads.map(t => ({ label: t.comments[0].author.name, description: t.comments[0].content })), { placeHolder: 'Comments' });
        }),
        vscode.commands.registerCommand('mindhive.resolveThread', async () => vscode.window.showInformationMessage('✅ Thread resolved!')),
        vscode.commands.registerCommand('mindhive.syncNow', async () => { await collaborationEngine.forceSync(); vscode.window.showInformationMessage('🔄 Synced!'); }),
        vscode.commands.registerCommand('mindhive.collabSettings', async () => await vscode.commands.executeCommand('workbench.action.openSettings', 'mindhive.collaboration')),
        vscode.commands.registerCommand('MindHive.generateCode', () => handler.generateCode()),
        vscode.commands.registerCommand('MindHive.verifyCode', () => handler.verifyCode()),
        vscode.commands.registerCommand('MindHive.optimizeCode', () => handler.optimizeCode()),
        vscode.commands.registerCommand('MindHive.fixBug', () => handler.fixBug()),
        vscode.commands.registerCommand('MindHive.timeTravelDebug', () => handler.timeTravelDebug()),
        vscode.commands.registerCommand('MindHive.showInsights', () => handler.showInsights()),
        vscode.commands.registerCommand('MindHive.toggleHUD', () => handler.toggleHUD()),
        vscode.commands.registerCommand('MindHive.showAgentPanel', () => handler.showAgentPanel()),
        vscode.commands.registerCommand('MindHive.showAgentDetails', () => handler.showAgentDetails()),
        vscode.commands.registerCommand('MindHive.toggleAgentStatus', () => handler.toggleAgentStatus()),
        vscode.commands.registerCommand('MindHive.login', () => handler.login()),
        vscode.commands.registerCommand('MindHive.logout', () => handler.logout()),
        vscode.commands.registerCommand('MindHive.openSettings', () => handler.openSettings()),
        vscode.commands.registerCommand('MindHive.applyFix', (fix) => handler.applyFix(fix)),
        vscode.commands.registerCommand('MindHive.dismissAlert', (alert) => handler.dismissAlert(alert)),
        // Code Action Commands
        vscode.commands.registerCommand('mindhive.applyCodeFix', (doc, range, fix, desc) => handler.applyCodeFix(doc, range, fix, desc)),
        vscode.commands.registerCommand('mindhive.generateFix', (doc, range, issue) => handler.generateFix(doc, range, issue)),
        vscode.commands.registerCommand('mindhive.applyPattern', (doc, range, pattern) => handler.applyPattern(doc, range, pattern)),
        vscode.commands.registerCommand('mindhive.simplifyCode', (doc, range) => handler.simplifyCode(doc, range)),
        vscode.commands.registerCommand('mindhive.extractFunction', (doc, range) => handler.extractFunction(doc, range)),
        vscode.commands.registerCommand('mindhive.improveMaintainability', (doc, range) => handler.improveMaintainability(doc, range)),
        vscode.commands.registerCommand('mindhive.addDocumentation', (doc, range) => handler.addDocumentation(doc, range)),
        vscode.commands.registerCommand('mindhive.generateTests', (doc, range) => handler.generateTests(doc, range)),
        vscode.commands.registerCommand('mindhive.explainCode', (doc, range) => handler.explainCode(doc, range)),
        vscode.commands.registerCommand('mindhive.fixAllErrors', (doc, errors) => handler.fixAllErrors(doc, errors))
    ];
    commands.forEach((cmd) => context.subscriptions.push(cmd));
}
async function showWelcomeMessage(context) {
    const result = await vscode.window.showInformationMessage('🧠 Welcome to MindHive! Connect to the collective intelligence network.', 'Sign In', 'Learn More', 'Dismiss');
    if (result === 'Sign In') {
        vscode.commands.executeCommand('MindHive.login');
    }
    else if (result === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://MindHive.dev/docs'));
    }
}
function deactivate() {
    if (client) {
        client.disconnect();
    }
    if (predictiveAssistant) {
        predictiveAssistant.stop();
    }
    console.log('🧠 MindHive deactivated');
}
//# sourceMappingURL=extension.js.map