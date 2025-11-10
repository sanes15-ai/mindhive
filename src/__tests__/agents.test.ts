import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Agents API', () => {
  let authToken: string;

  beforeAll(async () => {
    const testUser = {
      name: 'Agents Test User',
      email: 'agents@example.com',
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
      where: { email: 'agents@example.com' },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/agents', () => {
    it('should list available agents', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('agents');
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body.agents.length).toBeGreaterThan(0);
      
      const agent = response.body.agents[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
    });
  });

  describe('POST /api/v1/agents/:agentId/assign', () => {
    it('should assign task to agent', async () => {
      const response = await request(app)
        .post('/api/v1/agents/codegen/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'code_generation',
          prompt: 'Create a sorting function',
          language: 'typescript',
        })
        .expect(200);

      expect(response.body).toHaveProperty('taskId');
      expect(response.body).toHaveProperty('status');
    });

    it('should validate task data', async () => {
      const response = await request(app)
        .post('/api/v1/agents/codegen/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // missing required fields
          type: 'code_generation',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/agents/:agentId/tasks', () => {
    it('should retrieve agent tasks', async () => {
      const response = await request(app)
        .get('/api/v1/agents/codegen/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });
  });
});

