"use strict";
/**
 * 🎯 REAL-TIME CURSOR SYNCHRONIZATION
 *
 * Show cursors and selections from all collaborators in real-time!
 * - Smooth cursor animations
 * - Color-coded per user
 * - Selection highlighting
 * - Nameplate labels
 * - Idle detection
 */
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
exports.CursorSync = void 0;
const vscode = __importStar(require("vscode"));
// ============================================================================
// CURSOR SYNCHRONIZATION
// ============================================================================
class CursorSync {
    decorations = new Map();
    editors = new Map();
    config;
    updateTimer = null;
    constructor(config) {
        this.config = {
            showCursors: true,
            showSelections: true,
            showNameplates: true,
            animationDuration: 150,
            idleTimeout: 30000, // 30 seconds
            ...config
        };
    }
    // ==========================================================================
    // CURSOR MANAGEMENT
    // ==========================================================================
    /**
     * Add or update cursor for participant
     */
    updateCursor(participant, filePath) {
        if (!this.config.showCursors || !participant.cursor) {
            return;
        }
        // Get or create decoration for this participant
        let decoration = this.decorations.get(participant.clientId);
        if (!decoration) {
            decoration = this.createDecoration(participant);
            this.decorations.set(participant.clientId, decoration);
        }
        // Find editor for this file
        const editor = this.findEditor(filePath);
        if (!editor) {
            return;
        }
        // Update cursor position
        const position = new vscode.Position(participant.cursor.line, participant.cursor.character);
        // Create cursor decoration
        const cursorRange = new vscode.Range(position, position);
        editor.setDecorations(decoration.cursorDecoration, [cursorRange]);
        decoration.lastPosition = position;
    }
    /**
     * Update selection for participant
     */
    updateSelection(participant, filePath) {
        if (!this.config.showSelections || !participant.selection) {
            return;
        }
        // Get decoration
        const decoration = this.decorations.get(participant.clientId);
        if (!decoration) {
            return;
        }
        // Find editor
        const editor = this.findEditor(filePath);
        if (!editor) {
            return;
        }
        // Create selection range
        const start = new vscode.Position(participant.selection.start.line, participant.selection.start.character);
        const end = new vscode.Position(participant.selection.end.line, participant.selection.end.character);
        const selectionRange = new vscode.Range(start, end);
        // Apply selection decoration
        editor.setDecorations(decoration.selectionDecoration, [selectionRange]);
        decoration.lastSelection = selectionRange;
    }
    /**
     * Remove cursor for participant
     */
    removeCursor(clientId) {
        const decoration = this.decorations.get(clientId);
        if (!decoration) {
            return;
        }
        // Clear decorations
        decoration.cursorDecoration.dispose();
        decoration.selectionDecoration.dispose();
        // Remove from map
        this.decorations.delete(clientId);
    }
    /**
     * Clear all cursors
     */
    clearAllCursors() {
        for (const decoration of this.decorations.values()) {
            decoration.cursorDecoration.dispose();
            decoration.selectionDecoration.dispose();
        }
        this.decorations.clear();
    }
    // ==========================================================================
    // EDITOR TRACKING
    // ==========================================================================
    /**
     * Register text editor
     */
    registerEditor(editor) {
        const filePath = editor.document.uri.fsPath;
        this.editors.set(filePath, editor);
    }
    /**
     * Unregister text editor
     */
    unregisterEditor(filePath) {
        this.editors.delete(filePath);
    }
    /**
     * Find editor by file path
     */
    findEditor(filePath) {
        // Try exact match first
        if (this.editors.has(filePath)) {
            return this.editors.get(filePath);
        }
        // Try finding active editor with matching path
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
            this.editors.set(filePath, activeEditor);
            return activeEditor;
        }
        // Search all visible editors
        for (const editor of vscode.window.visibleTextEditors) {
            if (editor.document.uri.fsPath === filePath) {
                this.editors.set(filePath, editor);
                return editor;
            }
        }
        return undefined;
    }
    // ==========================================================================
    // DECORATION CREATION
    // ==========================================================================
    /**
     * Create decoration styles for participant
     */
    createDecoration(participant) {
        const color = participant.color;
        const name = participant.name;
        // Cursor decoration (vertical bar)
        const cursorDecoration = vscode.window.createTextEditorDecorationType({
            borderStyle: 'solid',
            borderWidth: '0 0 0 2px',
            borderColor: color,
            backgroundColor: `${color}40`, // 25% opacity
            // Nameplate (shown above cursor)
            before: this.config.showNameplates ? {
                contentText: name,
                backgroundColor: color,
                color: '#FFFFFF',
                fontWeight: 'bold',
                border: `1px solid ${color}`,
                textDecoration: 'none; position: absolute; top: -20px; z-index: 1000; font-size: 11px; padding: 2px 6px; margin: 0 0 2px 0; border-radius: 3px;'
            } : undefined
        });
        // Selection decoration (background highlight)
        const selectionDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: `${color}30`, // 19% opacity
            borderRadius: '2px',
            isWholeLine: false
        });
        return {
            clientId: participant.clientId,
            participant,
            cursorDecoration,
            selectionDecoration
        };
    }
    // ==========================================================================
    // BATCH UPDATES
    // ==========================================================================
    /**
     * Update multiple cursors efficiently
     */
    batchUpdate(participants, filePath) {
        // Clear existing decorations for this file
        const editor = this.findEditor(filePath);
        if (!editor) {
            return;
        }
        // Update all participants
        for (const participant of participants) {
            if (participant.cursor?.filePath === filePath) {
                this.updateCursor(participant, filePath);
            }
            if (participant.selection) {
                this.updateSelection(participant, filePath);
            }
        }
    }
    /**
     * Throttled batch update
     */
    scheduleBatchUpdate(participants, filePath) {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        this.updateTimer = setTimeout(() => {
            this.batchUpdate(participants, filePath);
            this.updateTimer = null;
        }, 50); // 50ms debounce
    }
    // ==========================================================================
    // IDLE DETECTION
    // ==========================================================================
    /**
     * Check for idle participants and fade their cursors
     */
    checkIdleParticipants() {
        const now = Date.now();
        const idleThreshold = now - this.config.idleTimeout;
        for (const decoration of this.decorations.values()) {
            const lastActive = decoration.participant.lastActiveAt.getTime();
            if (lastActive < idleThreshold) {
                // Fade idle cursors
                this.fadeDecoration(decoration);
            }
            else {
                // Restore active cursors
                this.restoreDecoration(decoration);
            }
        }
    }
    /**
     * Fade decoration for idle participant
     */
    fadeDecoration(decoration) {
        const color = decoration.participant.color;
        // Recreate with faded colors
        decoration.cursorDecoration.dispose();
        decoration.selectionDecoration.dispose();
        decoration.cursorDecoration = vscode.window.createTextEditorDecorationType({
            borderStyle: 'solid',
            borderWidth: '0 0 0 2px',
            borderColor: `${color}60`, // 38% opacity
            backgroundColor: `${color}20`, // 13% opacity
        });
        decoration.selectionDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: `${color}15`, // 8% opacity
            borderRadius: '2px'
        });
    }
    /**
     * Restore decoration for active participant
     */
    restoreDecoration(decoration) {
        // Recreate with full colors
        decoration.cursorDecoration.dispose();
        decoration.selectionDecoration.dispose();
        const newDecoration = this.createDecoration(decoration.participant);
        decoration.cursorDecoration = newDecoration.cursorDecoration;
        decoration.selectionDecoration = newDecoration.selectionDecoration;
    }
    // ==========================================================================
    // UTILITIES
    // ==========================================================================
    /**
     * Get all active cursors
     */
    getActiveCursors() {
        return Array.from(this.decorations.values());
    }
    /**
     * Check if cursor is visible
     */
    isCursorVisible(clientId) {
        return this.decorations.has(clientId);
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Recreate all decorations with new config
        const participants = Array.from(this.decorations.values()).map(d => d.participant);
        this.clearAllCursors();
        for (const participant of participants) {
            if (participant.cursor) {
                this.updateCursor(participant, participant.cursor.filePath);
            }
        }
    }
    /**
     * Dispose all resources
     */
    dispose() {
        this.clearAllCursors();
        this.editors.clear();
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
    }
}
exports.CursorSync = CursorSync;
//# sourceMappingURL=CursorSync.js.map