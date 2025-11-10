#!/usr/bin/env tsx
/**
 * Environment Validation Script
 * Validates all required environment variables and dependencies
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  category: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }[];
}

const results: ValidationResult[] = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkEnvVar(name: string, required: boolean = true): 'pass' | 'fail' | 'warn' {
  const value = process.env[name];
  if (!value || value.includes('your-') || value.includes('change-this')) {
    return required ? 'fail' : 'warn';
  }
  return 'pass';
}

function checkCommand(command: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkPort(port: number): boolean {
  try {
    execSync(`netstat -an | findstr :${port}`, { stdio: 'ignore' });
    return false; // Port is in use
  } catch {
    return true; // Port is free
  }
}

// 1. Check Node.js and npm
log(colors.blue, '\n📦 Checking System Dependencies...');
const nodeResult: ValidationResult = {
  category: 'System Dependencies',
  checks: [],
};

try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  nodeResult.checks.push({
    name: 'Node.js',
    status: majorVersion >= 20 ? 'pass' : 'fail',
    message: `${nodeVersion} ${majorVersion >= 20 ? '(✓ ≥20.0.0)' : '(✗ Requires ≥20.0.0)'}`,
  });
} catch {
  nodeResult.checks.push({
    name: 'Node.js',
    status: 'fail',
    message: 'Not installed',
  });
}

nodeResult.checks.push({
  name: 'npm',
  status: checkCommand('npm') ? 'pass' : 'fail',
  message: checkCommand('npm') ? 'Installed' : 'Not installed',
});

nodeResult.checks.push({
  name: 'TypeScript',
  status: checkCommand('tsc') ? 'pass' : 'warn',
  message: checkCommand('tsc') ? 'Installed globally' : 'Not installed globally (using local)',
});

nodeResult.checks.push({
  name: 'Docker',
  status: checkCommand('docker') ? 'pass' : 'warn',
  message: checkCommand('docker') ? 'Installed' : 'Not installed (optional)',
});

results.push(nodeResult);

// 2. Check Environment File
log(colors.blue, '\n🔧 Checking Environment Configuration...');
const envResult: ValidationResult = {
  category: 'Environment Variables',
  checks: [],
};

if (!fs.existsSync('.env')) {
  envResult.checks.push({
    name: '.env file',
    status: 'fail',
    message: 'Missing - Copy .env.example to .env',
  });
} else {
  require('dotenv').config();
  
  envResult.checks.push({
    name: '.env file',
    status: 'pass',
    message: 'Found',
  });

  // Required variables
  const required = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  required.forEach((varName) => {
    const status = checkEnvVar(varName, true);
    envResult.checks.push({
      name: varName,
      status,
      message: status === 'pass' ? 'Configured' : 'Not configured or using placeholder',
    });
  });

  // Optional AI providers (at least one required)
  const aiProviders = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'GROK_API_KEY',
  ];

  const configuredProviders = aiProviders.filter((key) => checkEnvVar(key, false) === 'pass');
  
  envResult.checks.push({
    name: 'AI Providers',
    status: configuredProviders.length > 0 ? 'pass' : 'warn',
    message: `${configuredProviders.length}/4 configured (${configuredProviders.length > 0 ? 'OK' : 'Configure at least one'})`,
  });
}

results.push(envResult);

// 3. Check Database
log(colors.blue, '\n🗄️  Checking Database...');
const dbResult: ValidationResult = {
  category: 'Database',
  checks: [],
};

if (fs.existsSync('node_modules/@prisma/client')) {
  dbResult.checks.push({
    name: 'Prisma Client',
    status: 'pass',
    message: 'Generated',
  });
} else {
  dbResult.checks.push({
    name: 'Prisma Client',
    status: 'fail',
    message: 'Not generated - Run: npm run db:generate',
  });
}

if (fs.existsSync('prisma/migrations')) {
  const migrations = fs.readdirSync('prisma/migrations').filter((f) => f !== 'migration_lock.toml');
  dbResult.checks.push({
    name: 'Migrations',
    status: migrations.length > 0 ? 'pass' : 'warn',
    message: `${migrations.length} migration(s) found`,
  });
} else {
  dbResult.checks.push({
    name: 'Migrations',
    status: 'fail',
    message: 'Migration folder missing',
  });
}

results.push(dbResult);

// 4. Check Ports
log(colors.blue, '\n🌐 Checking Ports...');
const portResult: ValidationResult = {
  category: 'Port Availability',
  checks: [],
};

const ports = [
  { port: 3000, name: 'Backend API' },
  { port: 3001, name: 'WebSocket' },
  { port: 5432, name: 'PostgreSQL' },
  { port: 6379, name: 'Redis' },
];

ports.forEach(({ port, name }) => {
  const available = checkPort(port);
  portResult.checks.push({
    name: `Port ${port} (${name})`,
    status: available ? 'pass' : 'warn',
    message: available ? 'Available' : 'In use',
  });
});

results.push(portResult);

// 5. Check Project Files
log(colors.blue, '\n📁 Checking Project Structure...');
const fileResult: ValidationResult = {
  category: 'Project Files',
  checks: [],
};

const requiredFiles = [
  { path: 'package.json', name: 'package.json' },
  { path: 'tsconfig.json', name: 'tsconfig.json' },
  { path: 'src/index.ts', name: 'Entry point' },
  { path: 'prisma/schema.prisma', name: 'Prisma schema' },
  { path: 'docker-compose.yml', name: 'Docker Compose' },
];

requiredFiles.forEach(({ path: filePath, name }) => {
  fileResult.checks.push({
    name,
    status: fs.existsSync(filePath) ? 'pass' : 'fail',
    message: fs.existsSync(filePath) ? 'Found' : 'Missing',
  });
});

if (fs.existsSync('node_modules')) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {}).length;
    const devDependencies = Object.keys(packageJson.devDependencies || {}).length;
    fileResult.checks.push({
      name: 'Dependencies',
      status: 'pass',
      message: `${dependencies} runtime, ${devDependencies} dev packages installed`,
    });
  } catch {
    fileResult.checks.push({
      name: 'Dependencies',
      status: 'fail',
      message: 'Error reading package.json',
    });
  }
} else {
  fileResult.checks.push({
    name: 'Dependencies',
    status: 'fail',
    message: 'node_modules missing - Run: npm install',
  });
}

results.push(fileResult);

// Print Results
log(colors.blue, '\n' + '='.repeat(60));
log(colors.blue, '🧠 MindHive Environment Validation Report');
log(colors.blue, '='.repeat(60) + '\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

results.forEach((result) => {
  log(colors.blue, `\n${result.category}:`);
  result.checks.forEach((check) => {
    totalChecks++;
    const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
    const color = check.status === 'pass' ? colors.green : check.status === 'fail' ? colors.red : colors.yellow;
    
    log(color, `  ${icon} ${check.name}: ${check.message}`);
    
    if (check.status === 'pass') passedChecks++;
    else if (check.status === 'fail') failedChecks++;
    else warnings++;
  });
});

// Summary
log(colors.blue, '\n' + '='.repeat(60));
log(colors.blue, 'Summary:');
log(colors.green, `  ✓ Passed: ${passedChecks}/${totalChecks}`);
if (warnings > 0) log(colors.yellow, `  ⚠ Warnings: ${warnings}/${totalChecks}`);
if (failedChecks > 0) log(colors.red, `  ✗ Failed: ${failedChecks}/${totalChecks}`);
log(colors.blue, '='.repeat(60) + '\n');

// Recommendations
if (failedChecks > 0 || warnings > 0) {
  log(colors.yellow, '\n📋 Recommendations:\n');
  
  if (!fs.existsSync('.env')) {
    log(colors.yellow, '  1. Copy environment file:');
    log(colors.reset, '     cp .env.example .env');
  }
  
  if (!fs.existsSync('node_modules')) {
    log(colors.yellow, '  2. Install dependencies:');
    log(colors.reset, '     npm install');
  }
  
  if (!fs.existsSync('node_modules/@prisma/client')) {
    log(colors.yellow, '  3. Generate Prisma client:');
    log(colors.reset, '     npm run db:generate');
  }
  
  const aiConfigured = results.find((r) => r.category === 'Environment Variables')
    ?.checks.find((c) => c.name === 'AI Providers');
  
  if (aiConfigured && aiConfigured.status !== 'pass') {
    log(colors.yellow, '  4. Configure at least one AI provider in .env:');
    log(colors.reset, '     - OPENAI_API_KEY=sk-...');
    log(colors.reset, '     - ANTHROPIC_API_KEY=sk-ant-...');
    log(colors.reset, '     - GOOGLE_API_KEY=...');
    log(colors.reset, '     - GROK_API_KEY=...');
  }
  
  log(colors.yellow, '\n  5. Set up the database:');
  log(colors.reset, '     npm run db:migrate');
  log(colors.reset, '     npm run db:seed');
  
  log(colors.yellow, '\n  6. Start the development server:');
  log(colors.reset, '     npm run dev\n');
}

// Exit with appropriate code
if (failedChecks > 0) {
  log(colors.red, '❌ Environment validation failed. Please fix the issues above.\n');
  process.exit(1);
} else if (warnings > 0) {
  log(colors.yellow, '⚠️  Environment validation passed with warnings.\n');
  process.exit(0);
} else {
  log(colors.green, '✅ Environment validation passed! Ready to start development.\n');
  process.exit(0);
}
