/**
 * 👥 PRESENCE MANAGER
 * 
 * Track who's online, what they're doing, and show it beautifully!
 * - Online/offline status
 * - Activity tracking
 * - Idle detection
 * - User profiles
 * - Presence broadcasting
 */

import EventEmitter from 'events';
import { Participant } from './CollaborationEngine';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PresenceState {
  clientId: number;
  status: 'online' | 'idle' | 'offline';
  currentFile?: string;
  lastActivity: Date;
  isTyping: boolean;
  customStatus?: string;
}

export interface ActivityEvent {
  clientId: number;
  type: 'typing' | 'cursor-move' | 'selection' | 'file-open' | 'file-close';
  filePath?: string;
  timestamp: Date;
}

// ============================================================================
// PRESENCE MANAGER
// ============================================================================

export class PresenceManager extends EventEmitter {
  private presenceStates: Map<number, PresenceState> = new Map();
  private activityBuffer: ActivityEvent[] = [];
  private idleCheckInterval: NodeJS.Timeout | null = null;
  
  private readonly IDLE_TIMEOUT = 30000; // 30 seconds
  private readonly OFFLINE_TIMEOUT = 120000; // 2 minutes
  private readonly MAX_ACTIVITY_BUFFER = 100;
  
  constructor() {
    super();
    this.startIdleCheck();
  }
  
  // ==========================================================================
  // PRESENCE STATE
  // ==========================================================================
  
  /**
   * Update presence for participant
   */
  updatePresence(participant: Participant, updates: Partial<PresenceState>): void {
    let state = this.presenceStates.get(participant.clientId);
    
    if (!state) {
      state = {
        clientId: participant.clientId,
        status: 'online',
        lastActivity: new Date(),
        isTyping: false
      };
      this.presenceStates.set(participant.clientId, state);
    }
    
    // Update state
    const oldStatus = state.status;
    Object.assign(state, updates, { lastActivity: new Date() });
    
    // If status changed, emit event
    if (oldStatus !== state.status) {
      this.emit('status-changed', {
        clientId: participant.clientId,
        oldStatus,
        newStatus: state.status
      });
    }
    
    this.emit('presence-updated', state);
  }
  
  /**
   * Get presence state for participant
   */
  getPresence(clientId: number): PresenceState | undefined {
    return this.presenceStates.get(clientId);
  }
  
  /**
   * Get all presence states
   */
  getAllPresence(): PresenceState[] {
    return Array.from(this.presenceStates.values());
  }
  
  /**
   * Remove presence for participant
   */
  removePresence(clientId: number): void {
    const state = this.presenceStates.get(clientId);
    if (state) {
      state.status = 'offline';
      this.emit('status-changed', {
        clientId,
        oldStatus: state.status,
        newStatus: 'offline'
      });
    }
    this.presenceStates.delete(clientId);
  }
  
  // ==========================================================================
  // ACTIVITY TRACKING
  // ==========================================================================
  
  /**
   * Record activity event
   */
  recordActivity(event: ActivityEvent): void {
    // Add to buffer
    this.activityBuffer.push(event);
    
    // Trim buffer if too large
    if (this.activityBuffer.length > this.MAX_ACTIVITY_BUFFER) {
      this.activityBuffer = this.activityBuffer.slice(-this.MAX_ACTIVITY_BUFFER);
    }
    
    // Update presence state
    const state = this.presenceStates.get(event.clientId);
    if (state) {
      state.lastActivity = event.timestamp;
      
      if (event.type === 'typing') {
        state.isTyping = true;
        // Clear typing after 2 seconds
        setTimeout(() => {
          if (state.isTyping) {
            state.isTyping = false;
            this.emit('presence-updated', state);
          }
        }, 2000);
      }
      
      if (event.type === 'file-open' && event.filePath) {
        state.currentFile = event.filePath;
      } else if (event.type === 'file-close') {
        state.currentFile = undefined;
      }
      
      // If was idle, mark as online
      if (state.status === 'idle') {
        state.status = 'online';
        this.emit('status-changed', {
          clientId: event.clientId,
          oldStatus: 'idle',
          newStatus: 'online'
        });
      }
      
      this.emit('activity', event);
    }
  }
  
  /**
   * Get recent activity
   */
  getRecentActivity(limit: number = 10): ActivityEvent[] {
    return this.activityBuffer.slice(-limit);
  }
  
  /**
   * Get activity for specific participant
   */
  getParticipantActivity(clientId: number, limit: number = 10): ActivityEvent[] {
    return this.activityBuffer
      .filter(event => event.clientId === clientId)
      .slice(-limit);
  }
  
  // ==========================================================================
  // IDLE DETECTION
  // ==========================================================================
  
  /**
   * Start periodic idle check
   */
  private startIdleCheck(): void {
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleStates();
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Check all participants for idle/offline status
   */
  private checkIdleStates(): void {
    const now = Date.now();
    
    for (const [clientId, state] of this.presenceStates.entries()) {
      const timeSinceActivity = now - state.lastActivity.getTime();
      
      // Check for offline (2 minutes)
      if (timeSinceActivity > this.OFFLINE_TIMEOUT && state.status !== 'offline') {
        state.status = 'offline';
        this.emit('status-changed', {
          clientId,
          oldStatus: state.status,
          newStatus: 'offline'
        });
        this.emit('presence-updated', state);
      }
      // Check for idle (30 seconds)
      else if (timeSinceActivity > this.IDLE_TIMEOUT && state.status === 'online') {
        state.status = 'idle';
        this.emit('status-changed', {
          clientId,
          oldStatus: 'online',
          newStatus: 'idle'
        });
        this.emit('presence-updated', state);
      }
    }
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  /**
   * Get presence statistics
   */
  getStatistics(): any {
    const states = Array.from(this.presenceStates.values());
    
    return {
      total: states.length,
      online: states.filter(s => s.status === 'online').length,
      idle: states.filter(s => s.status === 'idle').length,
      offline: states.filter(s => s.status === 'offline').length,
      typing: states.filter(s => s.isTyping).length
    };
  }
  
  /**
   * Get online participants
   */
  getOnlineParticipants(): PresenceState[] {
    return Array.from(this.presenceStates.values())
      .filter(state => state.status === 'online');
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  
  /**
   * Dispose manager
   */
  dispose(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    this.presenceStates.clear();
    this.activityBuffer = [];
    this.removeAllListeners();
  }
}
