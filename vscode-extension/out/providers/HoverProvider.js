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
exports.HoverProvider = void 0;
const vscode = __importStar(require("vscode"));
class HoverProvider {
    client;
    constructor(client) {
        this.client = client;
    }
    async provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }
        const word = document.getText(range);
        // Get line context
        const line = document.lineAt(position.line).text;
        try {
            // Check if this is a package/import
            if (this.isImportLine(line)) {
                const packageName = this.extractPackageName(line);
                if (packageName) {
                    const insights = await this.client.getCollectiveInsights();
                    const packageInsight = insights.find(i => i.content.includes(packageName));
                    if (packageInsight) {
                        return new vscode.Hover(new vscode.MarkdownString(`**MindHive Insight**\n\n${packageInsight.content}`));
                    }
                }
            }
            // Get explanation for the symbol
            const explanation = await this.client.explainCode(word, document.languageId);
            if (explanation) {
                return new vscode.Hover(new vscode.MarkdownString(`**MindHive**\n\n${explanation}`));
            }
        }
        catch (error) {
            // Silent fail
        }
        return null;
    }
    isImportLine(line) {
        return /^import\s+|^from\s+/.test(line.trim());
    }
    extractPackageName(line) {
        const match = line.match(/from\s+['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    }
}
exports.HoverProvider = HoverProvider;
//# sourceMappingURL=HoverProvider.js.map