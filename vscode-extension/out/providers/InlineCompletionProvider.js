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
exports.InlineCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
class InlineCompletionProvider {
    client;
    authManager;
    cache = new Map();
    debounceTimer = null;
    lastRequest = null;
    CACHE_TTL = 30000; // 30 seconds
    DEBOUNCE_DELAY = 150; // 150ms
    MIN_TRIGGER_LENGTH = 2;
    isGenerating = false;
    constructor(client, authManager) {
        this.client = client;
        this.authManager = authManager;
    }
    async provideInlineCompletionItems(document, position, context, token) {
        // Check if enabled
        const config = vscode.workspace.getConfiguration('mindhive');
        if (!config.get('inlineCompletions.enabled', true)) {
            return null;
        }
        // Check auth
        if (!(await this.authManager.isAuthenticated())) {
            return null;
        }
        // Don't trigger if already generating
        if (this.isGenerating) {
            return null;
        }
        // Check if we should trigger
        if (!this.shouldTriggerCompletion(document, position, context)) {
            return null;
        }
        // Build cache key
        const cacheKey = this.buildCacheKey(document, position);
        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return [
                new vscode.InlineCompletionItem(cached, new vscode.Range(position, position)),
            ];
        }
        // Check cancellation
        if (token.isCancellationRequested) {
            return null;
        }
        try {
            this.isGenerating = true;
            // Get smart context
            const promptContext = await this.buildContext(document, position);
            // Get completion from API
            const completion = await this.getCompletion(document, position, promptContext, token);
            if (completion && !token.isCancellationRequested) {
                // Cache the result
                this.setCache(cacheKey, completion);
                // Return completion
                return [
                    new vscode.InlineCompletionItem(completion, new vscode.Range(position, position)),
                ];
            }
        }
        catch (error) {
            console.error('MindHive completion error:', error);
        }
        finally {
            this.isGenerating = false;
        }
        return null;
    }
    shouldTriggerCompletion(document, position, context) {
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        const textAfterCursor = line.text.substring(position.character);
        // Don't trigger in strings or comments (unless intentional)
        const syntax = this.getTokenType(document, position);
        if (syntax === 'string' || syntax === 'comment') {
            const config = vscode.workspace.getConfiguration('mindhive');
            if (!config.get('inlineCompletions.triggerInComments', false)) {
                return false;
            }
        }
        // Don't trigger if cursor is in the middle of a word
        if (textAfterCursor.match(/^[a-zA-Z0-9_]/)) {
            return false;
        }
        // Require minimum text
        const trimmed = textBeforeCursor.trim();
        if (trimmed.length < this.MIN_TRIGGER_LENGTH) {
            return false;
        }
        // Check for specific trigger characters
        const lastChar = textBeforeCursor[textBeforeCursor.length - 1];
        const triggerChars = ['.', '(', '{', '[', ':', '=', ' ', '\t'];
        // Trigger on specific characters or after meaningful code
        if (triggerChars.includes(lastChar) || this.hasMeaningfulCode(trimmed)) {
            return true;
        }
        return false;
    }
    hasMeaningfulCode(text) {
        // Check for keywords, function calls, variable declarations
        const meaningfulPatterns = [
            /\b(function|const|let|var|class|if|for|while|return|import|export)\s+\w+/,
            /\w+\s*\(/, // Function call
            /\w+\s*=/, // Assignment
            /\w+\.\w+/, // Property access
        ];
        return meaningfulPatterns.some(pattern => pattern.test(text));
    }
    getTokenType(document, position) {
        const line = document.lineAt(position.line).text;
        const textBefore = line.substring(0, position.character);
        // Simple heuristic - can be improved with language-specific parsers
        const inString = (textBefore.match(/"/g)?.length || 0) % 2 === 1 ||
            (textBefore.match(/'/g)?.length || 0) % 2 === 1 ||
            (textBefore.match(/`/g)?.length || 0) % 2 === 1;
        if (inString)
            return 'string';
        const inComment = textBefore.trim().startsWith('//') ||
            textBefore.trim().startsWith('/*') ||
            textBefore.trim().startsWith('*');
        if (inComment)
            return 'comment';
        return 'code';
    }
    async buildContext(document, position) {
        const config = vscode.workspace.getConfiguration('mindhive');
        const contextLines = config.get('inlineCompletions.contextLines', 50);
        // Get surrounding code
        const startLine = Math.max(0, position.line - contextLines);
        const endLine = Math.min(document.lineCount - 1, position.line + 10);
        const contextRange = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, document.lineAt(endLine).text.length));
        let context = document.getText(contextRange);
        // Add imports if near top of file
        if (position.line < 20) {
            const imports = this.extractImports(document);
            if (imports) {
                context = imports + '\n\n' + context;
            }
        }
        // Add related files context (if available)
        const relatedContext = await this.getRelatedFilesContext(document);
        if (relatedContext) {
            context = relatedContext + '\n\n' + context;
        }
        return context;
    }
    extractImports(document) {
        const firstLines = Math.min(30, document.lineCount);
        let imports = '';
        for (let i = 0; i < firstLines; i++) {
            const line = document.lineAt(i).text;
            if (line.match(/^(import|from|require|#include|using)/)) {
                imports += line + '\n';
            }
        }
        return imports || null;
    }
    async getRelatedFilesContext(document) {
        // TODO: Implement smart file detection based on imports
        // For now, return null
        return null;
    }
    async getCompletion(document, position, context, token) {
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        const textAfterCursor = line.text.substring(position.character);
        // Get project memory if available
        const projectPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        let projectMemoryId;
        if (projectPath) {
            try {
                const projectMemory = await this.client.getOrCreateProjectMemory(projectPath, vscode.workspace.name || 'Untitled');
                projectMemoryId = projectMemory.id;
            }
            catch (error) {
                console.warn('Could not load project memory:', error);
            }
        }
        // Build focused prompt
        const prompt = this.buildCompletionPrompt(textBeforeCursor, textAfterCursor, context);
        try {
            // Call API with timeout
            const response = await Promise.race([
                this.client.generateCode({
                    prompt,
                    language: document.languageId,
                    context: `Current line: ${line.text}\nCursor position: ${position.character}\n\nFile context:\n${context}`,
                }),
                new Promise((resolve) => setTimeout(() => resolve(null), 3000)), // 3s timeout
            ]);
            if (!response || token.isCancellationRequested) {
                return null;
            }
            // Extract only the completion part (not full code)
            const completion = this.extractCompletion(response.code, textBeforeCursor, textAfterCursor);
            return completion;
        }
        catch (error) {
            console.error('Completion API error:', error);
            return null;
        }
    }
    buildCompletionPrompt(before, after, context) {
        return `Complete the code at the cursor position. Only provide the completion, not the entire code.

Context:
\`\`\`
${context}
\`\`\`

Current line:
\`\`\`
${before}<CURSOR>${after}
\`\`\`

Provide a natural, idiomatic completion. Only return the text that should appear after the cursor.`;
    }
    extractCompletion(generatedCode, textBefore, textAfter) {
        // Remove code fences if present
        let code = generatedCode.replace(/```[\w]*\n?/g, '').trim();
        // Try to find the completion part
        const lines = code.split('\n');
        // If single line, return it
        if (lines.length === 1) {
            return lines[0];
        }
        // For multi-line, try to find where the cursor would be
        const beforeTrimmed = textBefore.trim();
        const lineWithCompletion = lines.find(line => line.includes(beforeTrimmed) ||
            line.trim().startsWith(beforeTrimmed.split(/\s+/).pop() || ''));
        if (lineWithCompletion) {
            const index = lineWithCompletion.indexOf(beforeTrimmed);
            if (index >= 0) {
                return lineWithCompletion.substring(index + beforeTrimmed.length);
            }
        }
        // Return first 3 lines as multi-line completion
        return lines.slice(0, 3).join('\n');
    }
    buildCacheKey(document, position) {
        const line = document.lineAt(position.line);
        const textBefore = line.text.substring(0, position.character);
        return `${document.uri.toString()}:${position.line}:${textBefore}`;
    }
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        // Check TTL
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }
        return cached.completion;
    }
    setCache(key, completion) {
        // Limit cache size
        if (this.cache.size > 100) {
            const oldestKey = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            key,
            completion,
            timestamp: Date.now(),
        });
    }
    clearCache() {
        this.cache.clear();
    }
}
exports.InlineCompletionProvider = InlineCompletionProvider;
//# sourceMappingURL=InlineCompletionProvider.js.map