/**
 * 🔥 REAL-TIME COLLABORATION ENGINE
 * 
 * The BEAST that makes MindHive legendary! Multi-user editing with:
 * - Yjs CRDT for conflict-free merging
 * - WebRTC peer-to-peer connections
 * - Document synchronization
 * - Session management
 * - Conflict resolution
 * - Offline support
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import EventEmitter from 'events';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CollaborationSession {
  sessionId: string;
  documentId: string;
  roomName: string;
  startedAt: Date;
  participants: Map<number, Participant>;
  isActive: boolean;
}

export interface Participant {
  clientId: number;
  name: string;
  email?: string;
  color: string;
  isOnline: boolean;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActiveAt: Date;
  role: 'owner' | 'editor' | 'viewer';
}

export interface CursorPosition {
  line: number;
  character: number;
  filePath: string;
}

export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
}

export interface CollaborationConfig {
  documentId: string;
  userName: string;
  userEmail?: string;
  signalingServers?: string[];
  enableWebRTC: boolean;
  enableIndexedDB: boolean;
  maxParticipants?: number;
  sessionPassword?: string;
}

export interface SyncStatus {
  isSynced: boolean;
  pendingChanges: number;
  lastSyncAt?: Date;
  participantCount: number;
  connectionState: 'connected' | 'connecting' | 'disconnected';
}

export interface DocumentChange {
  clientId: number;
  timestamp: Date;
  changes: any[];
  origin: string;
}

// ============================================================================
// COLLABORATION ENGINE
// ============================================================================

export class CollaborationEngine extends EventEmitter {
  private ydoc: Y.Doc | null = null;
  private webrtcProvider: WebrtcProvider | null = null;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  
  private currentSession: CollaborationSession | null = null;
  private activeDocuments: Map<string, Y.Text> = new Map();
  private awareness: any = null;
  
  private syncStatus: SyncStatus = {
    isSynced: false,
    pendingChanges: 0,
    participantCount: 0,
    connectionState: 'disconnected'
  };
  
  private readonly USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DFE6E9', '#A29BFE', '#FD79A8',
    '#FDCB6E', '#6C5CE7', '#00B894', '#E17055'
  ];
  
  constructor() {
    super();
  }
  
  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================
  
  /**
   * Start a new collaboration session
   */
  async startSession(config: CollaborationConfig): Promise<CollaborationSession> {
    try {
      // Validate configuration
      this.validateConfig(config);
      
      // Create Yjs document
      this.ydoc = new Y.Doc();
      
      // Generate room name (hash of document ID + optional password)
      const roomName = this.generateRoomName(config.documentId, config.sessionPassword);
      
      // Setup IndexedDB persistence (offline support)
      if (config.enableIndexedDB) {
        this.indexeddbProvider = new IndexeddbPersistence(roomName, this.ydoc);
        
        await new Promise<void>((resolve) => {
          this.indexeddbProvider!.on('synced', () => {
            this.emit('local-cache-loaded');
            resolve();
          });
        });
      }
      
      // Setup WebRTC provider (peer-to-peer)
      if (config.enableWebRTC) {
        this.webrtcProvider = new WebrtcProvider(roomName, this.ydoc, {
          signaling: config.signalingServers || [
            'wss://signaling.yjs.dev',
            'wss://y-webrtc-signaling-eu.herokuapp.com',
            'wss://y-webrtc-signaling-us.herokuapp.com'
          ],
          password: config.sessionPassword,
          maxConns: config.maxParticipants || 20,
          filterBcConns: true,
          peerOpts: {}
        });
        
        this.awareness = this.webrtcProvider.awareness;
        this.setupAwarenessHandlers();
      }
      
      // Create session
      const clientId = this.ydoc.clientID;
      const session: CollaborationSession = {
        sessionId: this.generateSessionId(),
        documentId: config.documentId,
        roomName,
        startedAt: new Date(),
        participants: new Map(),
        isActive: true
      };
      
      // Add self as participant
      const userColor = this.USER_COLORS[clientId % this.USER_COLORS.length];
      session.participants.set(clientId, {
        clientId,
        name: config.userName,
        email: config.userEmail,
        color: userColor,
        isOnline: true,
        lastActiveAt: new Date(),
        role: 'owner'
      });
      
      // Set local awareness state
      if (this.awareness) {
        this.awareness.setLocalState({
          user: {
            clientId,
            name: config.userName,
            email: config.userEmail,
            color: userColor
          }
        });
      }
      
      // Setup document observers
      this.setupDocumentObservers();
      
      // Update sync status
      this.syncStatus.connectionState = 'connected';
      this.syncStatus.participantCount = 1;
      
      this.currentSession = session;
      this.emit('session-started', session);
      
      return session;
      
    } catch (error) {
      this.emit('error', { type: 'session-start-failed', error });
      throw error;
    }
  }
  
  /**
   * Join an existing collaboration session
   */
  async joinSession(config: CollaborationConfig): Promise<CollaborationSession> {
    // Same as startSession - Yjs handles joining automatically
    return this.startSession(config);
  }
  
  /**
   * Leave current collaboration session
   */
  async leaveSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }
    
    try {
      // Mark as inactive
      this.currentSession.isActive = false;
      
      // Disconnect providers
      if (this.webrtcProvider) {
        this.webrtcProvider.disconnect();
        this.webrtcProvider.destroy();
        this.webrtcProvider = null;
      }
      
      if (this.indexeddbProvider) {
        this.indexeddbProvider.destroy();
        this.indexeddbProvider = null;
      }
      
      // Destroy document
      if (this.ydoc) {
        this.ydoc.destroy();
        this.ydoc = null;
      }
      
      // Clear state
      this.activeDocuments.clear();
      this.awareness = null;
      this.syncStatus = {
        isSynced: false,
        pendingChanges: 0,
        participantCount: 0,
        connectionState: 'disconnected'
      };
      
      this.emit('session-ended', this.currentSession);
      this.currentSession = null;
      
    } catch (error) {
      this.emit('error', { type: 'session-leave-failed', error });
      throw error;
    }
  }
  
  // ==========================================================================
  // DOCUMENT SYNCHRONIZATION
  // ==========================================================================
  
  /**
   * Get or create shared text document
   */
  getSharedText(filePath: string): Y.Text {
    if (!this.ydoc) {
      throw new Error('No active collaboration session');
    }
    
    if (this.activeDocuments.has(filePath)) {
      return this.activeDocuments.get(filePath)!;
    }
    
    // Create new shared text
    const ytext = this.ydoc.getText(filePath);
    this.activeDocuments.set(filePath, ytext);
    
    // Setup observer for this document
    ytext.observe((event, transaction) => {
      this.handleDocumentChange(filePath, event, transaction);
    });
    
    return ytext;
  }
  
  /**
   * Update document content
   */
  updateDocument(filePath: string, content: string): void {
    if (!this.ydoc) {
      throw new Error('No active collaboration session');
    }
    
    const ytext = this.getSharedText(filePath);
    
    // Transact changes
    this.ydoc.transact(() => {
      // Delete old content
      if (ytext.length > 0) {
        ytext.delete(0, ytext.length);
      }
      // Insert new content
      ytext.insert(0, content);
    }, this.ydoc!.clientID);
  }
  
  /**
   * Apply incremental change
   */
  applyChange(filePath: string, position: number, deletedLength: number, insertedText: string): void {
    if (!this.ydoc) {
      throw new Error('No active collaboration session');
    }
    
    const ytext = this.getSharedText(filePath);
    
    this.ydoc.transact(() => {
      if (deletedLength > 0) {
        ytext.delete(position, deletedLength);
      }
      if (insertedText.length > 0) {
        ytext.insert(position, insertedText);
      }
    }, this.ydoc!.clientID);
  }
  
  /**
   * Get current document content
   */
  getDocumentContent(filePath: string): string {
    const ytext = this.getSharedText(filePath);
    return ytext.toString();
  }
  
  // ==========================================================================
  // PARTICIPANT MANAGEMENT
  // ==========================================================================
  
  /**
   * Get all participants
   */
  getParticipants(): Participant[] {
    if (!this.currentSession) {
      return [];
    }
    return Array.from(this.currentSession.participants.values());
  }
  
  /**
   * Get participant by client ID
   */
  getParticipant(clientId: number): Participant | undefined {
    if (!this.currentSession) {
      return undefined;
    }
    return this.currentSession.participants.get(clientId);
  }
  
  /**
   * Update participant info
   */
  updateParticipant(clientId: number, updates: Partial<Participant>): void {
    if (!this.currentSession) {
      return;
    }
    
    const participant = this.currentSession.participants.get(clientId);
    if (participant) {
      Object.assign(participant, updates, { lastActiveAt: new Date() });
      this.emit('participant-updated', participant);
    }
  }
  
  // ==========================================================================
  // AWARENESS & PRESENCE
  // ==========================================================================
  
  /**
   * Update local cursor position
   */
  updateCursor(filePath: string, line: number, character: number): void {
    if (!this.awareness || !this.currentSession) {
      return;
    }
    
    const localState = this.awareness.getLocalState();
    this.awareness.setLocalState({
      ...localState,
      cursor: { filePath, line, character },
      lastActiveAt: Date.now()
    });
  }
  
  /**
   * Update local selection
   */
  updateSelection(filePath: string, start: CursorPosition, end: CursorPosition): void {
    if (!this.awareness || !this.currentSession) {
      return;
    }
    
    const localState = this.awareness.getLocalState();
    this.awareness.setLocalState({
      ...localState,
      selection: { start, end },
      lastActiveAt: Date.now()
    });
  }
  
  /**
   * Clear local selection
   */
  clearSelection(): void {
    if (!this.awareness || !this.currentSession) {
      return;
    }
    
    const localState = this.awareness.getLocalState();
    this.awareness.setLocalState({
      ...localState,
      selection: null
    });
  }
  
  // ==========================================================================
  // SYNC STATUS
  // ==========================================================================
  
  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }
  
  /**
   * Force sync with peers
   */
  async forceSync(): Promise<void> {
    if (!this.webrtcProvider) {
      return;
    }
    
    // WebRTC syncs automatically, but we can trigger awareness update
    if (this.awareness) {
      const localState = this.awareness.getLocalState();
      this.awareness.setLocalState({
        ...localState,
        forceSyncAt: Date.now()
      });
    }
    
    this.emit('sync-triggered');
  }
  
  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================
  
  private validateConfig(config: CollaborationConfig): void {
    if (!config.documentId) {
      throw new Error('documentId is required');
    }
    if (!config.userName) {
      throw new Error('userName is required');
    }
  }
  
  private generateRoomName(documentId: string, password?: string): string {
    const base = `mindhive-${documentId}`;
    if (password) {
      // Simple hash for room name (not for security, just uniqueness)
      const hash = Buffer.from(`${base}-${password}`).toString('base64').slice(0, 16);
      return `${base}-${hash}`;
    }
    return base;
  }
  
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private setupDocumentObservers(): void {
    if (!this.ydoc) {
      return;
    }
    
    // Observe all document updates
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      this.syncStatus.lastSyncAt = new Date();
      this.emit('document-updated', { update, origin });
    });
    
    // Observe undo/redo
    this.ydoc.on('beforeTransaction', (transaction: any) => {
      this.emit('before-transaction', transaction);
    });
    
    this.ydoc.on('afterTransaction', (transaction: any) => {
      this.emit('after-transaction', transaction);
    });
  }
  
  private handleDocumentChange(filePath: string, event: any, transaction: any): void {
    const clientId = transaction.origin as number;
    
    // Emit change event
    const change: DocumentChange = {
      clientId,
      timestamp: new Date(),
      changes: event.changes,
      origin: filePath
    };
    
    this.emit('document-changed', change);
    
    // Update participant activity
    if (this.currentSession && clientId !== this.ydoc!.clientID) {
      this.updateParticipant(clientId, { lastActiveAt: new Date() });
    }
  }
  
  private setupAwarenessHandlers(): void {
    if (!this.awareness) {
      return;
    }
    
    // When awareness state changes (cursor, selection, etc.)
    this.awareness.on('change', (changes: any) => {
      const { added, updated, removed } = changes;
      
      // Handle new participants
      added.forEach((clientId: number) => {
        const state = this.awareness.getStates().get(clientId);
        if (state && this.currentSession) {
          const participant: Participant = {
            clientId,
            name: state.user?.name || `User ${clientId}`,
            email: state.user?.email,
            color: state.user?.color || this.USER_COLORS[clientId % this.USER_COLORS.length],
            isOnline: true,
            cursor: state.cursor,
            selection: state.selection,
            lastActiveAt: new Date(),
            role: 'editor'
          };
          
          this.currentSession.participants.set(clientId, participant);
          this.syncStatus.participantCount = this.currentSession.participants.size;
          
          this.emit('participant-joined', participant);
        }
      });
      
      // Handle updated participants
      updated.forEach((clientId: number) => {
        const state = this.awareness.getStates().get(clientId);
        if (state && this.currentSession) {
          const participant = this.currentSession.participants.get(clientId);
          if (participant) {
            participant.cursor = state.cursor;
            participant.selection = state.selection;
            participant.lastActiveAt = new Date();
            
            this.emit('participant-updated', participant);
          }
        }
      });
      
      // Handle removed participants
      removed.forEach((clientId: number) => {
        if (this.currentSession) {
          const participant = this.currentSession.participants.get(clientId);
          if (participant) {
            participant.isOnline = false;
            this.syncStatus.participantCount = Math.max(0, this.syncStatus.participantCount - 1);
            
            this.emit('participant-left', participant);
          }
        }
      });
    });
    
    // Connection state changes
    if (this.webrtcProvider) {
      this.webrtcProvider.on('status', (event: any) => {
        const wasConnected = this.syncStatus.connectionState === 'connected';
        this.syncStatus.connectionState = event.connected ? 'connected' : 'disconnected';
        
        if (event.connected && !wasConnected) {
          this.syncStatus.isSynced = true;
          this.emit('connected');
        } else if (!event.connected && wasConnected) {
          this.syncStatus.isSynced = false;
          this.emit('disconnected');
        }
      });
      
      this.webrtcProvider.on('synced', (event: any) => {
        this.syncStatus.isSynced = true;
        this.emit('synced', event);
      });
    }
  }
  
  // ==========================================================================
  // PUBLIC UTILITIES
  // ==========================================================================
  
  /**
   * Export current session state
   */
  exportSessionState(): any {
    if (!this.ydoc) {
      return null;
    }
    
    return {
      session: this.currentSession,
      syncStatus: this.syncStatus,
      documentState: Y.encodeStateAsUpdate(this.ydoc)
    };
  }
  
  /**
   * Get session statistics
   */
  getStatistics(): any {
    if (!this.currentSession || !this.ydoc) {
      return null;
    }
    
    return {
      sessionDuration: Date.now() - this.currentSession.startedAt.getTime(),
      participantCount: this.currentSession.participants.size,
      activeDocuments: this.activeDocuments.size,
      documentSize: Y.encodeStateAsUpdate(this.ydoc).byteLength,
      connectionState: this.syncStatus.connectionState,
      isSynced: this.syncStatus.isSynced
    };
  }
  
  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.currentSession?.isActive ?? false;
  }
  
  /**
   * Get current session
   */
  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }
  
  /**
   * Dispose engine
   */
  dispose(): void {
    this.leaveSession().catch(() => {});
    this.removeAllListeners();
  }
}
