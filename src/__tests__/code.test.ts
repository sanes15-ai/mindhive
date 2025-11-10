import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Code Generation API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create test user and get token
    const testUser = {
      name: 'Code Test User',
      email: 'codetest@example.com',
      password: 'TestPass123!',
    };

    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    authToken = response.body.token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'codetest@example.com' },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/code/generate', () => {
    it('should generate code with valid request', async () => {
      const response = await request(app)
        .post('/api/v1/code/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Create a simple hello world function',
          language: 'typescript',
          framework: 'node',
          provider: 'openai',
        })
        .expect(200);

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('nexusScore');
      expect(response.body.nexusScore).toHaveProperty('confidence');
      expect(response.body.nexusScore).toHaveProperty('warnings');
      expect(response.body.nexusScore.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.nexusScore.confidence).toBeLessThanOrEqual(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/code/generate')
        .send({
          prompt: 'Create a function',
          language: 'typescript',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/code/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // missing prompt and language
          framework: 'node',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle different AI providers', async () => {
      const providers = ['openai', 'anthropic', 'google'];

      for (const provider of providers) {
        const response = await request(app)
          .post('/api/v1/code/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prompt: 'Simple function',
            language: 'typescript',
            provider,
          });

        // Should succeed or gracefully fail
        expect([200, 503]).toContain(response.status);
      }
    });
  });

  describe('POST /api/v1/code/scan', () => {
    const sampleCode = `
function add(a: number, b: number): number {
  return a + b;
}
    `;

    it('should scan code and return NEXUS score', async () => {
      const response = await request(app)
        .post('/api/v1/code/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: sampleCode,
          language: 'typescript',
        })
        .expect(200);

      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect security issues', async () => {
      const maliciousCode = `
const user = req.query.user;
db.query('SELECT * FROM users WHERE id = ' + user);
      `;

      const response = await request(app)
        .post('/api/v1/code/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: maliciousCode,
          language: 'javascript',
        })
        .expect(200);

      expect(response.body.warnings.length).toBeGreaterThan(0);
      expect(response.body.warnings.some((w: any) => 
        w.message.toLowerCase().includes('sql') || 
        w.message.toLowerCase().includes('injection')
      )).toBe(true);
    });
  });
});

