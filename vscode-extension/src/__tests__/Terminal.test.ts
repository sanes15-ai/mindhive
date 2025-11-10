import * as assert from 'assert';
import { CommandTranslator } from '../terminal/CommandTranslator';
import { MindHiveClient } from '../client/HiveMindClient';
import { AuthManager } from '../auth/AuthManager';

suite('Terminal Integration Test Suite', () => {
  let translator: CommandTranslator;
  let mockClient: MindHiveClient;

  setup(() => {
    const mockContext: any = {
      globalState: new Map(),
      secrets: {
        get: async () => 'mock-token',
        store: async () => {},
        delete: async () => {},
      },
    };

    const mockAuthManager = new AuthManager(mockContext);
    mockClient = new MindHiveClient(mockContext, mockAuthManager);
    translator = new CommandTranslator(mockClient);
  });

  suite('Command Translation', () => {
    test('should translate "install dependencies"', async () => {
      const result = await translator.translate('install dependencies');

      assert.ok(result.command.includes('install'));
      assert.strictEqual(result.isDangerous, false);
    });

    test('should translate "run tests"', async () => {
      const result = await translator.translate('run tests');

      assert.ok(result.command.includes('test'));
      assert.strictEqual(result.isDangerous, false);
    });

    test('should translate "build project"', async () => {
      const result = await translator.translate('build the project');

      assert.ok(result.command.includes('build'));
      assert.strictEqual(result.isDangerous, false);
    });

    test('should mark dangerous commands', async () => {
      const result = await translator.translate('delete folder node_modules');

      assert.strictEqual(result.isDangerous, true);
      assert.strictEqual(result.requiresConfirmation, true);
    });

    test('should provide alternatives', async () => {
      const result = await translator.translate('install dependencies');

      assert.ok(result.alternatives);
      assert.ok(result.alternatives.length > 0);
    });
  });

  suite('Command Validation', () => {
    test('should detect dangerous rm -rf', () => {
      const validation = translator.validateCommand('rm -rf /');

      assert.ok(validation.warnings.length > 0);
      assert.ok(validation.warnings[0].includes('dangerous') || validation.warnings[0].includes('damage'));
    });

    test('should warn about sudo', () => {
      const validation = translator.validateCommand('sudo rm -rf node_modules');

      assert.ok(validation.warnings.some(w => w.includes('administrator') || w.includes('privileges')));
    });

    test('should warn about command chaining', () => {
      const validation = translator.validateCommand('npm install && npm run build');

      assert.ok(validation.warnings.some(w => w.includes('chain') || w.includes('multiple')));
    });

    test('should allow safe commands', () => {
      const validation = translator.validateCommand('npm install');

      // Should have no warnings or only informational ones
      assert.ok(validation.isValid);
    });
  });

  suite('OS Detection', () => {
    test('should detect current OS', () => {
      const os = (translator as any).os;

      assert.ok(['windows', 'mac', 'linux'].includes(os));
    });

    test('should generate OS-specific commands', async () => {
      const result = await translator.translate('list files');

      const os = (translator as any).os;
      if (os === 'windows') {
        assert.ok(result.command.includes('Get-ChildItem') || result.command.includes('dir'));
      } else {
        assert.ok(result.command.includes('ls'));
      }
    });
  });

  suite('Git Commands', () => {
    test('should translate commit command', async () => {
      const result = await translator.translate('commit changes');

      assert.ok(result.command.includes('git'));
      assert.ok(result.command.includes('commit'));
      assert.strictEqual(result.requiresConfirmation, true);
    });

    test('should translate push command', async () => {
      const result = await translator.translate('push changes');

      assert.ok(result.command.includes('git push'));
      assert.strictEqual(result.requiresConfirmation, true);
    });

    test('should translate branch creation', async () => {
      const result = await translator.translate('create branch feature-xyz');

      assert.ok(result.command.includes('git'));
      assert.ok(result.command.includes('branch'));
      assert.ok(result.command.includes('feature-xyz'));
    });
  });

  suite('Docker Commands', () => {
    test('should translate start docker', async () => {
      const result = await translator.translate('start docker');

      assert.ok(result.command.includes('docker'));
      assert.ok(result.command.includes('up'));
    });

    test('should translate stop docker', async () => {
      const result = await translator.translate('stop docker');

      assert.ok(result.command.includes('docker'));
      assert.ok(result.command.includes('down'));
    });
  });

  suite('Package Management', () => {
    test('should translate install specific package', async () => {
      const result = await translator.translate('install lodash');

      assert.ok(result.command.includes('install'));
      assert.ok(result.command.includes('lodash'));
    });

    test('should handle npm/yarn/pnpm alternatives', async () => {
      const result = await translator.translate('install dependencies');

      assert.ok(result.alternatives);
      const hasYarn = result.alternatives.some(alt => alt.includes('yarn'));
      const hasPnpm = result.alternatives.some(alt => alt.includes('pnpm'));

      assert.ok(hasYarn || hasPnpm);
    });
  });
});
