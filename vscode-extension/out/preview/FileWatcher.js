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
exports.FileWatcher = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Advanced file watcher for hot reload
 * Watches workspace files and triggers reload on changes
 * Includes smart debouncing and framework-specific optimizations
 */
class FileWatcher {
    watchers = [];
    outputChannel;
    reloadCallback;
    debounceTimer;
    pendingChanges = [];
    DEFAULT_CONFIG = {
        patterns: [
            '**/*.{js,jsx,ts,tsx}', // JavaScript/TypeScript
            '**/*.{html,css,scss,sass,less}', // Web files
            '**/*.{vue,svelte}', // Framework files
            '**/*.json', // Config files
            '**/*.{jpg,jpeg,png,gif,svg,webp}', // Images (for cache busting)
        ],
        ignorePatterns: [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/.vscode/**',
            '**/coverage/**',
            '**/.cache/**',
        ],
        debounceMs: 300, // 300ms debounce
        excludeDirs: ['node_modules', '.git', 'dist', 'build', '.next', 'out'],
    };
    config;
    isWatching = false;
    constructor(outputChannel, customConfig) {
        this.outputChannel = outputChannel;
        this.config = { ...this.DEFAULT_CONFIG, ...customConfig };
    }
    /**
     * Start watching files
     */
    startWatching(onReload) {
        if (this.isWatching) {
            this.outputChannel.appendLine('⚠️ Already watching files');
            return new vscode.Disposable(() => { });
        }
        this.reloadCallback = onReload;
        this.isWatching = true;
        this.outputChannel.appendLine('👁️ Starting file watcher...');
        this.outputChannel.appendLine(`📋 Watching patterns: ${this.config.patterns.join(', ')}`);
        // Create watchers for each pattern
        for (const pattern of this.config.patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], pattern));
            // File changed
            watcher.onDidChange((uri) => {
                if (this.shouldWatch(uri)) {
                    this.handleFileChange('change', uri);
                }
            });
            // File created
            watcher.onDidCreate((uri) => {
                if (this.shouldWatch(uri)) {
                    this.handleFileChange('create', uri);
                }
            });
            // File deleted
            watcher.onDidDelete((uri) => {
                if (this.shouldWatch(uri)) {
                    this.handleFileChange('delete', uri);
                }
            });
            this.watchers.push(watcher);
        }
        this.outputChannel.appendLine(`✅ File watcher active (${this.watchers.length} patterns)`);
        // Return disposable to stop watching
        return new vscode.Disposable(() => this.stopWatching());
    }
    /**
     * Stop watching files
     */
    stopWatching() {
        if (!this.isWatching) {
            return;
        }
        this.outputChannel.appendLine('🛑 Stopping file watcher...');
        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }
        // Dispose all watchers
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];
        this.pendingChanges = [];
        this.isWatching = false;
        this.reloadCallback = undefined;
        this.outputChannel.appendLine('✅ File watcher stopped');
    }
    /**
     * Handle file change with debouncing
     */
    handleFileChange(type, uri) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        const event = {
            type,
            uri,
            relativePath,
            timestamp: Date.now(),
        };
        // Add to pending changes
        this.pendingChanges.push(event);
        // Log the change
        const emoji = type === 'change' ? '📝' : type === 'create' ? '🆕' : '🗑️';
        this.outputChannel.appendLine(`${emoji} ${type}: ${relativePath}`);
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        // Set new debounce timer
        this.debounceTimer = setTimeout(() => {
            this.flushPendingChanges();
        }, this.config.debounceMs);
    }
    /**
     * Flush pending changes and trigger reload
     */
    flushPendingChanges() {
        if (this.pendingChanges.length === 0 || !this.reloadCallback) {
            return;
        }
        const changes = [...this.pendingChanges];
        this.pendingChanges = [];
        // Group changes by type
        const changeCount = changes.filter(c => c.type === 'change').length;
        const createCount = changes.filter(c => c.type === 'create').length;
        const deleteCount = changes.filter(c => c.type === 'delete').length;
        this.outputChannel.appendLine(`🔄 Triggering reload: ${changeCount} changed, ${createCount} created, ${deleteCount} deleted`);
        // Trigger reload with the most recent change
        const latestChange = changes[changes.length - 1];
        this.reloadCallback(latestChange);
        // Clear timer
        this.debounceTimer = undefined;
    }
    /**
     * Check if file should be watched
     */
    shouldWatch(uri) {
        const filePath = uri.fsPath;
        // Check ignore patterns
        for (const pattern of this.config.ignorePatterns) {
            if (this.matchesPattern(filePath, pattern)) {
                return false;
            }
        }
        // Check excluded directories
        for (const dir of this.config.excludeDirs) {
            if (filePath.includes(`${path.sep}${dir}${path.sep}`) || filePath.includes(`${path.sep}${dir}`)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Simple glob pattern matching
     */
    matchesPattern(filePath, pattern) {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\*\*/g, '.*') // ** matches any path
            .replace(/\*/g, '[^/]*') // * matches anything except /
            .replace(/\./g, '\\.') // Escape dots
            .replace(/\//g, '[\\\\/]'); // Handle both / and \
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(filePath);
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const wasWatching = this.isWatching;
        const callback = this.reloadCallback;
        // Stop watching if active
        if (wasWatching) {
            this.stopWatching();
        }
        // Update config
        this.config = { ...this.config, ...newConfig };
        this.outputChannel.appendLine('⚙️ File watcher configuration updated');
        // Restart watching if was active
        if (wasWatching && callback) {
            this.startWatching(callback);
        }
    }
    /**
     * Add custom patterns to watch
     */
    addPatterns(patterns) {
        this.updateConfig({
            patterns: [...this.config.patterns, ...patterns],
        });
    }
    /**
     * Add patterns to ignore
     */
    addIgnorePatterns(patterns) {
        this.updateConfig({
            ignorePatterns: [...this.config.ignorePatterns, ...patterns],
        });
    }
    /**
     * Get current watching status
     */
    isActive() {
        return this.isWatching;
    }
    /**
     * Force immediate reload (bypass debounce)
     */
    forceReload() {
        if (this.pendingChanges.length > 0) {
            this.flushPendingChanges();
        }
        else if (this.reloadCallback) {
            // Create a synthetic change event
            const event = {
                type: 'change',
                uri: vscode.Uri.file(''),
                relativePath: 'manual-reload',
                timestamp: Date.now(),
            };
            this.outputChannel.appendLine('🔄 Manual reload triggered');
            this.reloadCallback(event);
        }
    }
    /**
     * Get statistics about file changes
     */
    getStats() {
        return {
            totalChanges: this.pendingChanges.length,
            patterns: this.watchers.length,
            active: this.isWatching,
        };
    }
}
exports.FileWatcher = FileWatcher;
//# sourceMappingURL=FileWatcher.js.map