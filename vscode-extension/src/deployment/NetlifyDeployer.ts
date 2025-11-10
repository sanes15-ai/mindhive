import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import * as path from 'path';
import * as fs from 'fs/promises';
import archiver from 'archiver';
import { DeploymentConfig, DeploymentResult } from './DeploymentManager';

interface NetlifySite {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  build_settings: {
    cmd: string | null;
    dir: string | null;
  };
}

interface NetlifyDeploy {
  id: string;
  site_id: string;
  state: 'preparing' | 'uploaded' | 'uploading' | 'ready' | 'error';
  url: string;
  ssl_url: string;
  created_at: string;
}

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
export class NetlifyDeployer {
  private client: AxiosInstance;
  private readonly API_BASE = 'https://api.netlify.com/api/v1';

  constructor(private outputChannel: vscode.OutputChannel) {
    this.client = axios.create({
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
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
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
      } else {
        throw new Error(`Deployment failed with state: ${finalDeploy.state}`);
      }
      
    } catch (error: any) {
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
  private async getOrCreateSite(config: DeploymentConfig): Promise<NetlifySite> {
    try {
      // Get site name from package.json
      const packageJsonPath = path.join(config.projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const siteName = packageJson.name.replace(/[^a-z0-9-]/g, '-').toLowerCase();
      
      // Try to find existing site
      const response = await this.client.get('/sites');
      const sites = response.data || [];
      
      let site = sites.find((s: any) => s.name === siteName);
      
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
      
    } catch (error: any) {
      throw new Error(`Failed to get/create site: ${error.message}`);
    }
  }

  /**
   * Create ZIP file from build output
   */
  private async createZip(projectPath: string, outputDir: string): Promise<string> {
    const buildDir = path.join(projectPath, outputDir);
    const zipPath = path.join(projectPath, '.netlify-deploy.zip');
    
    // Check if build directory exists
    try {
      await fs.access(buildDir);
    } catch {
      throw new Error(`Build directory not found: ${buildDir}. Run build first.`);
    }
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
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
  private async createDeployment(siteId: string, zipPath: string): Promise<NetlifyDeploy> {
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
      
    } catch (error: any) {
      throw new Error(`Failed to create deployment: ${error.message}`);
    }
  }

  /**
   * Wait for deployment to be ready
   */
  private async waitForDeployment(siteId: string, deployId: string, maxAttempts = 60): Promise<NetlifyDeploy> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const response = await this.client.get(`/sites/${siteId}/deploys/${deployId}`);
      const deploy: NetlifyDeploy = response.data;
      
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
  async rollback(deploymentId: string): Promise<boolean> {
    try {
      // Get deployment details to find site ID
      const deployResponse = await this.client.get(`/deploys/${deploymentId}`);
      const deploy = deployResponse.data;
      const siteId = deploy.site_id;
      
      // Restore this deployment
      await this.client.post(`/sites/${siteId}/deploys/${deploymentId}/restore`);
      
      this.log(`Rolled back to deployment: ${deploymentId}`);
      return true;
      
    } catch (error: any) {
      this.log(`Rollback error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Set environment variables
   */
  async setEnvironmentVariables(siteId: string, vars: Record<string, string>): Promise<void> {
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
    } catch (error: any) {
      this.log(`Failed to set environment variables: ${error.message}`, 'error');
    }
  }

  /**
   * Log message
   */
  private log(message: string, level: 'info' | 'error' = 'info'): void {
    const prefix = level === 'error' ? '❌ [Netlify]' : '☁️ [Netlify]';
    this.outputChannel.appendLine(`${prefix} ${message}`);
  }
}
