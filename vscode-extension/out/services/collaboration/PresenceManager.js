"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceManager = void 0;
const events_1 = __importDefault(require("events"));
// ============================================================================
// PRESENCE MANAGER
// ============================================================================
class PresenceManager extends events_1.default {
    presenceStates = new Map();
    activityBuffer = [];
    idleCheckInterval = null;
    IDLE_TIMEOUT = 30000; // 30 seconds
    OFFLINE_TIMEOUT = 120000; // 2 minutes
    MAX_ACTIVITY_BUFFER = 100;
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
    updatePresence(participant, updates) {
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
    getPresence(clientId) {
        return this.presenceStates.get(clientId);
    }
    /**
     * Get all presence states
     */
    getAllPresence() {
        return Array.from(this.presenceStates.values());
    }
    /**
     * Remove presence for participant
     */
    removePresence(clientId) {
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
    recordActivity(event) {
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
            }
            else if (event.type === 'file-close') {
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
    getRecentActivity(limit = 10) {
        return this.activityBuffer.slice(-limit);
    }
    /**
     * Get activity for specific participant
     */
    getParticipantActivity(clientId, limit = 10) {
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
    startIdleCheck() {
        this.idleCheckInterval = setInterval(() => {
            this.checkIdleStates();
        }, 5000); // Check every 5 seconds
    }
    /**
     * Check all participants for idle/offline status
     */
    checkIdleStates() {
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
    getStatistics() {
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
    getOnlineParticipants() {
        return Array.from(this.presenceStates.values())
            .filter(state => state.status === 'online');
    }
    // ==========================================================================
    // CLEANUP
    // ==========================================================================
    /**
     * Dispose manager
     */
    dispose() {
        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
            this.idleCheckInterval = null;
        }
        this.presenceStates.clear();
        this.activityBuffer = [];
        this.removeAllListeners();
    }
}
exports.PresenceManager = PresenceManager;
//# sourceMappingURL=PresenceManager.js.map