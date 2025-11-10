import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Intelligence API', () => {
  let authToken: string;

  beforeAll(async () => {
    const testUser = {
      name: 'Intelligence Test User',
      email: 'intel@example.com',
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
      where: { email: 'intel@example.com' },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/intelligence/nexus-scan', () => {
    it('should perform comprehensive NEXUS scan', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/nexus-scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'function hello() { return "world"; }',
          language: 'javascript',
        })
        .expect(200);

      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('syntax');
      expect(response.body.checks).toHaveProperty('security');
    });
  });

  describe('GET /api/v1/intelligence/global-patterns', () => {
    it('should retrieve global patterns', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/global-patterns')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
      expect(Array.isArray(response.body.patterns)).toBe(true);
    });

    it('should filter patterns by language', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/global-patterns?language=typescript')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
      if (response.body.patterns.length > 0) {
        expect(response.body.patterns.every((p: any) => 
          p.language === 'typescript'
        )).toBe(true);
      }
    });

    it('should filter patterns by category', async () => {
      const response = await request(app)
        .get('/api/v1/intelligence/global-patterns?category=authentication')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
    });
  });

  describe('POST /api/v1/intelligence/learn-pattern', () => {
    it('should learn from new code pattern', async () => {
      const response = await request(app)
        .post('/api/v1/intelligence/learn-pattern')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'async function fetchData() { const res = await fetch(url); return res.json(); }',
          language: 'javascript',
          category: 'api',
          framework: 'vanilla',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('learned');
    });
  });
});

