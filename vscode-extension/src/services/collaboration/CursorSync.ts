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

import * as vscode from 'vscode';
import { Participant, CursorPosition, SelectionRange } from './CollaborationEngine';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CursorDecoration {
  clientId: number;
  participant: Participant;
  cursorDecoration: vscode.TextEditorDecorationType;
  selectionDecoration: vscode.TextEditorDecorationType;
  lastPosition?: vscode.Position;
  lastSelection?: vscode.Range;
}

export interface CursorSyncConfig {
  showCursors: boolean;
  showSelections: boolean;
  showNameplates: boolean;
  animationDuration: number; // ms
  idleTimeout: number; // ms
}

// ============================================================================
// CURSOR SYNCHRONIZATION
// ============================================================================

export class CursorSync {
  private decorations: Map<number, CursorDecoration> = new Map();
  private editors: Map<string, vscode.TextEditor> = new Map();
  private config: CursorSyncConfig;
  private updateTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: Partial<CursorSyncConfig>) {
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
  updateCursor(participant: Participant, filePath: string): void {
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
    const position = new vscode.Position(
      participant.cursor.line,
      participant.cursor.character
    );
    
    // Create cursor decoration
    const cursorRange = new vscode.Range(position, position);
    editor.setDecorations(decoration.cursorDecoration, [cursorRange]);
    
    decoration.lastPosition = position;
  }
  
  /**
   * Update selection for participant
   */
  updateSelection(participant: Participant, filePath: string): void {
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
    const start = new vscode.Position(
      participant.selection.start.line,
      participant.selection.start.character
    );
    const end = new vscode.Position(
      participant.selection.end.line,
      participant.selection.end.character
    );
    const selectionRange = new vscode.Range(start, end);
    
    // Apply selection decoration
    editor.setDecorations(decoration.selectionDecoration, [selectionRange]);
    
    decoration.lastSelection = selectionRange;
  }
  
  /**
   * Remove cursor for participant
   */
  removeCursor(clientId: number): void {
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
  clearAllCursors(): void {
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
  registerEditor(editor: vscode.TextEditor): void {
    const filePath = editor.document.uri.fsPath;
    this.editors.set(filePath, editor);
  }
  
  /**
   * Unregister text editor
   */
  unregisterEditor(filePath: string): void {
    this.editors.delete(filePath);
  }
  
  /**
   * Find editor by file path
   */
  private findEditor(filePath: string): vscode.TextEditor | undefined {
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
  private createDecoration(participant: Participant): CursorDecoration {
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
  batchUpdate(participants: Participant[], filePath: string): void {
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
  scheduleBatchUpdate(participants: Participant[], filePath: string): void {
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
  checkIdleParticipants(): void {
    const now = Date.now();
    const idleThreshold = now - this.config.idleTimeout;
    
    for (const decoration of this.decorations.values()) {
      const lastActive = decoration.participant.lastActiveAt.getTime();
      
      if (lastActive < idleThreshold) {
        // Fade idle cursors
        this.fadeDecoration(decoration);
      } else {
        // Restore active cursors
        this.restoreDecoration(decoration);
      }
    }
  }
  
  /**
   * Fade decoration for idle participant
   */
  private fadeDecoration(decoration: CursorDecoration): void {
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
  private restoreDecoration(decoration: CursorDecoration): void {
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
  getActiveCursors(): CursorDecoration[] {
    return Array.from(this.decorations.values());
  }
  
  /**
   * Check if cursor is visible
   */
  isCursorVisible(clientId: number): boolean {
    return this.decorations.has(clientId);
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<CursorSyncConfig>): void {
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
  dispose(): void {
    this.clearAllCursors();
    this.editors.clear();
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }
}
