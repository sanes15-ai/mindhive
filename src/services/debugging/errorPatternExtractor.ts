/**
 * Error Pattern Extraction Engine
 * Parses error logs and extracts normalized patterns for matching
 */

import crypto from 'crypto';

export interface ErrorLog {
  errorMessage: string;
  stackTrace: string;
  errorType?: string;
  filePath?: string;
  lineNumber?: number;
  codeSnippet?: string;
  environment?: string;
  language?: string;
  framework?: string;
}

export interface ExtractedPattern {
  signature: string;
  errorType: string;
  errorMessage: string;
  normalizedStack: string;
  language: string;
  framework?: string;
  category: string;
  severity: string;
  keyFrames: string[];
  tags: string[];
}

export class ErrorPatternExtractor {
  /**
   * Extract normalized pattern from error log
   */
  extractPattern(errorLog: ErrorLog): ExtractedPattern {
    const errorType = this.detectErrorType(errorLog);
    const normalizedMessage = this.normalizeMessage(errorLog.errorMessage);
    const normalizedStack = this.normalizeStackTrace(errorLog.stackTrace);
    const keyFrames = this.extractKeyFrames(errorLog.stackTrace);
    const category = this.categorizeError(errorType, normalizedMessage, normalizedStack);
    const severity = this.determineSeverity(errorType, category, errorLog.environment);
    const language = this.detectLanguage(errorLog);
    const framework = this.detectFramework(errorLog);
    const tags = this.generateTags(errorType, category, framework);

    // Generate unique signature
    const signature = this.generateSignature(errorType, normalizedMessage, keyFrames);

    return {
      signature,
      errorType,
      errorMessage: normalizedMessage,
      normalizedStack,
      language,
      framework,
      category,
      severity,
      keyFrames,
      tags,
    };
  }

  /**
   * Detect error type from message and stack trace
   */
  private detectErrorType(errorLog: ErrorLog): string {
    const { errorMessage, stackTrace, errorType } = errorLog;

    // If explicitly provided
    if (errorType) return errorType;

    // Common JavaScript/TypeScript errors
    if (/cannot read propert/i.test(errorMessage)) return 'TypeError';
    if (/is not defined|is not a function/i.test(errorMessage)) return 'ReferenceError';
    if (/unexpected token|unexpected end/i.test(errorMessage)) return 'SyntaxError';
    if (/maximum call stack/i.test(errorMessage)) return 'RangeError';
    if (/null|undefined/i.test(errorMessage)) return 'NullReferenceError';

    // Python errors
    if (/AttributeError|NameError|TypeError|ValueError/i.test(errorMessage)) {
      return errorMessage.match(/^(\w+Error)/)?.[1] || 'PythonError';
    }

    // Network/Async errors
    if (/timeout|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(errorMessage)) return 'NetworkError';
    if (/promise|async/i.test(errorMessage)) return 'AsyncError';

    // Database errors
    if (/sql|database|query|connection/i.test(errorMessage)) return 'DatabaseError';

    return 'UnknownError';
  }

  /**
   * Normalize error message (remove variable values, paths, IDs)
   */
  private normalizeMessage(message: string): string {
    return message
      // Remove file paths
      .replace(/[A-Z]:\\[^:\s]+/g, '<PATH>')
      .replace(/\/[\w/.-]+\.(js|ts|py|java|go|rb)/gi, '<FILE>')
      // Remove numbers (IDs, ports, etc.)
      .replace(/\b\d+\b/g, '<NUM>')
      // Remove quoted strings
      .replace(/"[^"]*"/g, '<STR>')
      .replace(/'[^']*'/g, '<STR>')
      // Remove hex values
      .replace(/0x[0-9a-f]+/gi, '<HEX>')
      // Remove UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize stack trace (remove specific paths, line numbers)
   */
  private normalizeStackTrace(stackTrace: string): string {
    const lines = stackTrace.split('\n');
    const normalized = lines.map((line) => {
      return line
        // Remove absolute paths
        .replace(/[A-Z]:\\[^:\s)]+/g, '<PATH>')
        .replace(/\/[\w/.-]+/g, '<PATH>')
        // Remove line:column numbers
        .replace(/:\d+:\d+/g, ':LINE:COL')
        // Remove just line numbers
        .replace(/:\d+/g, ':LINE')
        // Remove anonymous function IDs
        .replace(/<anonymous>/g, '<ANON>')
        // Remove webpack module IDs
        .replace(/webpack:\/\/\/\./g, '<MODULE>')
        .trim();
    });

    // Remove empty lines
    return normalized.filter((line) => line.length > 0).join('\n');
  }

  /**
   * Extract key stack frames (most relevant for pattern matching)
   */
  private extractKeyFrames(stackTrace: string): string[] {
    const lines = stackTrace.split('\n');
    const frames: string[] = [];

    for (const line of lines) {
      // Skip node_modules and internal Node.js frames
      if (line.includes('node_modules') || line.includes('internal/')) continue;

      // Extract function name
      const match = line.match(/at\s+([^\s(]+)/);
      if (match) {
        frames.push(match[1]);
      }
    }

    // Return top 5 frames
    return frames.slice(0, 5);
  }

  /**
   * Categorize error into predefined categories
   */
  private categorizeError(
    errorType: string,
    message: string,
    stackTrace: string
  ): string {
    // NULL_REFERENCE
    if (
      errorType === 'TypeError' &&
      /null|undefined|cannot read property/i.test(message)
    ) {
      return 'NULL_REFERENCE';
    }

    // TYPE_ERROR
    if (errorType === 'TypeError' && !/null|undefined/i.test(message)) {
      return 'TYPE_ERROR';
    }

    // SYNTAX_ERROR
    if (errorType === 'SyntaxError') return 'SYNTAX_ERROR';

    // ASYNC_ERROR
    if (/async|promise|await/i.test(message) || /async|promise/i.test(stackTrace)) {
      return 'ASYNC_ERROR';
    }

    // DEPENDENCY_ERROR
    if (/cannot find module|module not found/i.test(message)) {
      return 'DEPENDENCY_ERROR';
    }

    // CONFIGURATION_ERROR
    if (/config|environment|env/i.test(message)) {
      return 'CONFIGURATION_ERROR';
    }

    // SECURITY_ERROR
    if (/cors|csrf|unauthorized|forbidden|authentication/i.test(message)) {
      return 'SECURITY_ERROR';
    }

    // PERFORMANCE_ERROR
    if (/timeout|memory|heap|maximum call stack/i.test(message)) {
      return 'PERFORMANCE_ERROR';
    }

    return 'OTHER';
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    errorType: string,
    category: string,
    environment?: string
  ): string {
    // Production errors are automatically elevated
    const isProd = environment?.toLowerCase() === 'production';

    // CRITICAL
    if (category === 'SECURITY_ERROR' && isProd) return 'CRITICAL';
    if (category === 'PERFORMANCE_ERROR' && /heap|memory/i.test(errorType)) return 'CRITICAL';

    // HIGH
    if (isProd && category !== 'SYNTAX_ERROR') return 'HIGH';
    if (category === 'ASYNC_ERROR' || category === 'NULL_REFERENCE') return 'HIGH';

    // MEDIUM
    if (category === 'TYPE_ERROR' || category === 'DEPENDENCY_ERROR') return 'MEDIUM';

    // LOW
    return 'LOW';
  }

  /**
   * Detect programming language
   */
  private detectLanguage(errorLog: ErrorLog): string {
    if (errorLog.language) return errorLog.language;

    const { errorMessage, stackTrace } = errorLog;

    // JavaScript/TypeScript
    if (
      /TypeError|ReferenceError|SyntaxError/.test(errorMessage) ||
      /\.js|\.ts|\.jsx|\.tsx/.test(stackTrace)
    ) {
      return /\.tsx?/.test(stackTrace) ? 'typescript' : 'javascript';
    }

    // Python
    if (/Error\s*:\s*[A-Z]\w+Error/.test(errorMessage) || /\.py/.test(stackTrace)) {
      return 'python';
    }

    // Java
    if (/Exception|\.java/.test(stackTrace)) return 'java';

    // Go
    if (/panic|\.go:/.test(stackTrace)) return 'go';

    // Ruby
    if (/\.rb/.test(stackTrace)) return 'ruby';

    return 'unknown';
  }

  /**
   * Detect framework
   */
  private detectFramework(errorLog: ErrorLog): string | undefined {
    if (errorLog.framework) return errorLog.framework;

    const { stackTrace, errorMessage } = errorLog;
    const combined = `${stackTrace} ${errorMessage}`.toLowerCase();

    if (combined.includes('express')) return 'express';
    if (combined.includes('react')) return 'react';
    if (combined.includes('vue')) return 'vue';
    if (combined.includes('angular')) return 'angular';
    if (combined.includes('next')) return 'nextjs';
    if (combined.includes('django')) return 'django';
    if (combined.includes('flask')) return 'flask';
    if (combined.includes('spring')) return 'spring';

    return undefined;
  }

  /**
   * Generate tags for categorization
   */
  private generateTags(errorType: string, category: string, framework?: string): string[] {
    const tags: string[] = [errorType.toLowerCase(), category.toLowerCase()];

    if (framework) tags.push(framework);

    return tags;
  }

  /**
   * Generate unique signature for pattern matching
   */
  private generateSignature(
    errorType: string,
    normalizedMessage: string,
    keyFrames: string[]
  ): string {
    const data = `${errorType}|${normalizedMessage}|${keyFrames.join('|')}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Calculate similarity between two error patterns (0-1)
   */
  calculateSimilarity(pattern1: ExtractedPattern, pattern2: ExtractedPattern): number {
    let score = 0;
    let weights = 0;

    // Error type match (30%)
    if (pattern1.errorType === pattern2.errorType) {
      score += 0.3;
    }
    weights += 0.3;

    // Message similarity (25%)
    const messageSim = this.levenshteinSimilarity(
      pattern1.errorMessage,
      pattern2.errorMessage
    );
    score += messageSim * 0.25;
    weights += 0.25;

    // Stack trace similarity (30%)
    const stackSim = this.levenshteinSimilarity(
      pattern1.normalizedStack,
      pattern2.normalizedStack
    );
    score += stackSim * 0.3;
    weights += 0.3;

    // Key frames overlap (15%)
    const frameOverlap = this.calculateFrameOverlap(pattern1.keyFrames, pattern2.keyFrames);
    score += frameOverlap * 0.15;
    weights += 0.15;

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Calculate Levenshtein distance-based similarity
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate overlap between two frame arrays
   */
  private calculateFrameOverlap(frames1: string[], frames2: string[]): number {
    if (frames1.length === 0 || frames2.length === 0) return 0;

    const set1 = new Set(frames1);
    const set2 = new Set(frames2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    return intersection.size / Math.max(set1.size, set2.size);
  }
}
