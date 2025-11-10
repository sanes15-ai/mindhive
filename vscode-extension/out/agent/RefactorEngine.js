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
exports.RefactorEngine = void 0;
const vscode = __importStar(require("vscode"));
class RefactorEngine {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Execute refactoring operation
     */
    async refactor(type, params) {
        switch (type) {
            case 'rename':
                await this.renameSymbol(params.symbol, params.newName);
                break;
            case 'extract-function':
                await this.extractFunction(params.range, params.name);
                break;
            case 'extract-class':
                await this.extractClass(params.methods, params.className);
                break;
            case 'move-file':
                await this.moveFile(params.source, params.destination);
                break;
            default:
                throw new Error(`Unknown refactor type: ${type}`);
        }
    }
    /**
     * Rename symbol
     */
    async renameSymbol(symbol, newName) {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        // Find symbol at current position
        const position = editor.selection.active;
        const document = editor.document;
        // Use VS Code's rename provider
        const workspaceEdit = await vscode.commands.executeCommand('vscode.executeDocumentRenameProvider', document.uri, position, newName);
        if (workspaceEdit) {
            await vscode.workspace.applyEdit(workspaceEdit);
        }
    }
    /**
     * Extract function
     */
    async extractFunction(range, name) {
        // This would use VS Code's refactoring API
        await vscode.commands.executeCommand('editor.action.extractFunction', { range, name });
    }
    /**
     * Extract class
     */
    async extractClass(methods, className) {
        // Complex refactoring - would need full implementation
        vscode.window.showInformationMessage(`Extract class: ${className}`);
    }
    /**
     * Move file
     */
    async moveFile(source, destination) {
        const sourceUri = vscode.Uri.file(source);
        const destUri = vscode.Uri.file(destination);
        await vscode.workspace.fs.rename(sourceUri, destUri);
        // Update imports (simplified)
        vscode.window.showInformationMessage(`Moved ${source} to ${destination}`);
    }
}
exports.RefactorEngine = RefactorEngine;
//# sourceMappingURL=RefactorEngine.js.map