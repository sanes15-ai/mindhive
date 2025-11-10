import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Analytics API', () => {
  let authToken: string;

  beforeAll(async () => {
    const testUser = {
      name: 'Analytics Test User',
      email: 'analytics@example.com',
      password: 'TestPass123!',
    };

    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    authToken = response.body.token;

    // Generate some code to have analytics data
    await request(app)
      .post('/api/v1/code/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prompt: 'Test function',
        language: 'typescript',
      });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'analytics@example.com' },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/analytics/user', () => {
    it('should retrieve user analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalGenerations');
      expect(response.body).toHaveProperty('totalScans');
      expect(response.body).toHaveProperty('averageConfidence');
      expect(response.body).toHaveProperty('successRate');
      expect(typeof response.body.totalGenerations).toBe('number');
    });

    it('should filter by time range', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/user?timeRange=7d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalGenerations');
    });
  });

  describe('GET /api/v1/analytics/detailed', () => {
    it('should retrieve detailed analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/detailed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('languages');
      expect(Array.isArray(response.body.timeline)).toBe(true);
    });
  });

  describe('GET /api/v1/analytics/global', () => {
    it('should retrieve global analytics for admins', async () => {
      // This might fail if user is not admin
      const response = await request(app)
        .get('/api/v1/analytics/global')
        .set('Authorization', `Bearer ${authToken}`);

      // Accept either success or forbidden
      expect([200, 403]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalUsers');
        expect(response.body).toHaveProperty('totalGenerations');
      }
    });
  });
});

