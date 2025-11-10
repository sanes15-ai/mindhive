import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';
import { AuthManager } from '../auth/AuthManager';

interface CompletionCache {
  key: string;
  completion: string;
  timestamp: number;
}

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private cache: Map<string, CompletionCache> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastRequest: { document: string; position: number; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly DEBOUNCE_DELAY = 150; // 150ms
  private readonly MIN_TRIGGER_LENGTH = 2;
  private isGenerating = false;

  constructor(
    private client: MindHiveClient,
    private authManager: AuthManager
  ) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | null> {
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
        new vscode.InlineCompletionItem(
          cached,
          new vscode.Range(position, position)
        ),
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
      const completion = await this.getCompletion(
        document,
        position,
        promptContext,
        token
      );

      if (completion && !token.isCancellationRequested) {
        // Cache the result
        this.setCache(cacheKey, completion);

        // Return completion
        return [
          new vscode.InlineCompletionItem(
            completion,
            new vscode.Range(position, position)
          ),
        ];
      }
    } catch (error) {
      console.error('MindHive completion error:', error);
    } finally {
      this.isGenerating = false;
    }

    return null;
  }

  private shouldTriggerCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext
  ): boolean {
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

  private hasMeaningfulCode(text: string): boolean {
    // Check for keywords, function calls, variable declarations
    const meaningfulPatterns = [
      /\b(function|const|let|var|class|if|for|while|return|import|export)\s+\w+/,
      /\w+\s*\(/,  // Function call
      /\w+\s*=/, // Assignment
      /\w+\.\w+/, // Property access
    ];

    return meaningfulPatterns.some(pattern => pattern.test(text));
  }

  private getTokenType(
    document: vscode.TextDocument,
    position: vscode.Position
  ): 'code' | 'string' | 'comment' {
    const line = document.lineAt(position.line).text;
    const textBefore = line.substring(0, position.character);

    // Simple heuristic - can be improved with language-specific parsers
    const inString = (textBefore.match(/"/g)?.length || 0) % 2 === 1 ||
                     (textBefore.match(/'/g)?.length || 0) % 2 === 1 ||
                     (textBefore.match(/`/g)?.length || 0) % 2 === 1;

    if (inString) return 'string';

    const inComment = textBefore.trim().startsWith('//') ||
                      textBefore.trim().startsWith('/*') ||
                      textBefore.trim().startsWith('*');

    if (inComment) return 'comment';

    return 'code';
  }

  private async buildContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<string> {
    const config = vscode.workspace.getConfiguration('mindhive');
    const contextLines = config.get('inlineCompletions.contextLines', 50);

    // Get surrounding code
    const startLine = Math.max(0, position.line - contextLines);
    const endLine = Math.min(document.lineCount - 1, position.line + 10);

    const contextRange = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );

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

  private extractImports(document: vscode.TextDocument): string | null {
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

  private async getRelatedFilesContext(
    document: vscode.TextDocument
  ): Promise<string | null> {
    // TODO: Implement smart file detection based on imports
    // For now, return null
    return null;
  }

  private async getCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: string,
    token: vscode.CancellationToken
  ): Promise<string | null> {
    const line = document.lineAt(position.line);
    const textBeforeCursor = line.text.substring(0, position.character);
    const textAfterCursor = line.text.substring(position.character);

    // Get project memory if available
    const projectPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    let projectMemoryId: string | undefined;

    if (projectPath) {
      try {
        const projectMemory = await this.client.getOrCreateProjectMemory(
          projectPath,
          vscode.workspace.name || 'Untitled'
        );
        projectMemoryId = projectMemory.id;
      } catch (error) {
        console.warn('Could not load project memory:', error);
      }
    }

    // Build focused prompt
    const prompt = this.buildCompletionPrompt(
      textBeforeCursor,
      textAfterCursor,
      context
    );

    try {
      // Call API with timeout
      const response = await Promise.race([
        this.client.generateCode({
          prompt,
          language: document.languageId,
          context: `Current line: ${line.text}\nCursor position: ${position.character}\n\nFile context:\n${context}`,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)), // 3s timeout
      ]);

      if (!response || token.isCancellationRequested) {
        return null;
      }

      // Extract only the completion part (not full code)
      const completion = this.extractCompletion(
        response.code,
        textBeforeCursor,
        textAfterCursor
      );

      return completion;
    } catch (error) {
      console.error('Completion API error:', error);
      return null;
    }
  }

  private buildCompletionPrompt(
    before: string,
    after: string,
    context: string
  ): string {
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

  private extractCompletion(
    generatedCode: string,
    textBefore: string,
    textAfter: string
  ): string {
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
    const lineWithCompletion = lines.find(line => 
      line.includes(beforeTrimmed) || 
      line.trim().startsWith(beforeTrimmed.split(/\s+/).pop() || '')
    );

    if (lineWithCompletion) {
      const index = lineWithCompletion.indexOf(beforeTrimmed);
      if (index >= 0) {
        return lineWithCompletion.substring(index + beforeTrimmed.length);
      }
    }

    // Return first 3 lines as multi-line completion
    return lines.slice(0, 3).join('\n');
  }

  private buildCacheKey(
    document: vscode.TextDocument,
    position: vscode.Position
  ): string {
    const line = document.lineAt(position.line);
    const textBefore = line.text.substring(0, position.character);
    return `${document.uri.toString()}:${position.line}:${textBefore}`;
  }

  private getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.completion;
  }

  private setCache(key: string, completion: string): void {
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

  public clearCache(): void {
    this.cache.clear();
  }
}

