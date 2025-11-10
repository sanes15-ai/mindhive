"use strict";
/**
 * 💬 COMMENT THREADS
 *
 * Google Docs-style inline comments:
 * - Thread creation
 * - Replies and mentions
 * - Reactions (emoji)
 * - Thread resolution
 * - Persistence
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentThreadManager = void 0;
const events_1 = __importDefault(require("events"));
// ============================================================================
// COMMENT THREAD MANAGER
// ============================================================================
class CommentThreadManager extends events_1.default {
    threads = new Map();
    threadsByFile = new Map();
    constructor() {
        super();
    }
    // ==========================================================================
    // THREAD MANAGEMENT
    // ==========================================================================
    /**
     * Create new comment thread
     */
    createThread(filePath, range, author, initialComment) {
        const threadId = this.generateThreadId();
        const comment = {
            id: this.generateCommentId(),
            threadId,
            author,
            content: initialComment,
            createdAt: new Date(),
            reactions: new Map(),
            mentions: this.extractMentions(initialComment)
        };
        const thread = {
            id: threadId,
            filePath,
            range,
            comments: [comment],
            isResolved: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Store thread
        this.threads.set(threadId, thread);
        // Index by file
        if (!this.threadsByFile.has(filePath)) {
            this.threadsByFile.set(filePath, new Set());
        }
        this.threadsByFile.get(filePath).add(threadId);
        // Emit events
        this.emit('thread-created', thread);
        this.notifyMentions(comment);
        return thread;
    }
    /**
     * Add comment to existing thread
     */
    addComment(threadId, author, content) {
        const thread = this.threads.get(threadId);
        if (!thread) {
            throw new Error(`Thread ${threadId} not found`);
        }
        const comment = {
            id: this.generateCommentId(),
            threadId,
            author,
            content,
            createdAt: new Date(),
            reactions: new Map(),
            mentions: this.extractMentions(content)
        };
        thread.comments.push(comment);
        thread.updatedAt = new Date();
        // Emit events
        this.emit('comment-added', { thread, comment });
        this.notifyMentions(comment);
        return comment;
    }
    /**
     * Edit comment
     */
    editComment(commentId, newContent) {
        for (const thread of this.threads.values()) {
            const comment = thread.comments.find(c => c.id === commentId);
            if (comment) {
                comment.content = newContent;
                comment.editedAt = new Date();
                comment.mentions = this.extractMentions(newContent);
                thread.updatedAt = new Date();
                this.emit('comment-edited', { thread, comment });
                this.notifyMentions(comment);
                return;
            }
        }
        throw new Error(`Comment ${commentId} not found`);
    }
    /**
     * Delete comment
     */
    deleteComment(commentId) {
        for (const thread of this.threads.values()) {
            const index = thread.comments.findIndex(c => c.id === commentId);
            if (index !== -1) {
                const [comment] = thread.comments.splice(index, 1);
                thread.updatedAt = new Date();
                // If no comments left, delete thread
                if (thread.comments.length === 0) {
                    this.deleteThread(thread.id);
                }
                else {
                    this.emit('comment-deleted', { thread, comment });
                }
                return;
            }
        }
        throw new Error(`Comment ${commentId} not found`);
    }
    /**
     * Delete thread
     */
    deleteThread(threadId) {
        const thread = this.threads.get(threadId);
        if (!thread) {
            return;
        }
        // Remove from file index
        const fileThreads = this.threadsByFile.get(thread.filePath);
        if (fileThreads) {
            fileThreads.delete(threadId);
            if (fileThreads.size === 0) {
                this.threadsByFile.delete(thread.filePath);
            }
        }
        // Remove thread
        this.threads.delete(threadId);
        this.emit('thread-deleted', thread);
    }
    // ==========================================================================
    // THREAD RESOLUTION
    // ==========================================================================
    /**
     * Resolve thread
     */
    resolveThread(threadId, resolvedBy) {
        const thread = this.threads.get(threadId);
        if (!thread) {
            throw new Error(`Thread ${threadId} not found`);
        }
        thread.isResolved = true;
        thread.resolvedBy = resolvedBy;
        thread.resolvedAt = new Date();
        thread.updatedAt = new Date();
        this.emit('thread-resolved', thread);
    }
    /**
     * Unresolve thread
     */
    unresolveThread(threadId) {
        const thread = this.threads.get(threadId);
        if (!thread) {
            throw new Error(`Thread ${threadId} not found`);
        }
        thread.isResolved = false;
        thread.resolvedBy = undefined;
        thread.resolvedAt = undefined;
        thread.updatedAt = new Date();
        this.emit('thread-unresolved', thread);
    }
    // ==========================================================================
    // REACTIONS
    // ==========================================================================
    /**
     * Add reaction to comment
     */
    addReaction(commentId, emoji, clientId) {
        for (const thread of this.threads.values()) {
            const comment = thread.comments.find(c => c.id === commentId);
            if (comment) {
                if (!comment.reactions.has(emoji)) {
                    comment.reactions.set(emoji, []);
                }
                const reactors = comment.reactions.get(emoji);
                if (!reactors.includes(clientId)) {
                    reactors.push(clientId);
                    thread.updatedAt = new Date();
                    this.emit('reaction-added', { thread, comment, emoji, clientId });
                }
                return;
            }
        }
        throw new Error(`Comment ${commentId} not found`);
    }
    /**
     * Remove reaction from comment
     */
    removeReaction(commentId, emoji, clientId) {
        for (const thread of this.threads.values()) {
            const comment = thread.comments.find(c => c.id === commentId);
            if (comment) {
                const reactors = comment.reactions.get(emoji);
                if (reactors) {
                    const index = reactors.indexOf(clientId);
                    if (index !== -1) {
                        reactors.splice(index, 1);
                        // Remove emoji if no reactors left
                        if (reactors.length === 0) {
                            comment.reactions.delete(emoji);
                        }
                        thread.updatedAt = new Date();
                        this.emit('reaction-removed', { thread, comment, emoji, clientId });
                    }
                }
                return;
            }
        }
        throw new Error(`Comment ${commentId} not found`);
    }
    // ==========================================================================
    // QUERIES
    // ==========================================================================
    /**
     * Get thread by ID
     */
    getThread(threadId) {
        return this.threads.get(threadId);
    }
    /**
     * Get all threads for file
     */
    getThreadsForFile(filePath) {
        const threadIds = this.threadsByFile.get(filePath);
        if (!threadIds) {
            return [];
        }
        return Array.from(threadIds)
            .map(id => this.threads.get(id))
            .filter((t) => t !== undefined);
    }
    /**
     * Get all threads
     */
    getAllThreads() {
        return Array.from(this.threads.values());
    }
    /**
     * Filter threads
     */
    filterThreads(filter) {
        let threads = this.getAllThreads();
        if (filter.filePath) {
            threads = threads.filter(t => t.filePath === filter.filePath);
        }
        if (filter.isResolved !== undefined) {
            threads = threads.filter(t => t.isResolved === filter.isResolved);
        }
        if (filter.authorId !== undefined) {
            threads = threads.filter(t => t.comments.some(c => c.author.clientId === filter.authorId));
        }
        if (filter.dateRange) {
            threads = threads.filter(t => t.createdAt >= filter.dateRange.start &&
                t.createdAt <= filter.dateRange.end);
        }
        return threads;
    }
    /**
     * Get threads mentioning user
     */
    getThreadsMentioning(clientId) {
        return this.getAllThreads().filter(thread => thread.comments.some(comment => comment.mentions.includes(clientId)));
    }
    // ==========================================================================
    // STATISTICS
    // ==========================================================================
    /**
     * Get comment statistics
     */
    getStatistics() {
        const threads = this.getAllThreads();
        return {
            totalThreads: threads.length,
            activeThreads: threads.filter(t => !t.isResolved).length,
            resolvedThreads: threads.filter(t => t.isResolved).length,
            totalComments: threads.reduce((sum, t) => sum + t.comments.length, 0),
            filesWithComments: this.threadsByFile.size,
            recentThreads: threads.filter(t => Date.now() - t.updatedAt.getTime() < 24 * 60 * 60 * 1000).length
        };
    }
    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================
    generateThreadId() {
        return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    generateCommentId() {
        return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Extract @mentions from comment content
     */
    extractMentions(content) {
        const mentions = [];
        const regex = /@(\d+)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const clientId = parseInt(match[1], 10);
            if (!mentions.includes(clientId)) {
                mentions.push(clientId);
            }
        }
        return mentions;
    }
    /**
     * Notify mentioned users
     */
    notifyMentions(comment) {
        if (comment.mentions.length > 0) {
            this.emit('users-mentioned', {
                comment,
                mentionedUserIds: comment.mentions
            });
        }
    }
    // ==========================================================================
    // PERSISTENCE
    // ==========================================================================
    /**
     * Export threads to JSON
     */
    exportThreads() {
        const threads = this.getAllThreads();
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            threads: threads.map(thread => ({
                ...thread,
                comments: thread.comments.map(comment => ({
                    ...comment,
                    reactions: Array.from(comment.reactions.entries())
                }))
            }))
        };
    }
    /**
     * Import threads from JSON
     */
    importThreads(data) {
        if (data.version !== 1) {
            throw new Error('Unsupported thread data version');
        }
        for (const threadData of data.threads) {
            const thread = {
                ...threadData,
                createdAt: new Date(threadData.createdAt),
                updatedAt: new Date(threadData.updatedAt),
                resolvedAt: threadData.resolvedAt ? new Date(threadData.resolvedAt) : undefined,
                comments: threadData.comments.map((c) => ({
                    ...c,
                    createdAt: new Date(c.createdAt),
                    editedAt: c.editedAt ? new Date(c.editedAt) : undefined,
                    reactions: new Map(c.reactions)
                }))
            };
            this.threads.set(thread.id, thread);
            // Index by file
            if (!this.threadsByFile.has(thread.filePath)) {
                this.threadsByFile.set(thread.filePath, new Set());
            }
            this.threadsByFile.get(thread.filePath).add(thread.id);
        }
        this.emit('threads-imported', data.threads.length);
    }
    // ==========================================================================
    // CLEANUP
    // ==========================================================================
    /**
     * Clear all threads
     */
    clear() {
        this.threads.clear();
        this.threadsByFile.clear();
        this.emit('threads-cleared');
    }
    /**
     * Dispose manager
     */
    dispose() {
        this.clear();
        this.removeAllListeners();
    }
}
exports.CommentThreadManager = CommentThreadManager;
//# sourceMappingURL=CommentThread.js.map