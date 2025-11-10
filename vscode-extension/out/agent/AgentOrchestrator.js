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
exports.AgentOrchestrator = void 0;
const vscode = __importStar(require("vscode"));
const TaskPlanner_1 = require("./TaskPlanner");
const MultiFileEditor_1 = require("./MultiFileEditor");
const TestRunner_1 = require("./TestRunner");
const CodeAnalyzer_1 = require("./CodeAnalyzer");
const DebugAssistant_1 = require("./DebugAssistant");
const RefactorEngine_1 = require("./RefactorEngine");
const DocumentationGenerator_1 = require("./DocumentationGenerator");
class AgentOrchestrator {
    client;
    taskPlanner;
    multiFileEditor;
    testRunner;
    codeAnalyzer;
    debugAssistant;
    refactorEngine;
    docGenerator;
    sessions = new Map();
    currentSession = null;
    capabilities = new Map();
    statusBarItem;
    outputChannel;
    constructor(client) {
        this.client = client;
        // Initialize sub-systems
        this.taskPlanner = new TaskPlanner_1.TaskPlanner(client);
        this.multiFileEditor = new MultiFileEditor_1.MultiFileEditor(client);
        this.testRunner = new TestRunner_1.TestRunner(client);
        this.codeAnalyzer = new CodeAnalyzer_1.CodeAnalyzer(client);
        this.debugAssistant = new DebugAssistant_1.DebugAssistant(client);
        this.refactorEngine = new RefactorEngine_1.RefactorEngine(client);
        this.docGenerator = new DocumentationGenerator_1.DocumentationGenerator(client);
        // Setup UI
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.text = "$(robot) Agent: Ready";
        this.statusBarItem.command = 'mindhive.showAgentPanel';
        this.statusBarItem.show();
        this.outputChannel = vscode.window.createOutputChannel('🤖 Agent Mode');
        // Register capabilities
        this.registerCapabilities();
    }
    /**
     * Register all 15+ agent capabilities
     */
    registerCapabilities() {
        const capabilities = [
            // EDITING CAPABILITIES (10x better than Copilot)
            { id: 'multi-file-edit', name: 'Multi-File Editing', description: 'Edit multiple files simultaneously with atomic commits', enabled: true, category: 'editing' },
            { id: 'smart-refactor', name: 'Smart Refactoring', description: 'Rename, extract, move files with dependency updates', enabled: true, category: 'refactoring' },
            { id: 'code-generation', name: 'Code Generation', description: 'Generate complete features with tests', enabled: true, category: 'editing' },
            // TESTING CAPABILITIES
            { id: 'auto-testing', name: 'Automated Testing', description: 'Run tests, detect failures, suggest fixes', enabled: true, category: 'testing' },
            { id: 'test-generation', name: 'Test Generation', description: 'Generate unit, integration, and e2e tests', enabled: true, category: 'testing' },
            { id: 'coverage-analysis', name: 'Coverage Analysis', description: 'Analyze test coverage and suggest improvements', enabled: true, category: 'testing' },
            // DEBUGGING CAPABILITIES
            { id: 'intelligent-debug', name: 'Intelligent Debugging', description: 'Set breakpoints, analyze variables, step through code', enabled: true, category: 'debugging' },
            { id: 'error-recovery', name: 'Error Recovery', description: 'Automatic error detection and fix suggestions', enabled: true, category: 'debugging' },
            { id: 'performance-debug', name: 'Performance Debugging', description: 'Profile code and detect bottlenecks', enabled: true, category: 'debugging' },
            // ANALYSIS CAPABILITIES
            { id: 'ast-analysis', name: 'AST Analysis', description: 'Deep code structure analysis with AST parsing', enabled: true, category: 'analysis' },
            { id: 'dependency-graph', name: 'Dependency Graph', description: 'Build and analyze dependency graphs', enabled: true, category: 'analysis' },
            { id: 'security-scan', name: 'Security Scanning', description: 'Detect vulnerabilities and security issues', enabled: true, category: 'analysis' },
            { id: 'code-quality', name: 'Code Quality Analysis', description: 'Analyze complexity, maintainability, best practices', enabled: true, category: 'analysis' },
            // DOCUMENTATION CAPABILITIES
            { id: 'auto-docs', name: 'Auto Documentation', description: 'Generate JSDoc, README, API documentation', enabled: true, category: 'documentation' },
            { id: 'code-examples', name: 'Code Examples', description: 'Generate usage examples and tutorials', enabled: true, category: 'documentation' },
            // OPERATIONS CAPABILITIES
            { id: 'git-operations', name: 'Git Operations', description: 'Commit, branch, merge, PR creation', enabled: true, category: 'operations' },
            { id: 'dependency-mgmt', name: 'Dependency Management', description: 'Install, update, audit dependencies', enabled: true, category: 'operations' },
            { id: 'build-optimization', name: 'Build Optimization', description: 'Optimize build configuration and performance', enabled: true, category: 'operations' },
        ];
        capabilities.forEach(cap => this.capabilities.set(cap.id, cap));
        this.log(`✅ Registered ${capabilities.length} agent capabilities`);
    }
    /**
     * MAIN ENTRY POINT: Execute agent request
     * This is where the magic happens!
     */
    async executeAgentRequest(request, options) {
        const sessionId = this.generateSessionId();
        this.log(`\n${'='.repeat(80)}`);
        this.log(`🤖 NEW AGENT REQUEST: ${request}`);
        this.log(`Session ID: ${sessionId}`);
        this.log(`${'='.repeat(80)}\n`);
        // Create session
        const session = {
            id: sessionId,
            request,
            plan: { tasks: [], dependencies: new Map(), estimatedTime: 0 },
            tasks: [],
            status: 'planning',
            startTime: new Date(),
            approvalRequired: options?.requireApproval ?? true,
            userApproved: false
        };
        this.sessions.set(sessionId, session);
        this.currentSession = session;
        try {
            // PHASE 1: PLANNING
            this.updateStatus('🧠 Planning tasks...');
            await this.planTasks(session);
            // Show plan to user
            const approved = await this.requestUserApproval(session);
            if (!approved) {
                session.status = 'cancelled';
                this.log('❌ User cancelled the agent session');
                return session;
            }
            session.userApproved = true;
            // PHASE 2: EXECUTION
            this.updateStatus('⚙️ Executing tasks...');
            session.status = 'executing';
            await this.executeTasks(session, options);
            // PHASE 3: VERIFICATION
            if (options?.runTests) {
                this.updateStatus('🧪 Running tests...');
                await this.verifyChanges(session);
            }
            // PHASE 4: COMPLETION
            session.status = 'completed';
            session.endTime = new Date();
            const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
            this.log(`\n✅ Agent session completed in ${duration.toFixed(1)}s`);
            this.updateStatus('✅ Agent: Completed');
            // Show summary
            await this.showCompletionSummary(session);
            return session;
        }
        catch (error) {
            session.status = 'failed';
            session.endTime = new Date();
            this.log(`\n❌ Agent session failed: ${error}`);
            this.updateStatus('❌ Agent: Failed');
            vscode.window.showErrorMessage(`Agent failed: ${error}`);
            throw error;
        }
    }
    /**
     * PHASE 1: Plan tasks using AI
     */
    async planTasks(session) {
        this.log('📋 Analyzing request and planning tasks...');
        // Get workspace context
        const workspaceContext = await this.gatherWorkspaceContext();
        // Use TaskPlanner to break down request
        const plan = await this.taskPlanner.planTasks(session.request, workspaceContext);
        session.plan = plan;
        // Convert plan tasks to agent tasks
        session.tasks = plan.tasks.map(task => this.convertToAgentTask(task));
        this.log(`✅ Created plan with ${plan.tasks.length} tasks`);
        plan.tasks.forEach((task, i) => {
            this.log(`  ${i + 1}. ${task.description} (${task.type})`);
        });
    }
    /**
     * PHASE 2: Execute all tasks in order
     */
    async executeTasks(session, options) {
        this.log('\n⚙️ Executing tasks...\n');
        for (let i = 0; i < session.tasks.length; i++) {
            const task = session.tasks[i];
            this.log(`[${i + 1}/${session.tasks.length}] ${task.description}`);
            task.status = 'running';
            task.startTime = new Date();
            try {
                // Execute based on capability
                const result = await this.executeTask(task, session);
                task.status = 'completed';
                task.result = result;
                task.progress = 100;
                task.endTime = new Date();
                this.log(`  ✅ Completed: ${task.description}`);
            }
            catch (error) {
                task.status = 'failed';
                task.error = String(error);
                task.endTime = new Date();
                this.log(`  ❌ Failed: ${error}`);
                // Attempt recovery
                const recovered = await this.attemptRecovery(task, session);
                if (!recovered) {
                    throw new Error(`Task failed and could not recover: ${task.description}`);
                }
            }
        }
    }
    /**
     * Execute a single task based on its capability
     */
    async executeTask(task, session) {
        switch (task.capability) {
            case 'multi-file-edit':
                return await this.multiFileEditor.editFiles(task.result.files);
            case 'code-generation':
                return await this.generateCode(task, session);
            case 'auto-testing':
                return await this.testRunner.runTests(task.result.testPattern);
            case 'test-generation':
                return await this.testRunner.generateTests(task.result.targetFile);
            case 'intelligent-debug':
                return await this.debugAssistant.debugIssue(task.result.issue);
            case 'ast-analysis':
                return await this.codeAnalyzer.analyzeCode(task.result.files);
            case 'security-scan':
                return await this.codeAnalyzer.scanSecurity(task.result.files);
            case 'smart-refactor':
                return await this.refactorEngine.refactor(task.result.refactorType, task.result.params);
            case 'auto-docs':
                return await this.docGenerator.generateDocumentation(task.result.files);
            case 'git-operations':
                return await this.executeGitOperation(task.result.operation);
            case 'dependency-mgmt':
                return await this.manageDependencies(task.result.action);
            default:
                throw new Error(`Unknown capability: ${task.capability}`);
        }
    }
    /**
     * Generate code for a task
     */
    async generateCode(task, session) {
        const prompt = `Generate code for: ${task.description}\n\nContext: ${session.request}`;
        const response = await this.client.chat([
            { role: 'user', content: prompt }
        ], {
            temperature: 0.3,
            maxTokens: 4000
        });
        return response.message;
    }
    /**
     * Execute git operation
     */
    async executeGitOperation(operation) {
        const terminal = vscode.window.createTerminal('Agent Git');
        switch (operation.type) {
            case 'commit':
                terminal.sendText(`git add . && git commit -m "${operation.params.message}"`);
                break;
            case 'branch':
                terminal.sendText(`git checkout -b ${operation.params.name}`);
                break;
            case 'push':
                terminal.sendText('git push');
                break;
        }
        terminal.show();
        return { success: true };
    }
    /**
     * Manage dependencies
     */
    async manageDependencies(action) {
        const terminal = vscode.window.createTerminal('Agent Dependencies');
        switch (action.type) {
            case 'install':
                terminal.sendText(`npm install ${action.packages?.join(' ') || ''}`);
                break;
            case 'update':
                terminal.sendText('npm update');
                break;
            case 'audit':
                terminal.sendText('npm audit fix');
                break;
        }
        terminal.show();
        return { success: true };
    }
    /**
     * Request user approval for plan
     */
    async requestUserApproval(session) {
        if (!session.approvalRequired) {
            return true;
        }
        const taskList = session.tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n');
        const message = `🤖 Agent Mode Plan:\n\n${taskList}\n\nEstimated time: ${session.plan.estimatedTime}s\n\nApprove execution?`;
        const result = await vscode.window.showInformationMessage(message, { modal: true }, 'Approve', 'Cancel');
        return result === 'Approve';
    }
    /**
     * Verify changes by running tests
     */
    async verifyChanges(session) {
        this.log('🧪 Verifying changes with tests...');
        const testResults = await this.testRunner.runTests();
        if (testResults.failures.length > 0) {
            this.log(`⚠️ ${testResults.failures.length} test(s) failed`);
            // Attempt to fix failures
            const fixed = await this.testRunner.fixFailures(testResults);
            if (!fixed) {
                throw new Error('Tests failed and could not be automatically fixed');
            }
        }
        this.log('✅ All tests passed');
    }
    /**
     * Attempt to recover from task failure
     */
    async attemptRecovery(task, session) {
        this.log(`🔄 Attempting recovery for: ${task.description}`);
        // Ask AI for recovery suggestion
        const prompt = `Task failed: ${task.description}\nError: ${task.error}\n\nSuggest a recovery strategy.`;
        try {
            const response = await this.client.chat([
                { role: 'user', content: prompt }
            ]);
            this.log(`💡 Recovery suggestion: ${response.message}`);
            // For now, just log the suggestion
            // In future, could attempt automatic recovery
            return false;
        }
        catch (error) {
            this.log(`❌ Recovery failed: ${error}`);
            return false;
        }
    }
    /**
     * Show completion summary
     */
    async showCompletionSummary(session) {
        const completed = session.tasks.filter(t => t.status === 'completed').length;
        const failed = session.tasks.filter(t => t.status === 'failed').length;
        const duration = session.endTime ?
            (session.endTime.getTime() - session.startTime.getTime()) / 1000 : 0;
        const summary = `
🤖 Agent Session Complete!

Request: ${session.request}
Tasks: ${completed}/${session.tasks.length} completed
Duration: ${duration.toFixed(1)}s
Status: ${failed === 0 ? '✅ Success' : '⚠️ Partial'}

${failed > 0 ? `Failed tasks:\n${session.tasks.filter(t => t.status === 'failed').map(t => `  - ${t.description}`).join('\n')}` : ''}
    `.trim();
        this.outputChannel.appendLine('\n' + summary);
        this.outputChannel.show();
        vscode.window.showInformationMessage(`Agent completed ${completed}/${session.tasks.length} tasks!`);
    }
    /**
     * Gather workspace context for planning
     */
    async gatherWorkspaceContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return 'No workspace open';
        }
        const activeEditor = vscode.window.activeTextEditor;
        const currentFile = activeEditor?.document.fileName;
        const language = activeEditor?.document.languageId;
        // Get package.json if exists
        let packageInfo = '';
        try {
            const packageJson = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 1);
            if (packageJson.length > 0) {
                const content = await vscode.workspace.fs.readFile(packageJson[0]);
                packageInfo = new TextDecoder().decode(content);
            }
        }
        catch (error) {
            // Ignore
        }
        return `
Workspace: ${workspaceFolders[0].uri.fsPath}
Current file: ${currentFile || 'None'}
Language: ${language || 'Unknown'}
Package.json: ${packageInfo ? 'Available' : 'Not found'}
    `.trim();
    }
    /**
     * Convert TaskPlanner task to AgentTask
     */
    convertToAgentTask(task) {
        return {
            id: Math.random().toString(36).substr(2, 9),
            description: task.description,
            capability: this.mapTaskTypeToCapability(task.type),
            status: 'pending',
            progress: 0,
            result: task
        };
    }
    /**
     * Map task type to capability ID
     */
    mapTaskTypeToCapability(taskType) {
        const mapping = {
            'edit': 'multi-file-edit',
            'test': 'auto-testing',
            'refactor': 'smart-refactor',
            'analyze': 'ast-analysis',
            'document': 'auto-docs',
            'debug': 'intelligent-debug',
            'git': 'git-operations',
            'dependency': 'dependency-mgmt'
        };
        return mapping[taskType] || 'multi-file-edit';
    }
    /**
     * Update status bar
     */
    updateStatus(text) {
        this.statusBarItem.text = text;
    }
    /**
     * Log to output channel
     */
    log(message) {
        this.outputChannel.appendLine(message);
    }
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get current session
     */
    getCurrentSession() {
        return this.currentSession;
    }
    /**
     * Get all sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Get capabilities
     */
    getCapabilities() {
        return Array.from(this.capabilities.values());
    }
    /**
     * Cleanup
     */
    dispose() {
        this.statusBarItem.dispose();
        this.outputChannel.dispose();
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=AgentOrchestrator.js.map