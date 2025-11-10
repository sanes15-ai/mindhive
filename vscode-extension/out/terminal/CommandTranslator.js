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
exports.CommandTranslator = void 0;
const vscode = __importStar(require("vscode"));
class CommandTranslator {
    client;
    patterns = [];
    os;
    constructor(client) {
        this.client = client;
        this.os = this.detectOS();
        this.initializePatterns();
    }
    detectOS() {
        const platform = process.platform;
        if (platform === 'win32')
            return 'windows';
        if (platform === 'darwin')
            return 'mac';
        return 'linux';
    }
    initializePatterns() {
        // Package management
        this.patterns.push({
            pattern: /install (dependencies|deps|packages)/i,
            handler: () => this.getPackageInstallCommand(),
        });
        this.patterns.push({
            pattern: /install (.+)/i,
            handler: (match) => this.getPackageInstallCommand(match[1]),
        });
        // Testing
        this.patterns.push({
            pattern: /run tests?/i,
            handler: () => this.getTestCommand(),
        });
        // Building
        this.patterns.push({
            pattern: /build( the)? project/i,
            handler: () => this.getBuildCommand(),
        });
        // Development server
        this.patterns.push({
            pattern: /start (dev(elopment)?|local) server/i,
            handler: () => this.getDevServerCommand(),
        });
        // Git operations
        this.patterns.push({
            pattern: /commit (changes|everything)/i,
            handler: (match) => this.getGitCommitCommand(),
        });
        this.patterns.push({
            pattern: /push (to|changes)/i,
            handler: () => this.getGitPushCommand(),
        });
        this.patterns.push({
            pattern: /pull (from|changes)/i,
            handler: () => this.getGitPullCommand(),
        });
        this.patterns.push({
            pattern: /create (a )?branch (.+)/i,
            handler: (match) => this.getGitBranchCommand(match[2]),
        });
        // File operations
        this.patterns.push({
            pattern: /delete (folder|directory|file) (.+)/i,
            handler: (match) => this.getDeleteCommand(match[2]),
        });
        this.patterns.push({
            pattern: /list files/i,
            handler: () => this.getListFilesCommand(),
        });
        this.patterns.push({
            pattern: /find (.+) in (.+)/i,
            handler: (match) => this.getFindCommand(match[1], match[2]),
        });
        // Docker
        this.patterns.push({
            pattern: /start docker/i,
            handler: () => this.getDockerStartCommand(),
        });
        this.patterns.push({
            pattern: /stop docker/i,
            handler: () => this.getDockerStopCommand(),
        });
        // Database
        this.patterns.push({
            pattern: /migrate database/i,
            handler: () => this.getDatabaseMigrateCommand(),
        });
        // Cleaning
        this.patterns.push({
            pattern: /clean( up)?/i,
            handler: () => this.getCleanCommand(),
        });
        // Linting/Formatting
        this.patterns.push({
            pattern: /lint( code)?/i,
            handler: () => this.getLintCommand(),
        });
        this.patterns.push({
            pattern: /format( code)?/i,
            handler: () => this.getFormatCommand(),
        });
    }
    async translate(naturalLanguage) {
        // Try pattern matching first
        for (const pattern of this.patterns) {
            const match = naturalLanguage.match(pattern.pattern);
            if (match) {
                return pattern.handler(match, this.os);
            }
        }
        // Fallback to AI translation
        return await this.translateWithAI(naturalLanguage);
    }
    async translateWithAI(naturalLanguage) {
        try {
            const response = await this.client.generateCode({
                prompt: `Translate this natural language to a ${this.os} terminal command: "${naturalLanguage}"
        
Rules:
- Return ONLY the command, no explanation
- Use shell appropriate for ${this.os}
- Use common tools (npm, git, docker, etc.)
- Be specific and executable`,
                language: this.os === 'windows' ? 'powershell' : 'bash',
                context: `OS: ${this.os}`,
            });
            const command = response.code?.trim() || '';
            const isDangerous = this.isDangerousCommand(command);
            return {
                command,
                explanation: response.explanation || `Executes: ${command}`,
                isDangerous,
                requiresConfirmation: isDangerous,
            };
        }
        catch (error) {
            throw new Error(`Failed to translate command: ${error}`);
        }
    }
    getPackageInstallCommand(packageName) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const hasPackageJson = workspaceFolder
            ? vscode.workspace.fs.stat(vscode.Uri.joinPath(workspaceFolder.uri, 'package.json'))
            : false;
        let command;
        let explanation;
        if (packageName) {
            command = `npm install ${packageName}`;
            explanation = `Install package "${packageName}" using npm`;
        }
        else {
            command = 'npm install';
            explanation = 'Install all dependencies from package.json';
        }
        return {
            command,
            explanation,
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: packageName
                ? [`pnpm add ${packageName}`, `yarn add ${packageName}`]
                : ['pnpm install', 'yarn install'],
        };
    }
    getTestCommand() {
        return {
            command: 'npm test',
            explanation: 'Run test suite',
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: ['npm run test', 'yarn test', 'pnpm test'],
        };
    }
    getBuildCommand() {
        return {
            command: 'npm run build',
            explanation: 'Build the project for production',
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: ['yarn build', 'pnpm build'],
        };
    }
    getDevServerCommand() {
        return {
            command: 'npm run dev',
            explanation: 'Start development server',
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: ['npm start', 'yarn dev', 'pnpm dev'],
        };
    }
    getGitCommitCommand() {
        return {
            command: 'git add . && git commit',
            explanation: 'Stage all changes and commit (will prompt for message)',
            isDangerous: false,
            requiresConfirmation: true,
        };
    }
    getGitPushCommand() {
        return {
            command: 'git push',
            explanation: 'Push commits to remote repository',
            isDangerous: false,
            requiresConfirmation: true,
        };
    }
    getGitPullCommand() {
        return {
            command: 'git pull',
            explanation: 'Pull latest changes from remote repository',
            isDangerous: false,
            requiresConfirmation: false,
        };
    }
    getGitBranchCommand(branchName) {
        return {
            command: `git checkout -b ${branchName}`,
            explanation: `Create and switch to new branch "${branchName}"`,
            isDangerous: false,
            requiresConfirmation: false,
        };
    }
    getDeleteCommand(path) {
        const command = this.os === 'windows' ? `Remove-Item -Recurse -Force "${path}"` : `rm -rf "${path}"`;
        return {
            command,
            explanation: `⚠️ DANGEROUS: Permanently delete "${path}" and all its contents`,
            isDangerous: true,
            requiresConfirmation: true,
        };
    }
    getListFilesCommand() {
        const command = this.os === 'windows' ? 'Get-ChildItem' : 'ls -la';
        return {
            command,
            explanation: 'List all files and directories',
            isDangerous: false,
            requiresConfirmation: false,
        };
    }
    getFindCommand(pattern, location) {
        const command = this.os === 'windows'
            ? `Get-ChildItem -Path "${location}" -Recurse -Filter "*${pattern}*"`
            : `find "${location}" -name "*${pattern}*"`;
        return {
            command,
            explanation: `Find files matching "${pattern}" in "${location}"`,
            isDangerous: false,
            requiresConfirmation: false,
        };
    }
    getDockerStartCommand() {
        return {
            command: 'docker-compose up -d',
            explanation: 'Start Docker containers in detached mode',
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: ['docker compose up -d'],
        };
    }
    getDockerStopCommand() {
        return {
            command: 'docker-compose down',
            explanation: 'Stop and remove Docker containers',
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: ['docker compose down'],
        };
    }
    getDatabaseMigrateCommand() {
        return {
            command: 'npm run migrate',
            explanation: 'Run database migrations',
            isDangerous: false,
            requiresConfirmation: true,
            alternatives: ['npx prisma migrate dev', 'yarn migrate'],
        };
    }
    getCleanCommand() {
        const command = this.os === 'windows'
            ? 'Remove-Item -Recurse -Force node_modules, dist'
            : 'rm -rf node_modules dist';
        return {
            command,
            explanation: 'Remove node_modules and dist directories',
            isDangerous: false,
            requiresConfirmation: true,
        };
    }
    getLintCommand() {
        return {
            command: 'npm run lint',
            explanation: 'Run linter to check code quality',
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: ['yarn lint', 'pnpm lint'],
        };
    }
    getFormatCommand() {
        return {
            command: 'npm run format',
            explanation: 'Format code using prettier or similar',
            isDangerous: false,
            requiresConfirmation: false,
            alternatives: ['npx prettier --write .', 'yarn format'],
        };
    }
    isDangerousCommand(command) {
        const dangerousPatterns = [
            /rm\s+-rf/i,
            /del\s+\/s\s+\/q/i,
            /Remove-Item.*-Recurse.*-Force/i,
            /format\s+[a-z]:/i,
            /dd\s+if=/i,
            /:(){ :|:& };:/i, // Fork bomb
            /curl.*\|\s*bash/i,
            /wget.*\|\s*sh/i,
            /sudo\s+rm/i,
            /chmod\s+777/i,
            /> \/dev\/sda/i,
        ];
        return dangerousPatterns.some((pattern) => pattern.test(command));
    }
    validateCommand(command) {
        const warnings = [];
        if (this.isDangerousCommand(command)) {
            warnings.push('⚠️ This command could delete files or cause system damage');
        }
        if (command.includes('sudo') && this.os !== 'windows') {
            warnings.push('⚠️ This command requires administrator privileges');
        }
        if (command.includes('&') || command.includes('|')) {
            warnings.push('⚡ This command chains multiple operations');
        }
        if (command.length > 200) {
            warnings.push('⚡ This is a very long command');
        }
        return {
            isValid: true,
            warnings,
        };
    }
}
exports.CommandTranslator = CommandTranslator;
//# sourceMappingURL=CommandTranslator.js.map