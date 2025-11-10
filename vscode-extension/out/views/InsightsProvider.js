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
exports.InsightsProvider = void 0;
const vscode = __importStar(require("vscode"));
class InsightsProvider {
    context;
    client;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    insights = [];
    constructor(context, client) {
        this.context = context;
        this.client = client;
        this.refresh();
        // Listen for new insights
        client.onEvent((event) => {
            if (event.type === 'insight:new' || event.type === 'pattern:new') {
                this.refresh();
            }
        });
    }
    refresh() {
        this.loadInsights();
        this._onDidChangeTreeData.fire();
    }
    async loadInsights() {
        try {
            this.insights = await this.client.getCollectiveInsights();
        }
        catch (error) {
            this.insights = [];
        }
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show categories
            return [
                new InsightItem('Trending Patterns', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'trending'),
                new InsightItem('Deprecations', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'deprecations'),
                new InsightItem('Best Practices', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'best-practices'),
                new InsightItem('Recent Insights', vscode.TreeItemCollapsibleState.Collapsed, 'category', 'recent'),
            ];
        }
        if (element.type === 'category') {
            return this.getCategoryChildren(element.category);
        }
        return [];
    }
    async getCategoryChildren(category) {
        const filtered = this.insights.filter(i => i.type === category || category === 'recent');
        return filtered.slice(0, 10).map(insight => {
            const item = new InsightItem(insight.title || insight.content, vscode.TreeItemCollapsibleState.None, 'insight');
            item.description = insight.confidence ? `${Math.round(insight.confidence * 100)}%` : '';
            item.tooltip = insight.description || insight.content;
            item.command = {
                command: 'MindHive.showInsightDetail',
                title: 'Show Detail',
                arguments: [insight]
            };
            return item;
        });
    }
}
exports.InsightsProvider = InsightsProvider;
class InsightItem extends vscode.TreeItem {
    label;
    collapsibleState;
    type;
    category;
    constructor(label, collapsibleState, type, category) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.category = category;
    }
}
//# sourceMappingURL=InsightsProvider.js.map