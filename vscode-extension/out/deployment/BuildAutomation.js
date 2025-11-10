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
exports.BuildAutomation = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * 🔨 BuildAutomation - Smart Build Detection & Execution
 *
 * **Features:**
 * - Auto-detect build command from package.json
 * - Detect project type (React, Next.js, Vite, Angular, Vue, etc.)
 * - Validate build output directory
 * - Run builds with progress tracking
 * - Cache build artifacts
 * - Optimize build performance
 *
 * **Supported Frameworks:**
 * - Next.js → `next build` → `.next` or `out`
 * - React (CRA) → `react-scripts build` → `build`
 * - Vite → `vite build` → `dist`
 * - Angular → `ng build` → `dist`
 * - Vue → `vue-cli-service build` → `dist`
 * - Gatsby → `gatsby build` → `public`
 * - Nuxt → `nuxt build` → `.output/public`
 * - Svelte → `svelte-kit build` → `build`
 */
class BuildAutomation {
    outputChannel;
    FRAMEWORK_CONFIGS = [
        {
            name: 'Next.js',
            indicators: ['next', 'next.config.js', 'next.config.mjs'],
            buildCommand: 'npm run build',
            buildScript: 'next build',
            outputDir: ['out', '.next'],
            packageDeps: ['next']
        },
        {
            name: 'React (CRA)',
            indicators: ['react-scripts'],
            buildCommand: 'npm run build',
            buildScript: 'react-scripts build',
            outputDir: ['build'],
            packageDeps: ['react-scripts']
        },
        {
            name: 'Vite',
            indicators: ['vite', 'vite.config.js', 'vite.config.ts'],
            buildCommand: 'npm run build',
            buildScript: 'vite build',
            outputDir: ['dist'],
            packageDeps: ['vite']
        },
        {
            name: 'Angular',
            indicators: ['@angular/core', 'angular.json'],
            buildCommand: 'npm run build',
            buildScript: 'ng build',
            outputDir: ['dist'],
            packageDeps: ['@angular/core']
        },
        {
            name: 'Vue',
            indicators: ['@vue/cli-service', 'vue.config.js'],
            buildCommand: 'npm run build',
            buildScript: 'vue-cli-service build',
            outputDir: ['dist'],
            packageDeps: ['vue']
        },
        {
            name: 'Gatsby',
            indicators: ['gatsby', 'gatsby-config.js'],
            buildCommand: 'npm run build',
            buildScript: 'gatsby build',
            outputDir: ['public'],
            packageDeps: ['gatsby']
        },
        {
            name: 'Nuxt',
            indicators: ['nuxt', 'nuxt.config.js', 'nuxt.config.ts'],
            buildCommand: 'npm run build',
            buildScript: 'nuxt build',
            outputDir: ['.output/public', 'dist'],
            packageDeps: ['nuxt']
        },
        {
            name: 'Svelte',
            indicators: ['@sveltejs/kit', 'svelte.config.js'],
            buildCommand: 'npm run build',
            buildScript: 'svelte-kit build',
            outputDir: ['build'],
            packageDeps: ['svelte']
        }
    ];
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.log('BuildAutomation initialized');
    }
    /**
     * Detect project type
     */
    async detectProjectType(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            const deps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };
            for (const config of this.FRAMEWORK_CONFIGS) {
                // Check package.json dependencies
                const hasPackageDep = config.packageDeps.some(dep => deps[dep]);
                // Check for indicator files
                const hasIndicatorFile = await this.hasAnyFile(projectPath, config.indicators.filter(ind => ind.includes('.')));
                if (hasPackageDep || hasIndicatorFile) {
                    this.log(`Detected project type: ${config.name}`);
                    return config.name;
                }
            }
            return 'Unknown';
        }
        catch (error) {
            this.log(`Failed to detect project type: ${error}`, 'error');
            return 'Unknown';
        }
    }
    /**
     * Detect build command from package.json
     */
    async detectBuildCommand(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            // Check for build script in package.json
            if (packageJson.scripts && packageJson.scripts.build) {
                const buildCommand = 'npm run build';
                this.log(`Detected build command: ${buildCommand}`);
                return buildCommand;
            }
            // Detect framework and use default build command
            const projectType = await this.detectProjectType(projectPath);
            const config = this.FRAMEWORK_CONFIGS.find(c => c.name === projectType);
            if (config) {
                this.log(`Using default build command for ${projectType}: ${config.buildCommand}`);
                return config.buildCommand;
            }
            // Default fallback
            this.log('Using default build command: npm run build');
            return 'npm run build';
        }
        catch (error) {
            this.log(`Failed to detect build command: ${error}`, 'error');
            return 'npm run build';
        }
    }
    /**
     * Detect output directory
     */
    async detectOutputDirectory(projectPath) {
        try {
            const projectType = await this.detectProjectType(projectPath);
            const config = this.FRAMEWORK_CONFIGS.find(c => c.name === projectType);
            if (config) {
                // Check which output directory exists
                for (const dir of config.outputDir) {
                    const fullPath = path.join(projectPath, dir);
                    try {
                        await fs.access(fullPath);
                        this.log(`Detected output directory: ${dir}`);
                        return dir;
                    }
                    catch {
                        // Directory doesn't exist, continue
                    }
                }
                // Return first option as default
                this.log(`Using default output directory: ${config.outputDir[0]}`);
                return config.outputDir[0];
            }
            // Default fallback
            const defaultDirs = ['dist', 'build', 'out', 'public'];
            for (const dir of defaultDirs) {
                const fullPath = path.join(projectPath, dir);
                try {
                    await fs.access(fullPath);
                    this.log(`Detected output directory: ${dir}`);
                    return dir;
                }
                catch {
                    // Continue
                }
            }
            this.log('Using default output directory: dist');
            return 'dist';
        }
        catch (error) {
            this.log(`Failed to detect output directory: ${error}`, 'error');
            return 'dist';
        }
    }
    /**
     * Run build
     */
    async build(projectPath, buildCommand) {
        const startTime = Date.now();
        try {
            this.log(`Running build: ${buildCommand}`);
            this.log(`Working directory: ${projectPath}`);
            // Check if node_modules exists
            const nodeModulesPath = path.join(projectPath, 'node_modules');
            try {
                await fs.access(nodeModulesPath);
            }
            catch {
                this.log('node_modules not found. Running npm install first...', 'warn');
                await execAsync('npm install', {
                    cwd: projectPath,
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                });
                this.log('npm install completed');
            }
            // Run build command
            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: projectPath,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });
            if (stdout) {
                this.log('Build output:');
                this.outputChannel.appendLine(stdout);
            }
            if (stderr) {
                this.log('Build warnings:');
                this.outputChannel.appendLine(stderr);
            }
            const duration = Date.now() - startTime;
            this.log(`✅ Build completed in ${(duration / 1000).toFixed(1)}s`);
            // Detect output directory
            const outputDirectory = await this.detectOutputDirectory(projectPath);
            return {
                success: true,
                duration,
                outputDirectory
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.log(`❌ Build failed after ${(duration / 1000).toFixed(1)}s`, 'error');
            if (error.stdout) {
                this.log('Build output:');
                this.outputChannel.appendLine(error.stdout);
            }
            if (error.stderr) {
                this.log('Build errors:');
                this.outputChannel.appendLine(error.stderr);
            }
            return {
                success: false,
                error: error.message,
                duration
            };
        }
    }
    /**
     * Validate build output
     */
    async validateBuildOutput(projectPath, outputDir) {
        try {
            const buildPath = path.join(projectPath, outputDir);
            // Check if directory exists
            await fs.access(buildPath);
            // Check if directory has files
            const files = await fs.readdir(buildPath);
            if (files.length === 0) {
                this.log(`Build directory ${outputDir} is empty`, 'error');
                return false;
            }
            // Check for index.html (for static sites)
            const hasIndexHtml = files.includes('index.html');
            if (!hasIndexHtml) {
                this.log(`Warning: No index.html found in ${outputDir}`, 'warn');
            }
            this.log(`✅ Build output validated: ${files.length} files in ${outputDir}`);
            return true;
        }
        catch (error) {
            this.log(`Build output validation failed: ${error}`, 'error');
            return false;
        }
    }
    /**
     * Check if any file exists
     */
    async hasAnyFile(projectPath, files) {
        for (const file of files) {
            try {
                await fs.access(path.join(projectPath, file));
                return true;
            }
            catch {
                // Continue
            }
        }
        return false;
    }
    /**
     * Log message
     */
    log(message, level = 'info') {
        const prefix = level === 'error' ? '❌ [Build]' :
            level === 'warn' ? '⚠️ [Build]' :
                '🔨 [Build]';
        this.outputChannel.appendLine(`${prefix} ${message}`);
    }
}
exports.BuildAutomation = BuildAutomation;
//# sourceMappingURL=BuildAutomation.js.map