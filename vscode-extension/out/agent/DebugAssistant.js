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
exports.DebugAssistant = void 0;
const vscode = __importStar(require("vscode"));
class DebugAssistant {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Debug an issue
     */
    async debugIssue(issue) {
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
    async analyzeCrash(issue) {
        const suggestions = [];
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
    async suggestBreakpoints(issue) {
        const breakpoints = [];
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
    suggestWatchExpressions(issue) {
        const expressions = [];
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
    async applyBreakpoints(breakpoints) {
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
exports.DebugAssistant = DebugAssistant;
//# sourceMappingURL=DebugAssistant.js.map