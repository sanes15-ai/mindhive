import { Router } from 'express';
import authRoutes from './auth';
import codeRoutes from './code';
import intelligenceRoutes from './intelligence';
import agentRoutes from './agents';
import analyticsRoutes from './analytics';
import teamRoutes from './teams';
import uiRoutes from './ui';
import memoryRoutes from './memory';
import nexusRoutes from './nexus';
import debugRoutes from './debug';

const router = Router();

// API version prefix
const API_VERSION = '/v1';

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/code`, codeRoutes);
router.use(`${API_VERSION}/intelligence`, intelligenceRoutes);
router.use(`${API_VERSION}/agents`, agentRoutes);
router.use(`${API_VERSION}/analytics`, analyticsRoutes);
router.use(`${API_VERSION}/teams`, teamRoutes);
router.use(`${API_VERSION}/ui`, uiRoutes);
router.use(`${API_VERSION}/memory`, memoryRoutes);
router.use(`${API_VERSION}/nexus`, nexusRoutes);
router.use(`${API_VERSION}/debug`, debugRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'MindHive API',
    version: '1.0.0',
    description: 'The World\'s First Collective Code Intelligence Network',
    endpoints: {
      auth: `${API_VERSION}/auth`,
      code: `${API_VERSION}/code`,
      intelligence: `${API_VERSION}/intelligence`,
      agents: `${API_VERSION}/agents`,
      analytics: `${API_VERSION}/analytics`,
      teams: `${API_VERSION}/teams`,
      memory: `${API_VERSION}/memory`,
      nexus: `${API_VERSION}/nexus`,
      debug: `${API_VERSION}/debug`,
    },
    documentation: '/api-docs',
  });
});

export default router;

