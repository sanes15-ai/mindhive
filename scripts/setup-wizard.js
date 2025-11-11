#!/usr/bin/env node

/**
 * MindHive Setup Wizard
 * Interactive setup script for first-time users
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, { ...options, stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    return null;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║           🧠 MINDHIVE Setup Wizard                        ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('This wizard will help you set up MindHive for the first time.\n');

  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`✓ Node.js version: ${nodeVersion}`);
  
  if (parseInt(nodeVersion.slice(1).split('.')[0]) < 20) {
    console.error('✗ Node.js 20+ is required');
    process.exit(1);
  }

  // Step 1: Environment Configuration
  console.log('\n📝 Step 1: Environment Configuration\n');
  
  const useDefaults = await question('Use default configuration? (Y/n): ');
  
  let config = {
    NODE_ENV: 'development',
    PORT: '3000',
    HOST: 'localhost',
    JWT_SECRET: generateSecret(),
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/mindhive',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    ENABLE_HELMET: 'true',
    ENABLE_CORS: 'true',
    ALLOWED_ORIGINS: 'http://localhost:3000',
  };

  if (useDefaults.toLowerCase() !== 'n') {
    console.log('Using default configuration...');
  } else {
    config.PORT = await question(`API Port [${config.PORT}]: `) || config.PORT;
    config.DATABASE_URL = await question(`Database URL [${config.DATABASE_URL}]: `) || config.DATABASE_URL;
    config.REDIS_HOST = await question(`Redis Host [${config.REDIS_HOST}]: `) || config.REDIS_HOST;
  }

  // Step 2: AI Provider Configuration
  console.log('\n🤖 Step 2: AI Provider Configuration\n');
  console.log('MindHive supports multiple AI providers. Configure at least one:\n');

  const configureOpenAI = await question('Configure OpenAI? (Y/n): ');
  if (configureOpenAI.toLowerCase() !== 'n') {
    const apiKey = await question('OpenAI API Key (sk-...): ');
    if (apiKey && apiKey.startsWith('sk-')) {
      config.OPENAI_API_KEY = apiKey;
      console.log('✓ OpenAI configured');
    } else {
      console.log('⚠ Invalid API key format, skipping');
    }
  }

  const configureClaude = await question('Configure Anthropic Claude? (y/N): ');
  if (configureClaude.toLowerCase() === 'y') {
    const apiKey = await question('Anthropic API Key (sk-ant-...): ');
    if (apiKey) {
      config.ANTHROPIC_API_KEY = apiKey;
      console.log('✓ Anthropic configured');
    }
  }

  const configureGemini = await question('Configure Google Gemini? (y/N): ');
  if (configureGemini.toLowerCase() === 'y') {
    const apiKey = await question('Google API Key: ');
    if (apiKey) {
      config.GOOGLE_API_KEY = apiKey;
      console.log('✓ Google Gemini configured');
    }
  }

  // Write .env file
  console.log('\n💾 Writing configuration to .env...');
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync('.env', envContent + '\n');
  console.log('✓ Configuration saved');

  // Step 3: Install Dependencies
  console.log('\n📦 Step 3: Installing Dependencies\n');
  const installDeps = await question('Install npm dependencies? (Y/n): ');
  
  if (installDeps.toLowerCase() !== 'n') {
    console.log('Running npm install...');
    execCommand('npm install');
    console.log('✓ Dependencies installed');
  }

  // Step 4: Database Setup
  console.log('\n🗄️  Step 4: Database Setup\n');
  
  const setupDb = await question('Setup database now? (Y/n): ');
  
  if (setupDb.toLowerCase() !== 'n') {
    console.log('\nGenerating Prisma Client...');
    execCommand('npm run db:generate');
    
    console.log('\nRunning database migrations...');
    const migrateResult = execCommand('npm run db:migrate');
    
    if (migrateResult !== null) {
      console.log('✓ Database migrations completed');
      
      const seedDb = await question('Seed database with sample data? (y/N): ');
      if (seedDb.toLowerCase() === 'y') {
        console.log('Seeding database...');
        execCommand('npm run db:seed');
        console.log('✓ Database seeded');
      }
    } else {
      console.log('⚠ Database migration failed. Check your DATABASE_URL and ensure PostgreSQL is running.');
    }
  }

  // Step 5: Build Project
  console.log('\n🔨 Step 5: Building Project\n');
  const buildProject = await question('Build project now? (Y/n): ');
  
  if (buildProject.toLowerCase() !== 'n') {
    console.log('Building...');
    execCommand('npm run build');
    console.log('✓ Build completed');
  }

  // Step 6: Validation
  console.log('\n✅ Step 6: Validation\n');
  console.log('Running environment validation...');
  execCommand('npm run validate');

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║           ✨ Setup Complete!                              ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Next Steps:');
  console.log('  1. Start the development server:');
  console.log('     npm run dev\n');
  console.log('  2. Or start with Docker:');
  console.log('     npm run docker:up\n');
  console.log('  3. Access the API:');
  console.log(`     http://localhost:${config.PORT}\n`);
  console.log('  4. Read the documentation:');
  console.log('     - QUICK_START.md - Getting started guide');
  console.log('     - API_DOCS.md - API documentation');
  console.log('     - README.md - Full documentation\n');
  console.log('  5. Create your first user:');
  console.log('     curl -X POST http://localhost:3000/api/v1/auth/register \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"email":"user@example.com","password":"SecurePass123","name":"Your Name"}\'\n');

  if (!config.OPENAI_API_KEY && !config.ANTHROPIC_API_KEY && !config.GOOGLE_API_KEY) {
    console.log('⚠️  Note: No AI providers configured. Code generation will not work.');
    console.log('   Add API keys to .env and restart the server.\n');
  }

  console.log('For help and support:');
  console.log('  - GitHub Issues: https://github.com/sanes15-ai/mindhive/issues');
  console.log('  - Documentation: https://github.com/sanes15-ai/mindhive#readme\n');

  rl.close();
}

main().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
