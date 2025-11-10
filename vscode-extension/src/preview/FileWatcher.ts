import * as vscode from 'vscode';
import * as path from 'path';

/**
 * File change event
 */
export interface FileChangeEvent {
  type: 'change' | 'create' | 'delete';
  uri: vscode.Uri;
  relativePath: string;
  timestamp: number;
}

/**
 * Watcher configuration
 */
interface WatcherConfig {
  patterns: string[]; // Glob patterns to watch
  ignorePatterns: string[]; // Patterns to ignore
  debounceMs: number; // Debounce delay
  excludeDirs: string[]; // Directories to exclude
}

/**
 * Advanced file watcher for hot reload
 * Watches workspace files and triggers reload on changes
 * Includes smart debouncing and framework-specific optimizations
 */
export class FileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private outputChannel: vscode.OutputChannel;
  private reloadCallback?: (event: FileChangeEvent) => void;
  private debounceTimer?: NodeJS.Timeout;
  private pendingChanges: FileChangeEvent[] = [];
  
  private readonly DEFAULT_CONFIG: WatcherConfig = {
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

  private config: WatcherConfig;
  private isWatching: boolean = false;

  constructor(outputChannel: vscode.OutputChannel, customConfig?: Partial<WatcherConfig>) {
    this.outputChannel = outputChannel;
    this.config = { ...this.DEFAULT_CONFIG, ...customConfig };
  }

  /**
   * Start watching files
   */
  startWatching(onReload: (event: FileChangeEvent) => void): vscode.Disposable {
    if (this.isWatching) {
      this.outputChannel.appendLine('⚠️ Already watching files');
      return new vscode.Disposable(() => {});
    }

    this.reloadCallback = onReload;
    this.isWatching = true;
    
    this.outputChannel.appendLine('👁️ Starting file watcher...');
    this.outputChannel.appendLine(`📋 Watching patterns: ${this.config.patterns.join(', ')}`);

    // Create watchers for each pattern
    for (const pattern of this.config.patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], pattern)
      );

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
  stopWatching(): void {
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
  private handleFileChange(type: 'change' | 'create' | 'delete', uri: vscode.Uri): void {
    const workspaceFolder = vscode.workspace.workspaceFolders![0];
    const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

    const event: FileChangeEvent = {
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
  private flushPendingChanges(): void {
    if (this.pendingChanges.length === 0 || !this.reloadCallback) {
      return;
    }

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    // Group changes by type
    const changeCount = changes.filter(c => c.type === 'change').length;
    const createCount = changes.filter(c => c.type === 'create').length;
    const deleteCount = changes.filter(c => c.type === 'delete').length;

    this.outputChannel.appendLine(
      `🔄 Triggering reload: ${changeCount} changed, ${createCount} created, ${deleteCount} deleted`
    );

    // Trigger reload with the most recent change
    const latestChange = changes[changes.length - 1];
    this.reloadCallback(latestChange);

    // Clear timer
    this.debounceTimer = undefined;
  }

  /**
   * Check if file should be watched
   */
  private shouldWatch(uri: vscode.Uri): boolean {
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
  private matchesPattern(filePath: string, pattern: string): boolean {
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
  updateConfig(newConfig: Partial<WatcherConfig>): void {
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
  addPatterns(patterns: string[]): void {
    this.updateConfig({
      patterns: [...this.config.patterns, ...patterns],
    });
  }

  /**
   * Add patterns to ignore
   */
  addIgnorePatterns(patterns: string[]): void {
    this.updateConfig({
      ignorePatterns: [...this.config.ignorePatterns, ...patterns],
    });
  }

  /**
   * Get current watching status
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Force immediate reload (bypass debounce)
   */
  forceReload(): void {
    if (this.pendingChanges.length > 0) {
      this.flushPendingChanges();
    } else if (this.reloadCallback) {
      // Create a synthetic change event
      const event: FileChangeEvent = {
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
  getStats(): { totalChanges: number; patterns: number; active: boolean } {
    return {
      totalChanges: this.pendingChanges.length,
      patterns: this.watchers.length,
      active: this.isWatching,
    };
  }
}
