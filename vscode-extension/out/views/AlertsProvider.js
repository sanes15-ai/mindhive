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
exports.AlertsProvider = void 0;
const vscode = __importStar(require("vscode"));
class AlertsProvider {
    context;
    client;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    alerts = [];
    constructor(context, client) {
        this.context = context;
        this.client = client;
        this.refresh();
        // Listen for new alerts
        client.onEvent((event) => {
            if (event.type === 'alert:new') {
                this.addAlert(event.data);
            }
        });
        // Refresh periodically
        setInterval(() => this.refresh(), 10000);
    }
    refresh() {
        this.loadAlerts();
        this._onDidChangeTreeData.fire();
    }
    async loadAlerts() {
        try {
            this.alerts = await this.client.getAlerts();
        }
        catch (error) {
            this.alerts = [];
        }
    }
    addAlert(alert) {
        this.alerts.unshift(alert);
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            if (this.alerts.length === 0) {
                const item = new AlertItem('No alerts', vscode.TreeItemCollapsibleState.None, null);
                item.description = '✅';
                return [item];
            }
            return this.alerts.map(alert => {
                const item = new AlertItem(alert.title, vscode.TreeItemCollapsibleState.None, alert);
                item.description = this.getSeverityEmoji(alert.severity);
                item.tooltip = alert.description;
                if (alert.suggestedFix) {
                    item.command = {
                        command: 'MindHive.applyFix',
                        title: 'Apply Fix',
                        arguments: [alert]
                    };
                }
                return item;
            });
        }
        return [];
    }
    getSeverityEmoji(severity) {
        switch (severity) {
            case 'critical': return '🔴 Critical';
            case 'high': return '🟠 High';
            case 'medium': return '🟡 Medium';
            case 'low': return '🟢 Low';
            default: return '⚪ Unknown';
        }
    }
}
exports.AlertsProvider = AlertsProvider;
class AlertItem extends vscode.TreeItem {
    label;
    collapsibleState;
    alert;
    constructor(label, collapsibleState, alert) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.alert = alert;
    }
}
//# sourceMappingURL=AlertsProvider.js.map