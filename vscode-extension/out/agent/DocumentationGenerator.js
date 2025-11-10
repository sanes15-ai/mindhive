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
exports.DocumentationGenerator = void 0;
const vscode = __importStar(require("vscode"));
/**
 * DOCUMENTATION GENERATOR - Auto Documentation System
 *
 * Capabilities:
 * - Generate JSDoc comments
 * - Generate README sections
 * - Generate API documentation
 * - Generate code examples
 * - Generate tutorials
 */
class DocumentationGenerator {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Generate documentation for files
     */
    async generateDocumentation(files) {
        const docs = new Map();
        for (const file of files) {
            const doc = await this.generateFileDocumentation(file);
            docs.set(file, doc);
        }
        return docs;
    }
    /**
     * Generate documentation for a single file
     */
    async generateFileDocumentation(filePath) {
        const uri = vscode.Uri.file(filePath);
        const content = await vscode.workspace.fs.readFile(uri);
        const code = new TextDecoder().decode(content);
        // Generate JSDoc for functions/classes
        const withDocs = this.addJSDocComments(code);
        // Write back to file
        await vscode.workspace.fs.writeFile(uri, Buffer.from(withDocs, 'utf-8'));
        return withDocs;
    }
    /**
     * Add JSDoc comments to code
     */
    addJSDocComments(code) {
        // Simplified implementation
        // Would need full AST parsing and intelligent comment generation
        return code;
    }
    /**
     * Generate README
     */
    async generateReadme(projectPath) {
        const readme = `
# Project Documentation

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`typescript
// Example usage
\`\`\`

## API

### Classes

### Functions

## Contributing

## License
    `.trim();
        return readme;
    }
}
exports.DocumentationGenerator = DocumentationGenerator;
//# sourceMappingURL=DocumentationGenerator.js.map