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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const InlineCompletionProvider_1 = require("../providers/InlineCompletionProvider");
const HiveMindClient_1 = require("../client/HiveMindClient");
const AuthManager_1 = require("../auth/AuthManager");
suite('InlineCompletionProvider Test Suite', () => {
    let provider;
    let mockClient;
    let mockAuthManager;
    setup(() => {
        // Create mock context
        const mockContext = {
            globalState: new Map(),
            secrets: {
                get: async () => 'mock-token',
                store: async () => { },
                delete: async () => { },
            },
        };
        mockAuthManager = new AuthManager_1.AuthManager(mockContext);
        mockClient = new HiveMindClient_1.MindHiveClient(mockContext, mockAuthManager);
        provider = new InlineCompletionProvider_1.InlineCompletionProvider(mockClient, mockAuthManager);
    });
    teardown(() => {
        // Clean up resources
        if ('dispose' in provider && typeof provider.dispose === 'function') {
            provider.dispose();
        }
    });
    suite('Caching', () => {
        test('should cache completions', () => {
            const cacheKey = 'test-file.ts:10:const test = ';
            const completion = 'const test = "hello world";';
            // Set cache
            provider.setCache(cacheKey, completion);
            // Get from cache
            const cached = provider.getFromCache(cacheKey);
            assert.strictEqual(cached, completion);
        });
        test('should expire cache after TTL', async () => {
            const cacheKey = 'test-file.ts:10:const test = ';
            const completion = 'const test = "hello world";';
            // Set cache
            provider.setCache(cacheKey, completion);
            // Manually set old timestamp
            const cache = provider.cache;
            const entry = cache.get(cacheKey);
            entry.timestamp = Date.now() - 31000; // 31 seconds ago
            // Should be expired
            const cached = provider.getFromCache(cacheKey);
            assert.strictEqual(cached, undefined);
        });
        test('should limit cache size', () => {
            // Fill cache beyond limit
            for (let i = 0; i < 150; i++) {
                provider.setCache(`key-${i}`, `completion-${i}`);
            }
            const cache = provider.cache;
            assert.ok(cache.size <= 100, 'Cache should not exceed 100 items');
        });
        test('should clear cache', () => {
            provider.setCache('key1', 'completion1');
            provider.setCache('key2', 'completion2');
            provider.clearCache();
            const cache = provider.cache;
            assert.strictEqual(cache.size, 0);
        });
    });
    suite('Smart Triggering', () => {
        test('should trigger on meaningful code', () => {
            const document = {
                languageId: 'typescript',
                lineAt: () => ({ text: 'function test() {' }),
            };
            const position = new vscode.Position(10, 18);
            const shouldTrigger = provider.shouldTriggerCompletion(document, position, 'function test() {');
            assert.strictEqual(shouldTrigger, true);
        });
        test('should not trigger in middle of word', () => {
            const document = {
                languageId: 'typescript',
                lineAt: () => ({ text: 'const hello' }),
            };
            const position = new vscode.Position(10, 8); // Middle of "hello"
            const shouldTrigger = provider.shouldTriggerCompletion(document, position, 'const hel');
            assert.strictEqual(shouldTrigger, false);
        });
        test('should not trigger in strings', () => {
            const textBefore = 'const str = "hello';
            const tokenType = provider.getTokenType(textBefore);
            assert.strictEqual(tokenType, 'string');
        });
        test('should not trigger in comments', () => {
            const textBefore = '// This is a comment';
            const tokenType = provider.getTokenType(textBefore);
            assert.strictEqual(tokenType, 'comment');
        });
        test('should detect meaningful code patterns', () => {
            const testCases = [
                { text: 'function test() {', expected: true },
                { text: 'const value = ', expected: true },
                { text: 'if (condition', expected: true },
                { text: 'import { ', expected: true },
                { text: 'obj.property', expected: true },
                { text: 'a', expected: false },
                { text: '  ', expected: false },
            ];
            testCases.forEach(({ text, expected }) => {
                const result = provider.hasMeaningfulCode(text);
                assert.strictEqual(result, expected, `"${text}" should ${expected ? '' : 'not '}be meaningful`);
            });
        });
    });
    suite('Context Building', () => {
        test('should extract imports', () => {
            const mockDocument = {
                lineCount: 50,
                lineAt: (line) => {
                    if (line === 0)
                        return { text: 'import { foo } from "bar";' };
                    if (line === 1)
                        return { text: 'import * as React from "react";' };
                    if (line === 2)
                        return { text: 'const test = 1;' };
                    return { text: '' };
                },
            };
            const imports = provider.extractImports(mockDocument);
            assert.ok(imports.includes('import { foo } from "bar";'));
            assert.ok(imports.includes('import * as React from "react";'));
            assert.ok(!imports.includes('const test = 1;'));
        });
        test('should build context with surrounding lines', () => {
            const mockEditor = {
                document: {
                    lineCount: 100,
                    lineAt: (line) => ({ text: `line ${line}` }),
                    getText: (range) => {
                        const lines = [];
                        for (let i = range.start.line; i <= range.end.line; i++) {
                            lines.push(`line ${i}`);
                        }
                        return lines.join('\n');
                    },
                },
                selection: {
                    active: new vscode.Position(50, 0),
                },
            };
            const context = provider.buildContext(mockEditor.document, mockEditor.selection.active);
            assert.ok(context.includes('line 25')); // 25 lines before
            assert.ok(context.includes('line 50')); // Current line
            assert.ok(context.includes('line 75')); // 25 lines after
        });
    });
    suite('Completion Extraction', () => {
        test('should extract completion from generated code', () => {
            const generated = `const test = "hello world";
console.log(test);`;
            const textBefore = 'const test = ';
            const completion = provider.extractCompletion(generated, textBefore);
            assert.ok(completion.includes('"hello world"'));
        });
        test('should handle code fences', () => {
            const generated = '```typescript\nconst x = 5;\n```';
            const textBefore = 'const x = ';
            const completion = provider.extractCompletion(generated, textBefore);
            assert.ok(!completion.includes('```'));
            assert.ok(completion.includes('5'));
        });
        test('should limit to 3 lines', () => {
            const generated = `line1
line2
line3
line4
line5`;
            const textBefore = '';
            const completion = provider.extractCompletion(generated, textBefore);
            const lines = completion.split('\n');
            assert.ok(lines.length <= 3);
        });
    });
    suite('Cache Key Building', () => {
        test('should build consistent cache keys', () => {
            const uri = vscode.Uri.file('/test/file.ts');
            const line = 10;
            const textBefore = 'const test = ';
            const key1 = provider.buildCacheKey(uri, line, textBefore);
            const key2 = provider.buildCacheKey(uri, line, textBefore);
            assert.strictEqual(key1, key2);
        });
        test('should create different keys for different inputs', () => {
            const uri = vscode.Uri.file('/test/file.ts');
            const key1 = provider.buildCacheKey(uri, 10, 'const test = ');
            const key2 = provider.buildCacheKey(uri, 11, 'const test = ');
            const key3 = provider.buildCacheKey(uri, 10, 'const other = ');
            assert.notStrictEqual(key1, key2);
            assert.notStrictEqual(key1, key3);
            assert.notStrictEqual(key2, key3);
        });
    });
    suite('Token Type Detection', () => {
        test('should detect strings', () => {
            const testCases = [
                { text: 'const str = "hello', expected: 'string' },
                { text: "const str = 'hello", expected: 'string' },
                { text: 'const str = `hello', expected: 'string' },
            ];
            testCases.forEach(({ text, expected }) => {
                const result = provider.getTokenType(text);
                assert.strictEqual(result, expected);
            });
        });
        test('should detect comments', () => {
            const testCases = [
                { text: '// comment', expected: 'comment' },
                { text: '/* comment', expected: 'comment' },
                { text: ' * comment', expected: 'comment' },
            ];
            testCases.forEach(({ text, expected }) => {
                const result = provider.getTokenType(text);
                assert.strictEqual(result, expected);
            });
        });
        test('should detect code', () => {
            const testCases = [
                'const x = 5',
                'function test()',
                'if (condition)',
                'import { foo }',
            ];
            testCases.forEach((text) => {
                const result = provider.getTokenType(text);
                assert.strictEqual(result, 'code');
            });
        });
    });
});
//# sourceMappingURL=InlineCompletion.test.js.map