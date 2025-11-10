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
exports.CodeAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const ts = __importStar(require("typescript"));
class CodeAnalyzer {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Analyze code files
     */
    async analyzeCode(files) {
        const results = [];
        for (const file of files) {
            const result = await this.analyzeFile(file);
            results.push(result);
        }
        return results;
    }
    /**
     * Analyze a single file
     */
    async analyzeFile(filePath) {
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        const code = new TextDecoder().decode(content);
        // Parse AST
        const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
        // Analyze metrics
        const metrics = this.calculateMetrics(sourceFile, code);
        // Find issues
        const issues = this.findIssues(sourceFile, code);
        // Extract dependencies
        const dependencies = this.extractDependencies(sourceFile);
        // Extract exports
        const exports = this.extractExports(sourceFile);
        // Security scan
        const security = this.scanSecuritySync(sourceFile, code);
        return {
            file: filePath,
            metrics,
            issues,
            dependencies,
            exports,
            security
        };
    }
    /**
     * Calculate code metrics
     */
    calculateMetrics(sourceFile, code) {
        let functions = 0;
        let classes = 0;
        let complexity = 0;
        const visit = (node) => {
            if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
                functions++;
                complexity += this.calculateComplexity(node);
            }
            else if (ts.isClassDeclaration(node)) {
                classes++;
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        const lines = code.split('\n').length;
        // Simplified maintainability index (real formula is more complex)
        const maintainability = Math.max(0, 100 - (complexity * 0.5) - (lines * 0.01));
        return {
            lines,
            functions,
            classes,
            complexity,
            maintainability,
            duplicateLines: 0 // Would need more sophisticated analysis
        };
    }
    /**
     * Calculate cyclomatic complexity
     */
    calculateComplexity(node) {
        let complexity = 1; // Base complexity
        const visit = (n) => {
            // Count decision points
            if (ts.isIfStatement(n) ||
                ts.isWhileStatement(n) ||
                ts.isForStatement(n) ||
                ts.isForInStatement(n) ||
                ts.isForOfStatement(n) ||
                ts.isConditionalExpression(n) ||
                ts.isCaseClause(n)) {
                complexity++;
            }
            // Count logical operators
            if (ts.isBinaryExpression(n)) {
                if (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                    n.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
                    complexity++;
                }
            }
            ts.forEachChild(n, visit);
        };
        visit(node);
        return complexity;
    }
    /**
     * Find code issues
     */
    findIssues(sourceFile, code) {
        const issues = [];
        const visit = (node) => {
            // Long functions
            if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
                const start = sourceFile.getLineAndCharacterOfPosition(node.pos);
                const end = sourceFile.getLineAndCharacterOfPosition(node.end);
                const lines = end.line - start.line;
                if (lines > 50) {
                    issues.push({
                        type: 'warning',
                        message: `Function is too long (${lines} lines). Consider breaking it down.`,
                        line: start.line + 1,
                        column: start.character,
                        severity: 'medium',
                        suggestion: 'Extract smaller functions'
                    });
                }
            }
            // Too many parameters
            if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
                if (node.parameters.length > 5) {
                    const pos = sourceFile.getLineAndCharacterOfPosition(node.pos);
                    issues.push({
                        type: 'warning',
                        message: `Function has too many parameters (${node.parameters.length})`,
                        line: pos.line + 1,
                        column: pos.character,
                        severity: 'low',
                        suggestion: 'Use an options object instead'
                    });
                }
            }
            // Deeply nested code
            const depth = this.getNodeDepth(node);
            if (depth > 4) {
                const pos = sourceFile.getLineAndCharacterOfPosition(node.pos);
                issues.push({
                    type: 'warning',
                    message: `Code is too deeply nested (depth: ${depth})`,
                    line: pos.line + 1,
                    column: pos.character,
                    severity: 'medium',
                    suggestion: 'Extract nested logic or use early returns'
                });
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return issues;
    }
    /**
     * Extract dependencies
     */
    extractDependencies(sourceFile) {
        const dependencies = [];
        const visit = (node) => {
            if (ts.isImportDeclaration(node)) {
                const moduleSpecifier = node.moduleSpecifier;
                if (ts.isStringLiteral(moduleSpecifier)) {
                    dependencies.push(moduleSpecifier.text);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return [...new Set(dependencies)]; // Unique dependencies
    }
    /**
     * Extract exports
     */
    extractExports(sourceFile) {
        const exports = [];
        const visit = (node) => {
            if (ts.isExportDeclaration(node)) {
                // Handle export { a, b } from 'module'
                if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                    node.exportClause.elements.forEach(element => {
                        exports.push(element.name.text);
                    });
                }
            }
            else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isVariableStatement(node)) &&
                node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                // Handle export function/class/const
                if (ts.isFunctionDeclaration(node) && node.name) {
                    exports.push(node.name.text);
                }
                else if (ts.isClassDeclaration(node) && node.name) {
                    exports.push(node.name.text);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return [...new Set(exports)];
    }
    /**
     * Scan for security issues
     */
    async scanSecurity(files) {
        const allIssues = [];
        for (const file of files) {
            const uri = vscode.Uri.file(file);
            const content = await vscode.workspace.fs.readFile(uri);
            const code = new TextDecoder().decode(content);
            const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
            const issues = this.scanSecuritySync(sourceFile, code);
            allIssues.push(...issues);
        }
        return allIssues;
    }
    /**
     * Scan a file for security issues (synchronous)
     */
    scanSecuritySync(sourceFile, code) {
        const issues = [];
        // Check for dangerous patterns
        const dangerousPatterns = [
            { pattern: /eval\(/g, message: 'Use of eval() is dangerous', severity: 'critical' },
            { pattern: /innerHTML\s*=/g, message: 'innerHTML can lead to XSS', severity: 'high' },
            { pattern: /document\.write/g, message: 'document.write can be unsafe', severity: 'medium' },
            { pattern: /new Function\(/g, message: 'Function constructor is dangerous', severity: 'high' },
            { pattern: /dangerouslySetInnerHTML/g, message: 'dangerouslySetInnerHTML can cause XSS', severity: 'high' }
        ];
        const lines = code.split('\n');
        dangerousPatterns.forEach(({ pattern, message, severity }) => {
            lines.forEach((line, index) => {
                if (pattern.test(line)) {
                    issues.push({
                        type: 'vulnerability',
                        message,
                        line: index + 1,
                        severity,
                        cwe: 'CWE-79' // XSS
                    });
                }
            });
        });
        return issues;
    }
    /**
     * Get node depth in AST
     */
    getNodeDepth(node) {
        let depth = 0;
        let current = node;
        while (current) {
            if (ts.isBlock(current) ||
                ts.isIfStatement(current) ||
                ts.isWhileStatement(current) ||
                ts.isForStatement(current)) {
                depth++;
            }
            current = current.parent;
        }
        return depth;
    }
    /**
     * Generate dependency graph
     */
    async generateDependencyGraph(files) {
        const graph = new Map();
        for (const file of files) {
            const result = await this.analyzeFile(file);
            graph.set(file, result.dependencies);
        }
        return graph;
    }
}
exports.CodeAnalyzer = CodeAnalyzer;
//# sourceMappingURL=CodeAnalyzer.js.map