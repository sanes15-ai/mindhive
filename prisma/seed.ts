import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@hivemind.dev' },
    update: {},
    create: {
      email: 'demo@hivemind.dev',
      passwordHash: await bcrypt.hash('demo123', 10),
      name: 'Demo User',
      tier: 'PRO',
    },
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create user analytics
  await prisma.userAnalytics.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      totalSearches: 0,
      totalGenerations: 0,
      totalFixes: 0,
      successRate: 0,
    },
  });

  // Create user preferences
  await prisma.userPreferences.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      sharePatterns: true,
      anonymousSharing: true,
      enableSelfHealing: true,
      enablePredictive: true,
    },
  });

  console.log('✅ User analytics and preferences created');

  // Create sample global patterns
  const patterns = [
    {
      name: 'Express REST API Setup',
      description: 'Production-ready Express.js REST API with TypeScript',
      code: `import express from 'express';
const app = express();
app.use(express.json());
// Routes, middleware, error handling...`,
      language: 'typescript',
      framework: 'express',
      category: 'API',
      tags: ['express', 'rest', 'api', 'backend'],
      usageCount: 15234,
      successRate: 0.94,
      confidenceScore: 0.96,
      verificationCount: 523,
      upvotes: 489,
      downvotes: 34,
    },
    {
      name: 'React Authentication Hook',
      description: 'Custom React hook for user authentication',
      code: `export function useAuth() {
  const [user, setUser] = useState(null);
  // Auth logic...
  return { user, login, logout };
}`,
      language: 'typescript',
      framework: 'react',
      category: 'AUTHENTICATION',
      tags: ['react', 'hooks', 'auth'],
      usageCount: 23456,
      successRate: 0.91,
      confidenceScore: 0.93,
      verificationCount: 892,
      upvotes: 823,
      downvotes: 69,
    },
    {
      name: 'PostgreSQL Transaction Pattern',
      description: 'Safe database transaction handling',
      code: `await prisma.$transaction(async (tx) => {
  // Multiple operations...
});`,
      language: 'typescript',
      framework: 'prisma',
      category: 'DATABASE',
      tags: ['postgresql', 'transaction', 'database'],
      usageCount: 8765,
      successRate: 0.97,
      confidenceScore: 0.98,
      verificationCount: 234,
      upvotes: 228,
      downvotes: 6,
    },
  ];

  for (const pattern of patterns) {
    await prisma.globalPattern.create({
      data: {
        ...pattern,
        embedding: Array(1536).fill(0), // Placeholder embedding
      },
    });
  }

  console.log(`✅ Created ${patterns.length} sample patterns`);

  // Create sample collective intelligence
  await prisma.collectiveIntelligence.create({
    data: {
      topic: 'Express.js Best Practices',
      category: 'API',
      language: 'typescript',
      framework: 'express',
      totalContributors: 12453,
      totalUsage: 45632,
      avgConfidence: 0.92,
      successRate: 0.89,
      insights: {
        topPatterns: ['middleware-chain', 'error-handling', 'async-routes'],
        commonPitfalls: ['missing-error-handlers', 'synchronous-blocking'],
      },
      recommendations: {
        mustHave: ['helmet', 'cors', 'compression'],
        avoid: ['bodyParser-deprecated', 'callback-hell'],
      },
      alternatives: [
        { name: 'Fastify', pros: 'Faster', cons: 'Smaller ecosystem' },
      ],
      trendingScore: 0.85,
    },
  });

  console.log('✅ Created sample collective intelligence');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
