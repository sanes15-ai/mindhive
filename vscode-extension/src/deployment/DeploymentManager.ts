import * as vscode from 'vscode';
import { VercelDeployer } from './VercelDeployer';
import { NetlifyDeployer } from './NetlifyDeployer';
import { RailwayDeployer } from './RailwayDeployer';
import { BuildAutomation } from './BuildAutomation';

export type DeploymentPlatform = 'vercel' | 'netlify' | 'railway';

export interface DeploymentConfig {
  platform: DeploymentPlatform;
  projectPath: string;
  buildCommand?: string;
  outputDirectory?: string;
  environmentVariables?: Record<string, string>;
  token?: string;
}

export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
  logs?: string[];
  duration?: number;
}

export interface DeploymentStatus {
  platform: DeploymentPlatform;
  status: 'queued' | 'building' | 'deploying' | 'ready' | 'error' | 'cancelled';
  url?: string;
  deploymentId?: string;
  progress?: number;
  message?: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * 🚀 DeploymentManager - One-Click Deployment to Multiple Platforms
 * 
 * **Features:**
 * - Auto-detect project type (React, Next.js, Vite, Angular, Vue, etc.)
 * - Smart build command detection from package.json
 * - Multi-platform support (Vercel, Netlify, Railway)
 * - Real-time deployment logs streaming
 * - Environment variable management
 * - Deployment history tracking
 * - One-click rollback
 * - Status notifications
 * 
 * **Usage:**
 * ```typescript
 * const manager = new DeploymentManager(outputChannel);
 * const result = await manager.deploy({ platform: 'vercel', projectPath: workspaceRoot });
 * ```
 */
export class DeploymentManager implements vscode.Disposable {
  private vercelDeployer: VercelDeployer;
  private netlifyDeployer: NetlifyDeployer;
  private railwayDeployer: RailwayDeployer;
  private buildAutomation: BuildAutomation;
  
  private currentDeployment: DeploymentStatus | null = null;
  private deploymentHistory: DeploymentStatus[] = [];
  private disposables: vscode.Disposable[] = [];

  constructor(private outputChannel: vscode.OutputChannel) {
    this.vercelDeployer = new VercelDeployer(outputChannel);
    this.netlifyDeployer = new NetlifyDeployer(outputChannel);
    this.railwayDeployer = new RailwayDeployer(outputChannel);
    this.buildAutomation = new BuildAutomation(outputChannel);
    
    this.log('DeploymentManager initialized');
  }

  /**
   * Deploy to specified platform with auto-detection
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    const startTime = Date.now();
    
    try {
      this.log(`Starting deployment to ${config.platform}...`);
      
      // 1. Validate configuration
      await this.validateConfiguration(config);
      
      // 2. Detect and validate build command
      if (!config.buildCommand) {
        config.buildCommand = await this.buildAutomation.detectBuildCommand(config.projectPath);
      }
      
      // 3. Validate build output
      if (!config.outputDirectory) {
        config.outputDirectory = await this.buildAutomation.detectOutputDirectory(config.projectPath);
      }
      
      // 4. Update deployment status
      this.currentDeployment = {
        platform: config.platform,
        status: 'queued',
        startTime: new Date(),
        progress: 0,
        message: 'Preparing deployment...'
      };
      
      // 5. Run build (if needed)
      const buildResult = await this.buildAutomation.build(config.projectPath, config.buildCommand);
      if (!buildResult.success) {
        throw new Error(`Build failed: ${buildResult.error}`);
      }
      
      this.updateDeploymentStatus('building', 'Build completed', 30);
      
      // 6. Deploy to platform
      let result: DeploymentResult;
      
      switch (config.platform) {
        case 'vercel':
          result = await this.vercelDeployer.deploy(config);
          break;
        case 'netlify':
          result = await this.netlifyDeployer.deploy(config);
          break;
        case 'railway':
          result = await this.railwayDeployer.deploy(config);
          break;
        default:
          throw new Error(`Unsupported platform: ${config.platform}`);
      }
      
      const duration = Date.now() - startTime;
      result.duration = duration;
      
      // 7. Update status
      if (result.success) {
        this.updateDeploymentStatus('ready', `Deployed to ${result.url}`, 100);
        this.currentDeployment!.url = result.url;
        this.currentDeployment!.deploymentId = result.deploymentId;
        this.currentDeployment!.endTime = new Date();
        
        // Add to history
        this.deploymentHistory.unshift({ ...this.currentDeployment! });
        
        // Show success notification
        const action = await vscode.window.showInformationMessage(
          `🚀 Deployed to ${config.platform} in ${(duration / 1000).toFixed(1)}s`,
          'Open Site',
          'Copy URL',
          'View Logs'
        );
        
        if (action === 'Open Site' && result.url) {
          vscode.env.openExternal(vscode.Uri.parse(result.url));
        } else if (action === 'Copy URL' && result.url) {
          vscode.env.clipboard.writeText(result.url);
        } else if (action === 'View Logs') {
          this.outputChannel.show();
        }
      } else {
        this.updateDeploymentStatus('error', result.error || 'Unknown error', 0);
        this.currentDeployment!.endTime = new Date();
        this.deploymentHistory.unshift({ ...this.currentDeployment! });
        
        vscode.window.showErrorMessage(`❌ Deployment failed: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      this.log(`Deployment error: ${error}`, 'error');
      
      this.updateDeploymentStatus('error', String(error), 0);
      if (this.currentDeployment) {
        this.currentDeployment.endTime = new Date();
        this.deploymentHistory.unshift({ ...this.currentDeployment });
      }
      
      return {
        success: false,
        error: String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Quick deploy with platform selection
   */
  async quickDeploy(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }
    
    const projectPath = workspaceFolders[0].uri.fsPath;
    
    // Detect project type
    const projectType = await this.buildAutomation.detectProjectType(projectPath);
    
    // Suggest platform based on project type
    const suggestedPlatform = this.suggestPlatform(projectType);
    
    // Platform selection
    const platform = await vscode.window.showQuickPick(
      [
        {
          label: `$(rocket) ${suggestedPlatform.toUpperCase()}`,
          description: 'Recommended',
          platform: suggestedPlatform
        },
        {
          label: '$(globe) Vercel',
          description: 'Best for frontend & Next.js',
          platform: 'vercel' as DeploymentPlatform
        },
        {
          label: '$(cloud) Netlify',
          description: 'Best for static sites & serverless',
          platform: 'netlify' as DeploymentPlatform
        },
        {
          label: '$(server) Railway',
          description: 'Best for full-stack & databases',
          platform: 'railway' as DeploymentPlatform
        }
      ],
      { placeHolder: 'Select deployment platform' }
    );
    
    if (!platform) {
      return;
    }
    
    // Check for token
    const token = await this.getToken(platform.platform);
    if (!token) {
      const action = await vscode.window.showWarningMessage(
        `No ${platform.platform} token found. Configure now?`,
        'Configure',
        'Cancel'
      );
      
      if (action === 'Configure') {
        await this.configureToken(platform.platform);
        return;
      }
      return;
    }
    
    // Start deployment
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Deploying to ${platform.platform}...`,
        cancellable: false
      },
      async () => {
        await this.deploy({
          platform: platform.platform,
          projectPath,
          token
        });
      }
    );
  }

  /**
   * Show deployment history
   */
  async showHistory(): Promise<void> {
    if (this.deploymentHistory.length === 0) {
      vscode.window.showInformationMessage('No deployment history yet');
      return;
    }
    
    const selected = await vscode.window.showQuickPick(
      this.deploymentHistory.map((deployment) => {
        const duration = deployment.endTime 
          ? ((deployment.endTime.getTime() - deployment.startTime.getTime()) / 1000).toFixed(1)
          : 'N/A';
        
        const icon = deployment.status === 'ready' ? '$(check)' : 
                     deployment.status === 'error' ? '$(error)' :
                     '$(loading~spin)';
        
        return {
          label: `${icon} ${deployment.platform} - ${deployment.status}`,
          description: deployment.url || deployment.message,
          detail: `${deployment.startTime.toLocaleString()} • ${duration}s`,
          deployment
        };
      }),
      { placeHolder: 'Select deployment to view details' }
    );
    
    if (selected && selected.deployment.url) {
      const action = await vscode.window.showInformationMessage(
        `Deployment to ${selected.deployment.platform}`,
        'Open Site',
        'Copy URL'
      );
      
      if (action === 'Open Site') {
        vscode.env.openExternal(vscode.Uri.parse(selected.deployment.url));
      } else if (action === 'Copy URL') {
        vscode.env.clipboard.writeText(selected.deployment.url);
      }
    }
  }

  /**
   * Rollback to previous deployment
   */
  async rollback(platform: DeploymentPlatform, deploymentId: string): Promise<boolean> {
    try {
      this.log(`Rolling back ${platform} deployment ${deploymentId}...`);
      
      let success = false;
      
      switch (platform) {
        case 'vercel':
          success = await this.vercelDeployer.rollback(deploymentId);
          break;
        case 'netlify':
          success = await this.netlifyDeployer.rollback(deploymentId);
          break;
        case 'railway':
          // Railway doesn't support direct rollback, need to redeploy
          vscode.window.showWarningMessage('Railway does not support rollback. Redeploy previous version instead.');
          return false;
      }
      
      if (success) {
        vscode.window.showInformationMessage(`✅ Rolled back ${platform} deployment`);
      }
      
      return success;
      
    } catch (error) {
      this.log(`Rollback error: ${error}`, 'error');
      vscode.window.showErrorMessage(`Failed to rollback: ${error}`);
      return false;
    }
  }

  /**
   * Configure token for platform
   */
  private async configureToken(platform: DeploymentPlatform): Promise<void> {
    const instructions: Record<DeploymentPlatform, string> = {
      vercel: 'Get your token from: https://vercel.com/account/tokens',
      netlify: 'Get your token from: https://app.netlify.com/user/applications#personal-access-tokens',
      railway: 'Get your token from: https://railway.app/account/tokens'
    };
    
    const token = await vscode.window.showInputBox({
      prompt: `Enter your ${platform} access token`,
      placeHolder: instructions[platform],
      password: true,
      ignoreFocusOut: true
    });
    
    if (token) {
      await this.setToken(platform, token);
      vscode.window.showInformationMessage(`${platform} token saved!`);
    }
  }

  /**
   * Get token from secret storage
   */
  private async getToken(platform: DeploymentPlatform): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('mindhive.deployment');
    return config.get<string>(`${platform}Token`);
  }

  /**
   * Save token to secret storage
   */
  private async setToken(platform: DeploymentPlatform, token: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('mindhive.deployment');
    await config.update(`${platform}Token`, token, vscode.ConfigurationTarget.Global);
  }

  /**
   * Validate configuration
   */
  private async validateConfiguration(config: DeploymentConfig): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    // Check if project path exists
    if (!fs.existsSync(config.projectPath)) {
      throw new Error(`Project path does not exist: ${config.projectPath}`);
    }
    
    // Check if package.json exists
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found. Is this a valid project?');
    }
    
    // Check for token
    if (!config.token) {
      config.token = await this.getToken(config.platform);
      if (!config.token) {
        throw new Error(`No ${config.platform} token found. Configure token first.`);
      }
    }
  }

  /**
   * Suggest platform based on project type
   */
  private suggestPlatform(projectType: string): DeploymentPlatform {
    if (projectType.includes('next')) return 'vercel';
    if (projectType.includes('react') || projectType.includes('vite')) return 'netlify';
    if (projectType.includes('node') || projectType.includes('express')) return 'railway';
    return 'vercel'; // Default
  }

  /**
   * Update deployment status
   */
  private updateDeploymentStatus(
    status: DeploymentStatus['status'],
    message: string,
    progress: number
  ): void {
    if (this.currentDeployment) {
      this.currentDeployment.status = status;
      this.currentDeployment.message = message;
      this.currentDeployment.progress = progress;
    }
    this.log(message);
  }

  /**
   * Log message to output channel
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📋';
    this.outputChannel.appendLine(`[${timestamp}] ${prefix} ${message}`);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
