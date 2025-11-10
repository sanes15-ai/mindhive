import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';

/**
 * CONTEXT-AWARE CODE ACTIONS PROVIDER
 * 
 * Intelligent code actions based on NEXUS analysis, multi-model consensus,
 * and collective intelligence patterns.
 * 
 * Features:
 * - Smart refactoring suggestions
 * - Performance optimization (O(n²) → O(n log n))
 * - Security vulnerability fixes
 * - Best practice recommendations
 * - Pattern-based improvements
 * - NEXUS-verified transformations
 */

interface CodeAnalysis {
  issues: Array<{
    type: 'performance' | 'security' | 'maintainability' | 'bug';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    line: number;
    suggestedFix?: string;
    confidence: number;
  }>;
  patterns: Array<{
    name: string;
    usageCount: number;
    successRate: number;
    suggestion: string;
  }>;
  metrics: {
    complexity: number;
    maintainability: number;
    security: number;
  };
}

export class CodeActionsProvider implements vscode.CodeActionProvider {
  private analysisCache = new Map<string, { analysis: CodeAnalysis; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor(private client: MindHiveClient) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<(vscode.CodeAction | vscode.Command)[]> {
    const actions: vscode.CodeAction[] = [];

    // Get code context
    const code = document.getText(range);
    const fullCode = document.getText();
    const language = document.languageId;

    // Quick actions (always available)
    actions.push(...this.getQuickActions(document, range, context));

    // If there's selected code, analyze it deeply
    if (!range.isEmpty && code.trim().length > 10) {
      try {
        const analysis = await this.analyzeCode(fullCode, code, language, range);
        
        if (analysis) {
          // Add issue-based actions
          actions.push(...this.getIssueActions(document, range, analysis));
          
          // Add pattern-based actions
          actions.push(...this.getPatternActions(document, range, analysis));
          
          // Add refactoring actions
          actions.push(...this.getRefactoringActions(document, range, analysis));
        }
      } catch (error) {
        // Silent fail - don't block quick actions
        console.error('Code analysis failed:', error);
      }
    }

    // Diagnostic-based actions (errors, warnings)
    if (context.diagnostics.length > 0) {
      actions.push(...this.getDiagnosticActions(document, range, context));
    }

    return actions;
  }

  /**
   * Get quick actions (always available)
   */
  private getQuickActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Ask MindHive
    const askAction = new vscode.CodeAction(
      '🧠 Ask MindHive about this',
      vscode.CodeActionKind.Empty
    );
    askAction.command = {
      command: 'mindhive.ask',
      title: 'Ask MindHive',
    };
    actions.push(askAction);

    // Verify with NEXUS
    const verifyAction = new vscode.CodeAction(
      '🛡️ Verify with NEXUS',
      vscode.CodeActionKind.Source
    );
    verifyAction.command = {
      command: 'MindHive.verifyCode',
      title: 'Verify Code',
      arguments: [document, range],
    };
    actions.push(verifyAction);

    // Generate tests
    if (!range.isEmpty) {
      const testAction = new vscode.CodeAction(
        '✅ Generate Tests',
        vscode.CodeActionKind.Refactor
      );
      testAction.command = {
        command: 'mindhive.generateTests',
        title: 'Generate Tests',
        arguments: [document, range],
      };
      actions.push(testAction);

      // Explain code
      const explainAction = new vscode.CodeAction(
        '💡 Explain This Code',
        vscode.CodeActionKind.Empty
      );
      explainAction.command = {
        command: 'mindhive.explainCode',
        title: 'Explain Code',
        arguments: [document, range],
      };
      actions.push(explainAction);
    }

    return actions;
  }

  /**
   * Analyze code with NEXUS and get suggestions
   */
  private async analyzeCode(
    fullCode: string,
    selectedCode: string,
    language: string,
    range: vscode.Range
  ): Promise<CodeAnalysis | null> {
    // Check cache first
    const cacheKey = `${language}:${selectedCode}`;
    const cached = this.analysisCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.analysis;
    }

    try {
      // Call backend for deep analysis
      const result = await this.client.post<CodeAnalysis>('/api/v1/code/analyze', {
        code: fullCode,
        selectedCode,
        language,
        startLine: range.start.line,
        endLine: range.end.line,
        includePatterns: true,
        includeMetrics: true,
      });

      // Cache result
      this.analysisCache.set(cacheKey, {
        analysis: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('Analysis failed:', error);
      return null;
    }
  }

  /**
   * Get actions based on detected issues
   */
  private getIssueActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    analysis: CodeAnalysis
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const issue of analysis.issues) {
      // Only show high-confidence issues
      if (issue.confidence < 0.7) {
        continue;
      }

      let icon = '';
      let kind = vscode.CodeActionKind.QuickFix;

      switch (issue.type) {
        case 'security':
          icon = '🔒';
          kind = vscode.CodeActionKind.QuickFix;
          break;
        case 'performance':
          icon = '⚡';
          kind = vscode.CodeActionKind.RefactorRewrite;
          break;
        case 'bug':
          icon = '🐛';
          kind = vscode.CodeActionKind.QuickFix;
          break;
        case 'maintainability':
          icon = '🔧';
          kind = vscode.CodeActionKind.RefactorRewrite;
          break;
      }

      const action = new vscode.CodeAction(
        `${icon} ${issue.message} (${Math.round(issue.confidence * 100)}% confident)`,
        kind
      );

      action.isPreferred = issue.severity === 'critical' || issue.severity === 'high';
      
      if (issue.suggestedFix) {
        // Apply fix directly
        action.command = {
          command: 'mindhive.applyCodeFix',
          title: 'Apply Fix',
          arguments: [document, range, issue.suggestedFix, issue.message],
        };
      } else {
        // Generate fix via AI
        action.command = {
          command: 'mindhive.generateFix',
          title: 'Generate Fix',
          arguments: [document, range, issue],
        };
      }

      actions.push(action);
    }

    return actions;
  }

  /**
   * Get actions based on collective patterns
   */
  private getPatternActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    analysis: CodeAnalysis
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const pattern of analysis.patterns) {
      // Only suggest highly successful patterns
      if (pattern.successRate < 0.85 || pattern.usageCount < 100) {
        continue;
      }

      const action = new vscode.CodeAction(
        `🌐 ${pattern.suggestion} (${pattern.usageCount.toLocaleString()} devs, ${Math.round(pattern.successRate * 100)}% success)`,
        vscode.CodeActionKind.RefactorRewrite
      );

      action.command = {
        command: 'mindhive.applyPattern',
        title: 'Apply Pattern',
        arguments: [document, range, pattern],
      };

      actions.push(action);
    }

    return actions;
  }

  /**
   * Get smart refactoring actions based on metrics
   */
  private getRefactoringActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    analysis: CodeAnalysis
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Complexity-based refactoring
    if (analysis.metrics.complexity > 10) {
      const simplifyAction = new vscode.CodeAction(
        `🔀 Simplify (Complexity: ${analysis.metrics.complexity})`,
        vscode.CodeActionKind.RefactorRewrite
      );
      simplifyAction.command = {
        command: 'mindhive.simplifyCode',
        title: 'Simplify Code',
        arguments: [document, range],
      };
      actions.push(simplifyAction);
    }

    // Extract method/function
    const lines = document.getText(range).split('\n').length;
    if (lines > 15) {
      const extractAction = new vscode.CodeAction(
        '📦 Extract to Function',
        vscode.CodeActionKind.RefactorExtract
      );
      extractAction.command = {
        command: 'mindhive.extractFunction',
        title: 'Extract Function',
        arguments: [document, range],
      };
      actions.push(extractAction);
    }

    // Maintainability improvements
    if (analysis.metrics.maintainability < 70) {
      const improveAction = new vscode.CodeAction(
        `🔧 Improve Maintainability (${analysis.metrics.maintainability}%)`,
        vscode.CodeActionKind.RefactorRewrite
      );
      improveAction.command = {
        command: 'mindhive.improveMaintainability',
        title: 'Improve Maintainability',
        arguments: [document, range],
      };
      actions.push(improveAction);
    }

    // Add documentation
    const addDocsAction = new vscode.CodeAction(
      '📝 Add Documentation',
      vscode.CodeActionKind.Source
    );
    addDocsAction.command = {
      command: 'mindhive.addDocumentation',
      title: 'Add Documentation',
      arguments: [document, range],
    };
    actions.push(addDocsAction);

    return actions;
  }

  /**
   * Get actions for diagnostics (errors/warnings)
   */
  private getDiagnosticActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const errors = context.diagnostics.filter(
      d => d.severity === vscode.DiagnosticSeverity.Error
    );

    if (errors.length > 0) {
      // Fix all errors
      const fixAllAction = new vscode.CodeAction(
        `🔧 Fix ${errors.length} Error${errors.length > 1 ? 's' : ''} with AI`,
        vscode.CodeActionKind.QuickFix
      );
      fixAllAction.isPreferred = true;
      fixAllAction.command = {
        command: 'mindhive.fixAllErrors',
        title: 'Fix All Errors',
        arguments: [document, errors],
      };
      actions.push(fixAllAction);

      // Time-Travel Debug
      const debugAction = new vscode.CodeAction(
        '🕰️ Time-Travel Debug',
        vscode.CodeActionKind.QuickFix
      );
      debugAction.command = {
        command: 'mindhive.timeTravelDebug',
        title: 'Time-Travel Debug',
      };
      actions.push(debugAction);
    }

    return actions;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.analysisCache.clear();
  }
}

