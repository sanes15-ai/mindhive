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
exports.PortDetector = void 0;
const vscode = __importStar(require("vscode"));
const net = __importStar(require("net"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Smart port detector that finds running development servers
 * Scans common ports and detects framework-specific servers
 */
class PortDetector {
    static COMMON_PORTS = [
        { port: 3000, framework: 'React/Next.js', priority: 10, processNames: ['react-scripts', 'next', 'npm'] },
        { port: 5173, framework: 'Vite', priority: 9, processNames: ['vite', 'npm'] },
        { port: 8080, framework: 'Vue/Webpack', priority: 8, processNames: ['vue-cli-service', 'webpack-dev-server'] },
        { port: 4200, framework: 'Angular', priority: 7, processNames: ['ng', 'angular-cli'] },
        { port: 3001, framework: 'Express/Node', priority: 6, processNames: ['node', 'nodemon'] },
        { port: 3002, framework: 'Custom Server', priority: 5 },
        { port: 5000, framework: 'Flask/Python', priority: 4, processNames: ['python', 'flask'] },
        { port: 8000, framework: 'Django', priority: 3, processNames: ['python', 'django'] },
        { port: 4000, framework: 'Gatsby', priority: 2, processNames: ['gatsby'] },
        { port: 1234, framework: 'Parcel', priority: 1, processNames: ['parcel'] },
    ];
    outputChannel;
    cachedPorts = new Map();
    lastScanTime = 0;
    SCAN_CACHE_MS = 5000; // Cache results for 5 seconds
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    /**
     * Detect all running development servers
     * Returns ports sorted by priority
     */
    async detectRunningServers() {
        // Return cached results if recent scan
        const now = Date.now();
        if (now - this.lastScanTime < this.SCAN_CACHE_MS && this.cachedPorts.size > 0) {
            this.outputChannel.appendLine('🔄 Using cached port scan results');
            return Array.from(this.cachedPorts.values()).sort((a, b) => {
                const configA = PortDetector.COMMON_PORTS.find(c => c.port === a.port);
                const configB = PortDetector.COMMON_PORTS.find(c => c.port === b.port);
                return (configB?.priority || 0) - (configA?.priority || 0);
            });
        }
        this.outputChannel.appendLine('🔍 Scanning for running development servers...');
        const detectedPorts = [];
        this.cachedPorts.clear();
        // Parallel port scanning for speed
        const scanPromises = PortDetector.COMMON_PORTS.map(config => this.checkPort(config).catch(err => {
            this.outputChannel.appendLine(`⚠️ Error checking port ${config.port}: ${err.message}`);
            return null;
        }));
        const results = await Promise.all(scanPromises);
        for (const detected of results) {
            if (detected && detected.isRunning) {
                detectedPorts.push(detected);
                this.cachedPorts.set(detected.port, detected);
                this.outputChannel.appendLine(`✅ Found ${detected.framework} on port ${detected.port} - ${detected.url}`);
            }
        }
        // Also check for custom ports in workspace settings
        const customPorts = await this.getCustomPorts();
        for (const port of customPorts) {
            if (!this.cachedPorts.has(port)) {
                const detected = await this.checkPort({ port, framework: 'Custom', priority: 11 });
                if (detected && detected.isRunning) {
                    detectedPorts.push(detected);
                    this.cachedPorts.set(port, detected);
                    this.outputChannel.appendLine(`✅ Found Custom server on port ${port}`);
                }
            }
        }
        this.lastScanTime = now;
        if (detectedPorts.length === 0) {
            this.outputChannel.appendLine('❌ No running development servers found');
            vscode.window.showWarningMessage('No development server detected. Please start your server (npm run dev, npm start, etc.)');
        }
        else {
            this.outputChannel.appendLine(`📊 Found ${detectedPorts.length} running server(s)`);
        }
        // Sort by priority
        return detectedPorts.sort((a, b) => {
            const configA = PortDetector.COMMON_PORTS.find(c => c.port === a.port);
            const configB = PortDetector.COMMON_PORTS.find(c => c.port === b.port);
            return (configB?.priority || 0) - (configA?.priority || 0);
        });
    }
    /**
     * Check if a specific port is active
     */
    async checkPort(config) {
        const isRunning = await this.isPortOpen(config.port);
        if (!isRunning) {
            return null;
        }
        // Try to get process information
        const processInfo = await this.getProcessInfo(config.port, config.processNames);
        return {
            port: config.port,
            framework: config.framework,
            isRunning: true,
            processInfo,
            url: `http://localhost:${config.port}`
        };
    }
    /**
     * Test if port is open using TCP connection
     */
    async isPortOpen(port) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, 1000); // 1 second timeout
            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });
            socket.connect(port, 'localhost');
        });
    }
    /**
     * Get process information for the port (Windows, macOS, Linux)
     */
    async getProcessInfo(port, processNames) {
        try {
            const platform = process.platform;
            let command;
            if (platform === 'win32') {
                // Windows: netstat
                command = `netstat -ano | findstr :${port}`;
            }
            else {
                // macOS/Linux: lsof
                command = `lsof -i :${port} -sTCP:LISTEN -t | xargs ps -o comm=`;
            }
            const { stdout } = await execAsync(command);
            const processInfo = stdout.trim();
            // Check if matches expected process names
            if (processNames && processInfo) {
                for (const name of processNames) {
                    if (processInfo.toLowerCase().includes(name.toLowerCase())) {
                        return `${processInfo} (${name})`;
                    }
                }
            }
            return processInfo || undefined;
        }
        catch (error) {
            // Process info not critical, continue without it
            return undefined;
        }
    }
    /**
     * Get custom ports from workspace settings or package.json
     */
    async getCustomPorts() {
        const customPorts = [];
        // Check workspace settings
        const config = vscode.workspace.getConfiguration('mindhive');
        const configuredPorts = config.get('preview.customPorts', []);
        customPorts.push(...configuredPorts);
        // Check package.json for port hints
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const packageJsonPath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
                const packageJsonData = await vscode.workspace.fs.readFile(packageJsonPath);
                const packageJson = JSON.parse(packageJsonData.toString());
                // Look for scripts that specify ports
                if (packageJson.scripts) {
                    for (const script of Object.values(packageJson.scripts)) {
                        const portMatch = script.match(/--port[=\s]+(\d+)/);
                        if (portMatch) {
                            customPorts.push(parseInt(portMatch[1], 10));
                        }
                    }
                }
            }
        }
        catch (error) {
            // package.json not found or invalid, continue
        }
        return [...new Set(customPorts)]; // Remove duplicates
    }
    /**
     * Find the best port to use (highest priority running server)
     */
    async findBestPort() {
        const ports = await this.detectRunningServers();
        return ports.length > 0 ? ports[0] : null;
    }
    /**
     * Clear cache to force fresh scan
     */
    clearCache() {
        this.cachedPorts.clear();
        this.lastScanTime = 0;
    }
    /**
     * Watch for new servers starting
     * Returns disposable to stop watching
     */
    watchForNewServers(onNewServer) {
        const interval = setInterval(async () => {
            const ports = await this.detectRunningServers();
            // Find any new ports not in previous scan
            for (const port of ports) {
                if (!this.cachedPorts.has(port.port)) {
                    this.outputChannel.appendLine(`🆕 New server detected: ${port.framework} on port ${port.port}`);
                    onNewServer(port);
                }
            }
        }, 10000); // Check every 10 seconds
        return new vscode.Disposable(() => clearInterval(interval));
    }
}
exports.PortDetector = PortDetector;
//# sourceMappingURL=PortDetector.js.map