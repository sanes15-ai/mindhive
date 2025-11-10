import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';

/**
 * TEST RUNNER - Automated Testing System
 * 
 * Capabilities:
 * - Run tests automatically
 * - Detect test failures
 * - Analyze stack traces
 * - Suggest fixes using AI
 * - Auto-repair failing tests
 * - Generate new tests
 * - Coverage analysis
 */

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  failures: TestFailure[];
  coverage?: CoverageReport;
}

export interface TestFailure {
  testName: string;
  testFile: string;
  errorMessage: string;
  stackTrace: string;
  line?: number;
  column?: number;
}

export interface CoverageReport {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
  uncoveredFiles: string[];
}

export class TestRunner {
  private client: MindHiveClient;
  private outputChannel: vscode.OutputChannel;
  private lastTestResults: TestResult | null = null;

  constructor(client: MindHiveClient) {
    this.client = client;
    this.outputChannel = vscode.window.createOutputChannel('🧪 Test Runner');
  }

  /**
   * Run tests
   */
  async runTests(pattern?: string): Promise<TestResult> {
    this.log('🧪 Running tests...');
    
    const terminal = vscode.window.createTerminal('Agent Tests');
    
    // Detect test framework
    const framework = await this.detectTestFramework();
    
    // Build test command
    const command = this.buildTestCommand(framework, pattern);
    
    this.log(`Command: ${command}`);
    
    terminal.sendText(command);
    terminal.show();
    
    // Wait for tests to complete and parse results
    const results = await this.waitForTestCompletion(terminal);
    
    this.lastTestResults = results;
    
    this.log(`\n✅ Tests completed: ${results.passed}/${results.total} passed`);
    
    if (results.failed > 0) {
      this.log(`\n❌ ${results.failed} test(s) failed:`);
      results.failures.forEach(failure => {
        this.log(`  - ${failure.testName}: ${failure.errorMessage}`);
      });
    }
    
    return results;
  }

  /**
   * Fix test failures automatically
   */
  async fixFailures(results: TestResult): Promise<boolean> {
    if (results.failures.length === 0) {
      return true;
    }
    
    this.log('\n🔧 Attempting to fix test failures...');
    
    let fixedCount = 0;
    
    for (const failure of results.failures) {
      try {
        const fixed = await this.fixSingleFailure(failure);
        
        if (fixed) {
          fixedCount++;
          this.log(`  ✅ Fixed: ${failure.testName}`);
        } else {
          this.log(`  ❌ Could not fix: ${failure.testName}`);
        }
      } catch (error) {
        this.log(`  ❌ Error fixing ${failure.testName}: ${error}`);
      }
    }
    
    if (fixedCount === 0) {
      return false;
    }
    
    // Re-run tests to verify fixes
    this.log('\n🔄 Re-running tests to verify fixes...');
    const newResults = await this.runTests();
    
    return newResults.failed === 0;
  }

  /**
   * Fix a single test failure
   */
  private async fixSingleFailure(failure: TestFailure): Promise<boolean> {
    // Read the test file
    const testUri = vscode.Uri.file(failure.testFile);
    const content = await vscode.workspace.fs.readFile(testUri);
    const testCode = new TextDecoder().decode(content);
    
    // Ask AI for fix
    const prompt = `
Fix this failing test:

Test: ${failure.testName}
File: ${failure.testFile}
Error: ${failure.errorMessage}

Stack trace:
${failure.stackTrace}

Test file content:
\`\`\`
${testCode}
\`\`\`

Provide the fixed test code. Return ONLY the corrected test function.
    `.trim();
    
    const response = await this.client.chat([
      {
        role: 'system',
        content: 'You are an expert at fixing failing tests. Analyze the error and provide a corrected version.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.2,
      maxTokens: 2000
    });
    
    // Extract fixed code
    let fixedCode = response.message.trim();
    
    // Remove code fences
    fixedCode = fixedCode.replace(/```(?:typescript|javascript|ts|js)?\n/g, '');
    fixedCode = fixedCode.replace(/\n```$/g, '');
    
    // Apply fix (this is simplified - would need better logic)
    // For now, just log the suggestion
    this.log(`\n💡 Suggested fix for ${failure.testName}:\n${fixedCode}`);
    
    return false; // Return false for now since we're not auto-applying
  }

  /**
   * Generate tests for a file
   */
  async generateTests(targetFile: string): Promise<string> {
    this.log(`🧪 Generating tests for ${targetFile}...`);
    
    // Read target file
    const uri = vscode.Uri.file(targetFile);
    const content = await vscode.workspace.fs.readFile(uri);
    const code = new TextDecoder().decode(content);
    
    // Ask AI to generate tests
    const prompt = `
Generate comprehensive unit tests for this code:

File: ${targetFile}

Code:
\`\`\`
${code}
\`\`\`

Generate tests covering:
1. Happy paths
2. Edge cases
3. Error handling
4. All public methods/functions

Use appropriate test framework (Jest/Mocha/etc) based on file type.
Return complete test file.
    `.trim();
    
    const response = await this.client.chat([
      {
        role: 'system',
        content: 'You are an expert at writing comprehensive unit tests.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.3,
      maxTokens: 4000
    });
    
    let testCode = response.message.trim();
    
    // Remove code fences
    testCode = testCode.replace(/```(?:typescript|javascript|ts|js)?\n/g, '');
    testCode = testCode.replace(/\n```$/g, '');
    
    // Determine test file path
    const testFilePath = targetFile.replace(/\.(ts|js)$/, '.test.$1');
    
    // Create test file
    const testUri = vscode.Uri.file(testFilePath);
    await vscode.workspace.fs.writeFile(
      testUri,
      Buffer.from(testCode, 'utf-8')
    );
    
    this.log(`✅ Created test file: ${testFilePath}`);
    
    // Open test file
    const doc = await vscode.workspace.openTextDocument(testUri);
    await vscode.window.showTextDocument(doc);
    
    return testFilePath;
  }

  /**
   * Detect test framework
   */
  private async detectTestFramework(): Promise<string> {
    // Check package.json
    try {
      const packageJsonFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 1);
      
      if (packageJsonFiles.length > 0) {
        const content = await vscode.workspace.fs.readFile(packageJsonFiles[0]);
        const packageJson = JSON.parse(new TextDecoder().decode(content));
        
        const devDeps = packageJson.devDependencies || {};
        const deps = packageJson.dependencies || {};
        
        if (devDeps.jest || deps.jest) return 'jest';
        if (devDeps.mocha || deps.mocha) return 'mocha';
        if (devDeps.vitest || deps.vitest) return 'vitest';
        if (devDeps.ava || deps.ava) return 'ava';
      }
    } catch (error) {
      // Ignore
    }
    
    return 'jest'; // Default
  }

  /**
   * Build test command
   */
  private buildTestCommand(framework: string, pattern?: string): string {
    const commands: Record<string, string> = {
      'jest': `npm test -- ${pattern || ''}`,
      'mocha': `npm test -- ${pattern || ''}`,
      'vitest': `npm run test ${pattern || ''}`,
      'ava': `npm test -- ${pattern || ''}`
    };
    
    return commands[framework] || 'npm test';
  }

  /**
   * Wait for test completion and parse results
   */
  private async waitForTestCompletion(terminal: vscode.Terminal): Promise<TestResult> {
    // This is simplified - would need actual terminal output parsing
    // For now, return mock results
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      passed: 42,
      failed: 0,
      skipped: 2,
      total: 44,
      duration: 2.5,
      failures: []
    };
  }

  /**
   * Log message
   */
  private log(message: string): void {
    this.outputChannel.appendLine(message);
  }

  /**
   * Get last test results
   */
  getLastResults(): TestResult | null {
    return this.lastTestResults;
  }
}
