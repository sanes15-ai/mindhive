import * as vscode from 'vscode';
import { MindHiveClient } from './client/HiveMindClient';
import { AuthManager } from './auth/AuthManager';
import { InsightsProvider } from './views/InsightsProvider';
import { AgentsProvider } from './views/AgentsProvider';
import { AlertsProvider } from './views/AlertsProvider';
import { ChatPanelProvider } from './views/ChatPanelProvider';
import { InlineChatWidget } from './views/InlineChatWidget';
import { QuickEditWidget } from './views/QuickEditWidget';
import { TerminalManager } from './terminal/TerminalManager';
import { AgentOrchestrator } from './agent/AgentOrchestrator';
import { CodeLensProvider } from './providers/CodeLensProvider';
import { InlineCompletionProvider } from './providers/InlineCompletionProvider';
import { HoverProvider } from './providers/HoverProvider';
import { CodeActionsProvider } from './providers/CodeActionsProvider';
import { HUDManager } from './hud/HUDManager';
import { PredictiveAssistant } from './assistant/PredictiveAssistant';
import { CommandHandler } from './commands/CommandHandler';
import { BrowserPreview } from './preview/BrowserPreview';
import { DeploymentManager } from './deployment/DeploymentManager';
import { DeploymentPanel } from './deployment/DeploymentPanel';
import { CollaborationEngine } from './services/collaboration/CollaborationEngine';
import { CursorSync } from './services/collaboration/CursorSync';
import { PresenceManager } from './services/collaboration/PresenceManager';
import { AICollaborator } from './services/collaboration/AICollaborator';
import { CommentThreadManager } from './services/collaboration/CommentThread';
import { CollabPanel } from './collaboration/CollabPanel';
import { AgentStatusBar } from './views/AgentStatusBar';

let client: MindHiveClient;
let authManager: AuthManager;
let hudManager: HUDManager;
let agentStatusBar: AgentStatusBar;
let predictiveAssistant: PredictiveAssistant;
let inlineChatWidget: InlineChatWidget;
let quickEditWidget: QuickEditWidget;
let terminalManager: TerminalManager;
let agentOrchestrator: AgentOrchestrator;
let browserPreview: BrowserPreview;
let deploymentManager: DeploymentManager;
let deploymentPanel: DeploymentPanel;
let collaborationEngine: CollaborationEngine;
let cursorSync: CursorSync;
let presenceManager: PresenceManager;
let aiCollaborator: AICollaborator;
let commentManager: CommentThreadManager;
let collabPanel: CollabPanel;
let collabStatusBar: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  console.log('🧠 MindHive extension activated');

  // Initialize core services
  authManager = new AuthManager(context);
  client = new MindHiveClient(context, authManager);
  hudManager = new HUDManager(context, client);
  agentStatusBar = new AgentStatusBar(context, client);
  predictiveAssistant = new PredictiveAssistant(context, client, authManager);

  // Show agent status bar by default
  agentStatusBar.show();

  // Register view providers
  const insightsProvider = new InsightsProvider(context, client);
  const agentsProvider = new AgentsProvider(context, client);
  const alertsProvider = new AlertsProvider(context, client);
  const chatPanelProvider = new ChatPanelProvider(context.extensionUri, client, authManager);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('MindHive.insights', insightsProvider),
    vscode.window.registerTreeDataProvider('MindHive.agents', agentsProvider),
    vscode.window.registerTreeDataProvider('MindHive.alerts', alertsProvider),
    vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewType, chatPanelProvider)
  );

  // Initialize inline chat widget
  inlineChatWidget = new InlineChatWidget(client);
  context.subscriptions.push(inlineChatWidget);

  // Initialize quick edit widget
  quickEditWidget = new QuickEditWidget(client);
  context.subscriptions.push(quickEditWidget);

  // Initialize terminal manager
  terminalManager = new TerminalManager(client);
  context.subscriptions.push(terminalManager);

  // Initialize agent orchestrator
  agentOrchestrator = new AgentOrchestrator(client);
  context.subscriptions.push(agentOrchestrator);

  // Initialize browser preview
  const outputChannel = vscode.window.createOutputChannel('MindHive Preview');
  browserPreview = new BrowserPreview(outputChannel);
  context.subscriptions.push(browserPreview);
  context.subscriptions.push(outputChannel);

  // Initialize deployment manager
  const deploymentOutputChannel = vscode.window.createOutputChannel('MindHive Deployment');
  deploymentManager = new DeploymentManager(deploymentOutputChannel);
  deploymentPanel = new DeploymentPanel(context, deploymentManager);
  context.subscriptions.push(deploymentManager);
  context.subscriptions.push(deploymentPanel);
  context.subscriptions.push(deploymentOutputChannel);

  // Initialize collaboration system 🔥
  const collabOutputChannel = vscode.window.createOutputChannel('MindHive Collaboration');
  collaborationEngine = new CollaborationEngine();
  cursorSync = new CursorSync();
  presenceManager = new PresenceManager();
  aiCollaborator = new AICollaborator();
  commentManager = new CommentThreadManager();
  collabPanel = new CollabPanel(context, collaborationEngine, presenceManager, aiCollaborator, commentManager);
  
  // Create collaboration status bar item
  collabStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  collabStatusBar.text = "$(radio-tower) Collab: Offline";
  collabStatusBar.command = 'mindhive.showCollabPanel';
  collabStatusBar.show();
  
  context.subscriptions.push(
    collaborationEngine,
    cursorSync,
    presenceManager,
    aiCollaborator,
    commentManager,
    collabPanel,
    collabOutputChannel,
    collabStatusBar
  );
  
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
  const codeLensProvider = new CodeLensProvider(client);
  const inlineCompletionProvider = new InlineCompletionProvider(client, authManager);
  const hoverProvider = new HoverProvider(client);
  const codeActionsProvider = new CodeActionsProvider(client);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ pattern: '**/*' }, codeLensProvider),
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**/*' },
      inlineCompletionProvider
    ),
    vscode.languages.registerHoverProvider({ pattern: '**/*' }, hoverProvider),
    vscode.languages.registerCodeActionsProvider(
      { pattern: '**/*' },
      codeActionsProvider
    )
  );

  // Initialize command handler
  const commandHandler = new CommandHandler(
    context,
    client,
    authManager,
    hudManager,
    agentStatusBar,
    predictiveAssistant
  );

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

function registerCommands(
  context: vscode.ExtensionContext,
  handler: CommandHandler
) {
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
      if (input) await terminalManager.executeNaturalLanguage(input);
    }),
    vscode.commands.registerCommand('MindHive.explainCommand', async () => {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter command to explain',
        placeHolder: 'e.g., "git rebase -i HEAD~3"'
      });
      if (input) await terminalManager.explainCommand(input);
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
        } catch (error) {
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
        vscode.window.showInformationMessage(
          `Agent Status: ${session.status}\nTasks: ${session.tasks.filter(t => t.status === 'completed').length}/${session.tasks.length} completed`
        );
      } else {
        vscode.window.showInformationMessage('No active agent session. Use "Agent Mode" to start!');
      }
    }),
    vscode.commands.registerCommand('MindHive.agentCapabilities', () => {
      const capabilities = agentOrchestrator.getCapabilities();
      const enabledCount = capabilities.filter(c => c.enabled).length;
      vscode.window.showInformationMessage(
        `🤖 Agent has ${enabledCount} capabilities enabled:\n\n${capabilities.filter(c => c.enabled).map(c => `✅ ${c.name}`).join('\n')}`
      );
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
          case 'open': await browserPreview.openPreview({ enableHotReload: true }); break;
          case 'external': await browserPreview.openPreview({ openExternal: true }); break;
          case 'refresh': browserPreview.refresh(); break;
          case 'port': await vscode.commands.executeCommand('mindhive.selectPort'); break;
          case 'screenshot': browserPreview.takeScreenshot(); break;
        }
      }
    }),

    // Deployment Commands
    vscode.commands.registerCommand('mindhive.deploy', async () => {
      await deploymentManager.quickDeploy();
    }),
    vscode.commands.registerCommand('mindhive.deployToVercel', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;
      
      await deploymentManager.deploy({
        platform: 'vercel',
        projectPath: workspaceFolders[0].uri.fsPath
      });
    }),
    vscode.commands.registerCommand('mindhive.deployToNetlify', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;
      
      await deploymentManager.deploy({
        platform: 'netlify',
        projectPath: workspaceFolders[0].uri.fsPath
      });
    }),
    vscode.commands.registerCommand('mindhive.deployToRailway', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;
      
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
      const platform = await vscode.window.showQuickPick(
        [
          { label: 'Vercel', value: 'vercel' },
          { label: 'Netlify', value: 'netlify' },
          { label: 'Railway', value: 'railway' }
        ],
        { placeHolder: 'Select platform to configure' }
      );
      
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
          case 'open': vscode.commands.executeCommand('mindhive.openPreview'); break;
          case 'external': vscode.commands.executeCommand('mindhive.openPreviewExternal'); break;
          case 'refresh': vscode.commands.executeCommand('mindhive.refreshPreview'); break;
          case 'port': vscode.commands.executeCommand('mindhive.selectPort'); break;
          case 'screenshot': vscode.commands.executeCommand('mindhive.screenshotPreview'); break;
        }
      }
    }),

    // 🔥 COLLABORATION COMMANDS 🔥
    vscode.commands.registerCommand('mindhive.startCollaboration', async () => {
      const userName = await vscode.window.showInputBox({ prompt: 'Enter your name', placeHolder: 'John Doe' });
      if (!userName) return;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;
      try {
        await collaborationEngine.startSession({ documentId: workspaceFolders[0].uri.fsPath, userName, enableWebRTC: true, enableIndexedDB: true });
        vscode.window.showInformationMessage('🎉 Collaboration session started!');
      } catch (error: any) { vscode.window.showErrorMessage(`Failed: ${error.message}`); }
    }),
    vscode.commands.registerCommand('mindhive.joinCollaboration', async () => await vscode.commands.executeCommand('mindhive.startCollaboration')),
    vscode.commands.registerCommand('mindhive.leaveCollaboration', async () => {
      await collaborationEngine.leaveSession();
      vscode.window.showInformationMessage('Left collaboration session');
    }),
    vscode.commands.registerCommand('mindhive.showCollabPanel', async () => await collabPanel.show()),
    vscode.commands.registerCommand('mindhive.shareSession', async () => {
      const session = collaborationEngine.getCurrentSession();
      if (!session) return vscode.window.showWarningMessage('No active session');
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
      if (!editor) return;
      const comment = await vscode.window.showInputBox({ prompt: 'Enter comment' });
      if (!comment) return;
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

async function showWelcomeMessage(context: vscode.ExtensionContext) {
  const result = await vscode.window.showInformationMessage(
    '🧠 Welcome to MindHive! Connect to the collective intelligence network.',
    'Sign In',
    'Learn More',
    'Dismiss'
  );

  if (result === 'Sign In') {
    vscode.commands.executeCommand('MindHive.login');
  } else if (result === 'Learn More') {
    vscode.env.openExternal(vscode.Uri.parse('https://MindHive.dev/docs'));
  }
}

export function deactivate() {
  if (client) {
    client.disconnect();
  }
  if (predictiveAssistant) {
    predictiveAssistant.stop();
  }
  console.log('🧠 MindHive deactivated');
}

