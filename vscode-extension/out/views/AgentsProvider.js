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
exports.AgentsProvider = void 0;
const vscode = __importStar(require("vscode"));
class AgentsProvider {
    context;
    client;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    agents = [];
    constructor(context, client) {
        this.context = context;
        this.client = client;
        this.refresh();
        // Listen for agent status updates
        client.onEvent((event) => {
            if (event.type === 'agent:status') {
                this.updateAgentStatus(event.data);
            }
        });
        // Refresh periodically
        setInterval(() => this.refresh(), 5000);
    }
    refresh() {
        this.loadAgents();
        this._onDidChangeTreeData.fire();
    }
    async loadAgents() {
        try {
            this.agents = await this.client.getAgentStatus();
        }
        catch (error) {
            this.agents = [];
        }
    }
    updateAgentStatus(status) {
        const index = this.agents.findIndex(a => a.agentId === status.agentId);
        if (index !== -1) {
            this.agents[index] = status;
        }
        else {
            this.agents.push(status);
        }
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Show all agents
            return this.agents.map(agent => {
                const label = agent.status === 'processing' && agent.currentTask
                    ? `${agent.name} (${agent.currentTask})`
                    : agent.name;
                const item = new AgentItem(label, agent);
                item.description = this.getStatusEmoji(agent.status);
                item.tooltip = agent.currentTask || `Status: ${agent.status}`;
                return item;
            });
        }
        return [];
    }
    getStatusEmoji(status) {
        switch (status) {
            case 'idle': return '⚪ Idle';
            case 'processing': return '🟢 Active';
            case 'error': return '🔴 Error';
            default: return '⚫ Unknown';
        }
    }
}
exports.AgentsProvider = AgentsProvider;
class AgentItem extends vscode.TreeItem {
    label;
    agent;
    constructor(label, agent) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.agent = agent;
    }
}
//# sourceMappingURL=AgentsProvider.js.map