import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';

/**
 * DEBUG ASSISTANT - Intelligent Debugging System
 * 
 * Capabilities:
 * - Set smart breakpoints
 * - Analyze variable states
 * - Step through code intelligently
 * - Suggest fixes for runtime errors
 * - Watch expressions
 */

export interface DebugIssue {
  description: string;
  file: string;
  line?: number;
  stackTrace?: string;
}

export interface DebugSuggestion {
  issue: string;
  suggestions: string[];
  breakpoints: BreakpointSuggestion[];
  watchExpressions: string[];
}

export interface BreakpointSuggestion {
  file: string;
  line: number;
  condition?: string;
  reason: string;
}

export class DebugAssistant {
  private client: MindHiveClient;

  constructor(client: MindHiveClient) {
    this.client = client;
  }

  /**
   * Debug an issue
   */
  async debugIssue(issue: DebugIssue): Promise<DebugSuggestion> {
    // Analyze the issue
    const suggestions = await this.analyzeCrash(issue);
    
    // Suggest breakpoints
    const breakpoints = await this.suggestBreakpoints(issue);
    
    // Suggest watch expressions
    const watchExpressions = this.suggestWatchExpressions(issue);
    
    // Apply breakpoints
    await this.applyBreakpoints(breakpoints);
    
    return {
      issue: issue.description,
      suggestions,
      breakpoints,
      watchExpressions
    };
  }

  /**
   * Analyze crash and suggest fixes
   */
  private async analyzeCrash(issue: DebugIssue): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Common patterns
    if (issue.description.includes('undefined')) {
      suggestions.push('Add null checks before accessing properties');
      suggestions.push('Use optional chaining (?.)');
      suggestions.push('Initialize variables with default values');
    }
    
    if (issue.description.includes('Cannot read property')) {
      suggestions.push('Ensure object exists before accessing property');
      suggestions.push('Use defensive programming with null checks');
    }
    
    if (issue.description.includes('is not a function')) {
      suggestions.push('Check that the object has the method');
      suggestions.push('Verify import statements');
    }
    
    return suggestions;
  }

  /**
   * Suggest breakpoints
   */
  private async suggestBreakpoints(issue: DebugIssue): Promise<BreakpointSuggestion[]> {
    const breakpoints: BreakpointSuggestion[] = [];
    
    if (issue.file && issue.line) {
      // Add breakpoint at error line
      breakpoints.push({
        file: issue.file,
        line: issue.line,
        reason: 'Error occurred here'
      });
      
      // Add breakpoint a few lines before
      if (issue.line > 5) {
        breakpoints.push({
          file: issue.file,
          line: issue.line - 5,
          reason: 'Check state before error'
        });
      }
    }
    
    return breakpoints;
  }

  /**
   * Suggest watch expressions
   */
  private suggestWatchExpressions(issue: DebugIssue): string[] {
    const expressions: string[] = [];
    
    // Extract variable names from error message
    const variablePattern = /['"`]([a-zA-Z_$][a-zA-Z0-9_$]*)['"`]/g;
    let match;
    
    while ((match = variablePattern.exec(issue.description)) !== null) {
      expressions.push(match[1]);
    }
    
    return expressions;
  }

  /**
   * Apply breakpoints
   */
  private async applyBreakpoints(breakpoints: BreakpointSuggestion[]): Promise<void> {
    for (const bp of breakpoints) {
      const uri = vscode.Uri.file(bp.file);
      const position = new vscode.Position(bp.line - 1, 0);
      const location = new vscode.Location(uri, position);
      
      const breakpoint = new vscode.SourceBreakpoint(location, true, bp.condition);
      
      // This would need proper VS Code debugging API integration
      vscode.debug.addBreakpoints([breakpoint]);
    }
  }
}
