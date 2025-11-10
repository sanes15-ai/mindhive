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
exports.AgentStatusBar = void 0;
const vscode = __importStar(require("vscode"));
class AgentStatusBar {
    context;
    client;
    statusItems = new Map();
    updateInterval;
    mainStatusItem;
    isVisible = false;
    agentConfig = [
        { id: 'codegen', name: 'CodeGen', icon: '🤖', priority: 100 },
        { id: 'sentinel', name: 'Sentinel', icon: '🛡️', priority: 99 },
        { id: 'optimizer', name: 'Optimizer', icon: '⚡', priority: 98 },
        { id: 'security', name: 'Security', icon: '🔒', priority: 97 },
        { id: 'oracle', name: 'Oracle', icon: '🔮', priority: 96 },
    ];
    constructor(context, client) {
        this.context = context;
        this.client = client;
        // Create main status item (shows total active agents)
        this.mainStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101);
        this.mainStatusItem.command = 'mindhive.showAgentPanel';
        this.mainStatusItem.tooltip = 'Click to view agent details';
        context.subscriptions.push(this.mainStatusItem);
        // Create individual status items for each agent
        this.agentConfig.forEach(config => {
            const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, config.priority);
            statusBarItem.command = 'mindhive.showAgentDetails';
            statusBarItem.text = `${config.icon} ${config.name}`;
            this.statusItems.set(config.id, {
                agent: {
                    agentId: config.id,
                    name: config.name,
                    status: 'idle',
                },
                statusBarItem,
            });
            context.subscriptions.push(statusBarItem);
        });
        // Listen for agent events from WebSocket
        this.client.onEvent((event) => {
            if (event.type === 'agent:status') {
                this.updateAgentStatus(event.data);
            }
        });
    }
    /**
     * Show agent status bar items
     */
    show() {
        this.isVisible = true;
        this.mainStatusItem.show();
        this.statusItems.forEach(item => item.statusBarItem.show());
        this.startRealtimeUpdates();
    }
    /**
     * Hide agent status bar items
     */
    hide() {
        this.isVisible = false;
        this.mainStatusItem.hide();
        this.statusItems.forEach(item => item.statusBarItem.hide());
        this.stopRealtimeUpdates();
    }
    /**
     * Toggle agent status bar visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    /**
     * Start real-time status updates
     */
    startRealtimeUpdates() {
        this.stopRealtimeUpdates();
        // Initial update
        this.updateAllAgents();
        // Update every 2 seconds
        this.updateInterval = setInterval(() => {
            this.updateAllAgents();
        }, 2000);
    }
    /**
     * Stop real-time updates
     */
    stopRealtimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }
    /**
     * Fetch and update all agent statuses
     */
    async updateAllAgents() {
        if (!this.isVisible) {
            return;
        }
        try {
            const agents = await this.client.getAgentStatus();
            // Update each agent
            agents.forEach(agent => {
                this.updateAgentStatus(agent);
            });
            // Update main status item with active count
            const activeCount = agents.filter(a => a.status === 'processing').length;
            this.updateMainStatus(activeCount, agents.length);
        }
        catch (error) {
            console.error('Failed to fetch agent status:', error);
        }
    }
    /**
     * Update individual agent status
     */
    updateAgentStatus(agent) {
        const item = this.statusItems.get(agent.agentId);
        if (!item) {
            return;
        }
        // Update stored agent data
        item.agent = agent;
        // Get agent config
        const config = this.agentConfig.find(c => c.id === agent.agentId);
        if (!config) {
            return;
        }
        // Build status text with color coding
        let text = `${config.icon} ${config.name}`;
        let color = undefined;
        let tooltip = `${config.name} Agent`;
        switch (agent.status) {
            case 'processing':
                text += ' $(sync~spin)';
                color = new vscode.ThemeColor('statusBarItem.warningForeground');
                tooltip += ` - ACTIVE${agent.currentTask ? ': ' + agent.currentTask : ''}`;
                if (agent.confidence) {
                    tooltip += `\nConfidence: ${Math.round(agent.confidence * 100)}%`;
                }
                break;
            case 'error':
                text += ' $(error)';
                color = new vscode.ThemeColor('statusBarItem.errorForeground');
                tooltip += ' - ERROR';
                break;
            case 'idle':
            default:
                text += ' $(circle-outline)';
                color = new vscode.ThemeColor('statusBarItem.foreground');
                tooltip += ' - Idle';
                break;
        }
        // Update status bar item
        item.statusBarItem.text = text;
        item.statusBarItem.color = color;
        item.statusBarItem.tooltip = tooltip;
    }
    /**
     * Update main status item showing total agent activity
     */
    updateMainStatus(activeCount, totalCount) {
        let text = '🧠 Agents';
        let color = undefined;
        let tooltip = 'MindHive Agents';
        if (activeCount > 0) {
            text += ` (${activeCount} active)`;
            color = new vscode.ThemeColor('statusBarItem.warningForeground');
            tooltip += `\n${activeCount} of ${totalCount} agents are currently processing`;
        }
        else {
            text += ' (idle)';
            tooltip += '\nAll agents idle - Click to view details';
        }
        this.mainStatusItem.text = text;
        this.mainStatusItem.color = color;
        this.mainStatusItem.tooltip = tooltip;
    }
    /**
     * Show detailed agent information in quick pick
     */
    async showAgentDetails() {
        const items = [];
        this.statusItems.forEach((item, agentId) => {
            const config = this.agentConfig.find(c => c.id === agentId);
            if (!config) {
                return;
            }
            let description = '';
            let detail = '';
            switch (item.agent.status) {
                case 'processing':
                    description = '$(sync~spin) ACTIVE';
                    detail = item.agent.currentTask || 'Processing...';
                    if (item.agent.confidence) {
                        detail += ` (${Math.round(item.agent.confidence * 100)}% confidence)`;
                    }
                    break;
                case 'error':
                    description = '$(error) ERROR';
                    detail = 'Agent encountered an error';
                    break;
                case 'idle':
                default:
                    description = '$(circle-outline) Idle';
                    detail = 'Waiting for tasks';
                    break;
            }
            items.push({
                label: `${config.icon} ${config.name} Agent`,
                description,
                detail,
            });
        });
        // Add overall status
        const activeCount = Array.from(this.statusItems.values())
            .filter(i => i.agent.status === 'processing').length;
        items.unshift({
            label: '$(info) Overall Status',
            description: activeCount > 0 ? `${activeCount} active` : 'All idle',
            detail: `${this.statusItems.size} agents monitoring your code`,
        });
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Agent Status Overview',
            ignoreFocusOut: true,
        });
        if (selected) {
            // Could show more detailed info or trigger agent actions
            vscode.window.showInformationMessage(selected.detail || 'No additional information');
        }
    }
    /**
     * Send notification when agent starts/completes task
     */
    async notifyAgentActivity(agent, started) {
        const config = this.agentConfig.find(c => c.id === agent.agentId);
        if (!config) {
            return;
        }
        const message = started
            ? `${config.icon} ${config.name} started: ${agent.currentTask}`
            : `${config.icon} ${config.name} completed task`;
        // Show notification in bottom-right
        const action = await vscode.window.showInformationMessage(message, 'View Details', 'Dismiss');
        if (action === 'View Details') {
            this.showAgentDetails();
        }
    }
    /**
     * Get current status of specific agent
     */
    getAgentStatus(agentId) {
        return this.statusItems.get(agentId)?.agent;
    }
    /**
     * Get all agent statuses
     */
    getAllStatuses() {
        return Array.from(this.statusItems.values()).map(item => item.agent);
    }
}
exports.AgentStatusBar = AgentStatusBar;
//# sourceMappingURL=AgentStatusBar.js.map