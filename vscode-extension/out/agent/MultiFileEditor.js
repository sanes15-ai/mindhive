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
exports.MultiFileEditor = void 0;
const vscode = __importStar(require("vscode"));
class MultiFileEditor {
    client;
    transactions = new Map();
    undoStack = [];
    maxUndoStackSize = 50;
    constructor(client) {
        this.client = client;
    }
    /**
     * Edit multiple files atomically
     * Either all edits succeed or all are rolled back
     */
    async editFiles(edits) {
        const transactionId = this.generateTransactionId();
        const transaction = {
            id: transactionId,
            edits,
            timestamp: new Date(),
            backupPaths: new Map(),
            completed: false,
            rolledBack: false
        };
        this.transactions.set(transactionId, transaction);
        const result = {
            success: false,
            filesModified: [],
            filesCreated: [],
            filesDeleted: [],
            errors: [],
            backupId: transactionId
        };
        try {
            // Step 1: Validate all edits
            await this.validateEdits(edits, result);
            if (result.errors.length > 0) {
                throw new Error(`Validation failed: ${result.errors.join(', ')}`);
            }
            // Step 2: Create backups
            await this.createBackups(edits, transaction);
            // Step 3: Show diff preview and request confirmation
            const confirmed = await this.showDiffPreview(edits);
            if (!confirmed) {
                result.errors.push('User cancelled operation');
                return result;
            }
            // Step 4: Execute all edits
            for (const edit of edits) {
                await this.executeEdit(edit, result);
            }
            // Step 5: Verify all changes
            await this.verifyEdits(edits, result);
            // Mark transaction as completed
            transaction.completed = true;
            this.undoStack.push(transaction);
            // Trim undo stack
            if (this.undoStack.length > this.maxUndoStackSize) {
                this.undoStack.shift();
            }
            result.success = true;
            vscode.window.showInformationMessage(`✅ Successfully edited ${result.filesModified.length + result.filesCreated.length} file(s)`);
            return result;
        }
        catch (error) {
            // Rollback all changes
            result.errors.push(String(error));
            await this.rollback(transaction);
            vscode.window.showErrorMessage(`Failed to edit files: ${error}`);
            return result;
        }
    }
    /**
     * Validate all edits before executing
     */
    async validateEdits(edits, result) {
        for (const edit of edits) {
            // Check if file exists (for modify/delete)
            if (edit.action === 'modify' || edit.action === 'delete') {
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(edit.filePath));
                }
                catch (error) {
                    result.errors.push(`File not found: ${edit.filePath}`);
                }
            }
            // Check if file doesn't exist (for create)
            if (edit.action === 'create') {
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(edit.filePath));
                    result.errors.push(`File already exists: ${edit.filePath}`);
                }
                catch (error) {
                    // File doesn't exist, which is good for create
                }
            }
            // Validate content
            if (edit.action === 'create' || edit.action === 'modify') {
                if (edit.content === undefined) {
                    result.errors.push(`Missing content for ${edit.action}: ${edit.filePath}`);
                }
            }
            // Validate rename/move
            if (edit.action === 'rename' || edit.action === 'move') {
                if (!edit.newPath) {
                    result.errors.push(`Missing newPath for ${edit.action}: ${edit.filePath}`);
                }
            }
        }
    }
    /**
     * Create backups before editing
     */
    async createBackups(edits, transaction) {
        for (const edit of edits) {
            if (edit.action !== 'create') {
                try {
                    const uri = vscode.Uri.file(edit.filePath);
                    const content = await vscode.workspace.fs.readFile(uri);
                    // Store backup in temp location
                    const backupPath = `${edit.filePath}.backup-${transaction.id}`;
                    const backupUri = vscode.Uri.file(backupPath);
                    await vscode.workspace.fs.writeFile(backupUri, content);
                    transaction.backupPaths.set(edit.filePath, backupPath);
                }
                catch (error) {
                    // If backup fails, still continue (for delete operations)
                }
            }
        }
    }
    /**
     * Show diff preview to user
     */
    async showDiffPreview(edits) {
        // Build preview message
        const summary = edits.map(edit => {
            switch (edit.action) {
                case 'create':
                    return `➕ Create: ${edit.filePath}`;
                case 'modify':
                    return `✏️ Modify: ${edit.filePath}`;
                case 'delete':
                    return `🗑️ Delete: ${edit.filePath}`;
                case 'rename':
                    return `📝 Rename: ${edit.filePath} → ${edit.newPath}`;
                case 'move':
                    return `📦 Move: ${edit.filePath} → ${edit.newPath}`;
                default:
                    return `❓ ${edit.action}: ${edit.filePath}`;
            }
        }).join('\n');
        const result = await vscode.window.showInformationMessage(`Agent Mode will make the following changes:\n\n${summary}\n\nProceed?`, { modal: true }, 'Apply Changes', 'Preview Diff', 'Cancel');
        if (result === 'Preview Diff') {
            // Open diff views for modified files
            for (const edit of edits) {
                if (edit.action === 'modify' && edit.oldContent && edit.content) {
                    await this.showDiff(edit);
                }
            }
            // Ask again
            return await this.showDiffPreview(edits);
        }
        return result === 'Apply Changes';
    }
    /**
     * Show diff for a single file
     */
    async showDiff(edit) {
        const oldUri = vscode.Uri.parse(`untitled:${edit.filePath}.old`);
        const newUri = vscode.Uri.parse(`untitled:${edit.filePath}.new`);
        // Create temporary documents
        const oldDoc = await vscode.workspace.openTextDocument(oldUri);
        const newDoc = await vscode.workspace.openTextDocument(newUri);
        const oldEdit = new vscode.WorkspaceEdit();
        oldEdit.insert(oldUri, new vscode.Position(0, 0), edit.oldContent || '');
        const newEdit = new vscode.WorkspaceEdit();
        newEdit.insert(newUri, new vscode.Position(0, 0), edit.content || '');
        await vscode.workspace.applyEdit(oldEdit);
        await vscode.workspace.applyEdit(newEdit);
        // Show diff
        await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, `${edit.filePath} (Agent Changes)`);
    }
    /**
     * Execute a single edit
     */
    async executeEdit(edit, result) {
        const uri = vscode.Uri.file(edit.filePath);
        try {
            switch (edit.action) {
                case 'create':
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(edit.content || '', 'utf-8'));
                    result.filesCreated.push(edit.filePath);
                    break;
                case 'modify':
                    if (edit.lineStart !== undefined && edit.lineEnd !== undefined) {
                        // Partial edit
                        await this.modifyLines(edit);
                    }
                    else {
                        // Full file replace
                        await vscode.workspace.fs.writeFile(uri, Buffer.from(edit.content || '', 'utf-8'));
                    }
                    result.filesModified.push(edit.filePath);
                    break;
                case 'delete':
                    await vscode.workspace.fs.delete(uri);
                    result.filesDeleted.push(edit.filePath);
                    break;
                case 'rename':
                case 'move':
                    const newUri = vscode.Uri.file(edit.newPath);
                    await vscode.workspace.fs.rename(uri, newUri);
                    result.filesModified.push(`${edit.filePath} → ${edit.newPath}`);
                    break;
            }
        }
        catch (error) {
            throw new Error(`Failed to ${edit.action} ${edit.filePath}: ${error}`);
        }
    }
    /**
     * Modify specific lines in a file
     */
    async modifyLines(edit) {
        const document = await vscode.workspace.openTextDocument(edit.filePath);
        const workspaceEdit = new vscode.WorkspaceEdit();
        const range = new vscode.Range(new vscode.Position(edit.lineStart, 0), new vscode.Position(edit.lineEnd, document.lineAt(edit.lineEnd).text.length));
        workspaceEdit.replace(document.uri, range, edit.content || '');
        await vscode.workspace.applyEdit(workspaceEdit);
        await document.save();
    }
    /**
     * Verify all edits were successful
     */
    async verifyEdits(edits, result) {
        for (const edit of edits) {
            const uri = vscode.Uri.file(edit.filePath);
            try {
                if (edit.action === 'delete') {
                    // Verify file doesn't exist
                    try {
                        await vscode.workspace.fs.stat(uri);
                        result.errors.push(`File still exists after delete: ${edit.filePath}`);
                    }
                    catch (error) {
                        // Good, file doesn't exist
                    }
                }
                else if (edit.action !== 'rename' && edit.action !== 'move') {
                    // Verify file exists
                    await vscode.workspace.fs.stat(uri);
                }
            }
            catch (error) {
                result.errors.push(`Verification failed for ${edit.filePath}: ${error}`);
            }
        }
    }
    /**
     * Rollback transaction
     */
    async rollback(transaction) {
        vscode.window.showWarningMessage('🔄 Rolling back changes...');
        // Restore from backups
        for (const [filePath, backupPath] of transaction.backupPaths) {
            try {
                const backupUri = vscode.Uri.file(backupPath);
                const fileUri = vscode.Uri.file(filePath);
                const backupContent = await vscode.workspace.fs.readFile(backupUri);
                await vscode.workspace.fs.writeFile(fileUri, backupContent);
                // Delete backup
                await vscode.workspace.fs.delete(backupUri);
            }
            catch (error) {
                // Backup restore failed
            }
        }
        transaction.rolledBack = true;
    }
    /**
     * Undo last transaction
     */
    async undo() {
        if (this.undoStack.length === 0) {
            vscode.window.showInformationMessage('No edits to undo');
            return false;
        }
        const transaction = this.undoStack.pop();
        if (transaction.rolledBack) {
            vscode.window.showWarningMessage('Transaction already rolled back');
            return false;
        }
        await this.rollback(transaction);
        vscode.window.showInformationMessage('✅ Undid last agent edit');
        return true;
    }
    /**
     * Generate transaction ID
     */
    generateTransactionId() {
        return `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get transaction history
     */
    getTransactionHistory() {
        return Array.from(this.transactions.values());
    }
    /**
     * Clear undo stack
     */
    clearUndoStack() {
        this.undoStack = [];
        vscode.window.showInformationMessage('Undo stack cleared');
    }
}
exports.MultiFileEditor = MultiFileEditor;
//# sourceMappingURL=MultiFileEditor.js.map