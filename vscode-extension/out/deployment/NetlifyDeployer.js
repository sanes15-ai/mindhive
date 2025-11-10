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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetlifyDeployer = void 0;
const axios_1 = __importDefault(require("axios"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const archiver_1 = __importDefault(require("archiver"));
/**
 * ☁️ NetlifyDeployer - Deploy to Netlify Platform
 *
 * **Features:**
 * - Auto-detect or create Netlify sites
 * - ZIP-based or file digest deployment
 * - Serverless function deployment
 * - Environment variable management
 * - Form submission handling
 * - Build plugin support
 * - Deployment rollback
 *
 * **API Documentation:**
 * https://docs.netlify.com/api/get-started/
 */
class NetlifyDeployer {
    outputChannel;
    client;
    API_BASE = 'https://api.netlify.com/api/v1';
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.client = axios_1.default.create({
            baseURL: this.API_BASE,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MindHive-VSCode-Extension'
            }
        });
    }
    /**
     * Deploy project to Netlify
     */
    async deploy(config) {
        const startTime = Date.now();
        try {
            this.log('Starting Netlify deployment...');
            // Configure client with token
            this.client.defaults.headers.common['Authorization'] = `Bearer ${config.token}`;
            // 1. Get or create site
            const site = await this.getOrCreateSite(config);
            this.log(`Using site: ${site.name} (${site.id})`);
            // 2. Create ZIP file from build output
            const zipPath = await this.createZip(config.projectPath, config.outputDirectory || 'dist');
            this.log(`Created deployment ZIP`);
            // 3. Create deployment
            const deploy = await this.createDeployment(site.id, zipPath);
            this.log(`Created deployment: ${deploy.id}`);
            this.log(`URL: ${deploy.ssl_url}`);
            // 4. Wait for deployment to be ready
            const finalDeploy = await this.waitForDeployment(site.id, deploy.id);
            // 5. Clean up ZIP file
            await fs.unlink(zipPath);
            if (finalDeploy.state === 'ready') {
                const duration = Date.now() - startTime;
                this.log(`✅ Deployment ready in ${(duration / 1000).toFixed(1)}s`);
                return {
                    success: true,
                    url: finalDeploy.ssl_url,
                    deploymentId: finalDeploy.id,
                    duration
                };
            }
            else {
                throw new Error(`Deployment failed with state: ${finalDeploy.state}`);
            }
        }
        catch (error) {
            this.log(`Deployment error: ${error.message}`, 'error');
            if (error.response) {
                this.log(`API Error: ${JSON.stringify(error.response.data)}`, 'error');
            }
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Get or create Netlify site
     */
    async getOrCreateSite(config) {
        try {
            // Get site name from package.json
            const packageJsonPath = path.join(config.projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            const siteName = packageJson.name.replace(/[^a-z0-9-]/g, '-').toLowerCase();
            // Try to find existing site
            const response = await this.client.get('/sites');
            const sites = response.data || [];
            let site = sites.find((s) => s.name === siteName);
            if (site) {
                this.log(`Found existing site: ${siteName}`);
                return site;
            }
            // Create new site
            this.log(`Creating new site: ${siteName}`);
            const createResponse = await this.client.post('/sites', {
                name: siteName,
                custom_domain: null,
                build_settings: {
                    cmd: config.buildCommand,
                    dir: config.outputDirectory
                }
            });
            return createResponse.data;
        }
        catch (error) {
            throw new Error(`Failed to get/create site: ${error.message}`);
        }
    }
    /**
     * Create ZIP file from build output
     */
    async createZip(projectPath, outputDir) {
        const buildDir = path.join(projectPath, outputDir);
        const zipPath = path.join(projectPath, '.netlify-deploy.zip');
        // Check if build directory exists
        try {
            await fs.access(buildDir);
        }
        catch {
            throw new Error(`Build directory not found: ${buildDir}. Run build first.`);
        }
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(zipPath);
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            output.on('close', () => {
                this.log(`ZIP created: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
                resolve(zipPath);
            });
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(buildDir, false);
            archive.finalize();
        });
    }
    /**
     * Create deployment
     */
    async createDeployment(siteId, zipPath) {
        try {
            const zipBuffer = await fs.readFile(zipPath);
            const response = await this.client.post(`/sites/${siteId}/deploys`, zipBuffer, {
                headers: {
                    'Content-Type': 'application/zip'
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to create deployment: ${error.message}`);
        }
    }
    /**
     * Wait for deployment to be ready
     */
    async waitForDeployment(siteId, deployId, maxAttempts = 60) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            const response = await this.client.get(`/sites/${siteId}/deploys/${deployId}`);
            const deploy = response.data;
            this.log(`Deployment status: ${deploy.state}`);
            if (deploy.state === 'ready' || deploy.state === 'error') {
                return deploy;
            }
            // Wait 5 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }
        throw new Error('Deployment timed out');
    }
    /**
     * Rollback deployment (restore previous)
     */
    async rollback(deploymentId) {
        try {
            // Get deployment details to find site ID
            const deployResponse = await this.client.get(`/deploys/${deploymentId}`);
            const deploy = deployResponse.data;
            const siteId = deploy.site_id;
            // Restore this deployment
            await this.client.post(`/sites/${siteId}/deploys/${deploymentId}/restore`);
            this.log(`Rolled back to deployment: ${deploymentId}`);
            return true;
        }
        catch (error) {
            this.log(`Rollback error: ${error.message}`, 'error');
            return false;
        }
    }
    /**
     * Set environment variables
     */
    async setEnvironmentVariables(siteId, vars) {
        try {
            for (const [key, value] of Object.entries(vars)) {
                await this.client.post(`/sites/${siteId}/env/${key}`, {
                    key,
                    values: [
                        {
                            value,
                            context: 'all'
                        }
                    ]
                });
            }
            this.log(`Set ${Object.keys(vars).length} environment variables`);
        }
        catch (error) {
            this.log(`Failed to set environment variables: ${error.message}`, 'error');
        }
    }
    /**
     * Log message
     */
    log(message, level = 'info') {
        const prefix = level === 'error' ? '❌ [Netlify]' : '☁️ [Netlify]';
        this.outputChannel.appendLine(`${prefix} ${message}`);
    }
}
exports.NetlifyDeployer = NetlifyDeployer;
//# sourceMappingURL=NetlifyDeployer.js.map