import * as assert from 'assert';
import * as vscode from 'vscode';
import { InlineCompletionProvider } from '../providers/InlineCompletionProvider';
import { MindHiveClient } from '../client/HiveMindClient';
import { AuthManager } from '../auth/AuthManager';

suite('InlineCompletionProvider Test Suite', () => {
  let provider: InlineCompletionProvider;
  let mockClient: MindHiveClient;
  let mockAuthManager: AuthManager;

  setup(() => {
    // Create mock context
    const mockContext: any = {
      globalState: new Map(),
      secrets: {
        get: async () => 'mock-token',
        store: async () => {},
        delete: async () => {},
      },
    };

    mockAuthManager = new AuthManager(mockContext);
    mockClient = new MindHiveClient(mockContext, mockAuthManager);
    provider = new InlineCompletionProvider(mockClient, mockAuthManager);
  });

  teardown(() => {
    // Clean up resources
    if ('dispose' in provider && typeof (provider as any).dispose === 'function') {
      (provider as any).dispose();
    }
  });

  suite('Caching', () => {
    test('should cache completions', () => {
      const cacheKey = 'test-file.ts:10:const test = ';
      const completion = 'const test = "hello world";';

      // Set cache
      (provider as any).setCache(cacheKey, completion);

      // Get from cache
      const cached = (provider as any).getFromCache(cacheKey);
      assert.strictEqual(cached, completion);
    });

    test('should expire cache after TTL', async () => {
      const cacheKey = 'test-file.ts:10:const test = ';
      const completion = 'const test = "hello world";';

      // Set cache
      (provider as any).setCache(cacheKey, completion);

      // Manually set old timestamp
      const cache = (provider as any).cache;
      const entry = cache.get(cacheKey);
      entry.timestamp = Date.now() - 31000; // 31 seconds ago

      // Should be expired
      const cached = (provider as any).getFromCache(cacheKey);
      assert.strictEqual(cached, undefined);
    });

    test('should limit cache size', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 150; i++) {
        (provider as any).setCache(`key-${i}`, `completion-${i}`);
      }

      const cache = (provider as any).cache;
      assert.ok(cache.size <= 100, 'Cache should not exceed 100 items');
    });

    test('should clear cache', () => {
      (provider as any).setCache('key1', 'completion1');
      (provider as any).setCache('key2', 'completion2');

      provider.clearCache();

      const cache = (provider as any).cache;
      assert.strictEqual(cache.size, 0);
    });
  });

  suite('Smart Triggering', () => {
    test('should trigger on meaningful code', () => {
      const document: any = {
        languageId: 'typescript',
        lineAt: () => ({ text: 'function test() {' }),
      };
      const position = new vscode.Position(10, 18);

      const shouldTrigger = (provider as any).shouldTriggerCompletion(
        document,
        position,
        'function test() {'
      );

      assert.strictEqual(shouldTrigger, true);
    });

    test('should not trigger in middle of word', () => {
      const document: any = {
        languageId: 'typescript',
        lineAt: () => ({ text: 'const hello' }),
      };
      const position = new vscode.Position(10, 8); // Middle of "hello"

      const shouldTrigger = (provider as any).shouldTriggerCompletion(
        document,
        position,
        'const hel'
      );

      assert.strictEqual(shouldTrigger, false);
    });

    test('should not trigger in strings', () => {
      const textBefore = 'const str = "hello';

      const tokenType = (provider as any).getTokenType(textBefore);
      assert.strictEqual(tokenType, 'string');
    });

    test('should not trigger in comments', () => {
      const textBefore = '// This is a comment';

      const tokenType = (provider as any).getTokenType(textBefore);
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
        const result = (provider as any).hasMeaningfulCode(text);
        assert.strictEqual(
          result,
          expected,
          `"${text}" should ${expected ? '' : 'not '}be meaningful`
        );
      });
    });
  });

  suite('Context Building', () => {
    test('should extract imports', () => {
      const mockDocument: any = {
        lineCount: 50,
        lineAt: (line: number) => {
          if (line === 0) return { text: 'import { foo } from "bar";' };
          if (line === 1) return { text: 'import * as React from "react";' };
          if (line === 2) return { text: 'const test = 1;' };
          return { text: '' };
        },
      };

      const imports = (provider as any).extractImports(mockDocument);
      assert.ok(imports.includes('import { foo } from "bar";'));
      assert.ok(imports.includes('import * as React from "react";'));
      assert.ok(!imports.includes('const test = 1;'));
    });

    test('should build context with surrounding lines', () => {
      const mockEditor: any = {
        document: {
          lineCount: 100,
          lineAt: (line: number) => ({ text: `line ${line}` }),
          getText: (range: vscode.Range) => {
            const lines: string[] = [];
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

      const context = (provider as any).buildContext(
        mockEditor.document,
        mockEditor.selection.active
      );

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

      const completion = (provider as any).extractCompletion(generated, textBefore);
      assert.ok(completion.includes('"hello world"'));
    });

    test('should handle code fences', () => {
      const generated = '```typescript\nconst x = 5;\n```';
      const textBefore = 'const x = ';

      const completion = (provider as any).extractCompletion(generated, textBefore);
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

      const completion = (provider as any).extractCompletion(generated, textBefore);
      const lines = completion.split('\n');
      assert.ok(lines.length <= 3);
    });
  });

  suite('Cache Key Building', () => {
    test('should build consistent cache keys', () => {
      const uri = vscode.Uri.file('/test/file.ts');
      const line = 10;
      const textBefore = 'const test = ';

      const key1 = (provider as any).buildCacheKey(uri, line, textBefore);
      const key2 = (provider as any).buildCacheKey(uri, line, textBefore);

      assert.strictEqual(key1, key2);
    });

    test('should create different keys for different inputs', () => {
      const uri = vscode.Uri.file('/test/file.ts');

      const key1 = (provider as any).buildCacheKey(uri, 10, 'const test = ');
      const key2 = (provider as any).buildCacheKey(uri, 11, 'const test = ');
      const key3 = (provider as any).buildCacheKey(uri, 10, 'const other = ');

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
        const result = (provider as any).getTokenType(text);
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
        const result = (provider as any).getTokenType(text);
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
        const result = (provider as any).getTokenType(text);
        assert.strictEqual(result, 'code');
      });
    });
  });
});
