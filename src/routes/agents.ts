import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AgentCoordinator } from '../agents/coordinator';
import { AIOrchestrator } from '../services/ai/orchestrator';
import { NexusEngine } from '../services/nexus/engine';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize services
const aiOrchestrator = new AIOrchestrator();
const nexusEngine = new NexusEngine();
const agentCoordinator = new AgentCoordinator(aiOrchestrator, nexusEngine);

Promise.all([
  aiOrchestrator.initialize(),
  nexusEngine.initialize(),
  agentCoordinator.initialize(),
]);

// Request code generation
router.post(
  '/codegen',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const task = {
      id: uuidv4(),
      type: 'codegen' as const,
      input: req.body,
      priority: 1,
      userId: req.user!.id,
    };

    const result = await agentCoordinator.executeTask(task);

    res.json(result);
  })
);

// Request bug fix
router.post(
  '/sentinel',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const task = {
      id: uuidv4(),
      type: 'sentinel' as const,
      input: req.body,
      priority: 2, // Higher priority for bugs
      userId: req.user!.id,
    };

    const result = await agentCoordinator.executeTask(task);

    res.json(result);
  })
);

// Request optimization
router.post(
  '/optimizer',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const task = {
      id: uuidv4(),
      type: 'optimizer' as const,
      input: req.body,
      priority: 1,
      userId: req.user!.id,
    };

    const result = await agentCoordinator.executeTask(task);

    res.json(result);
  })
);

// Request security scan
router.post(
  '/security',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const task = {
      id: uuidv4(),
      type: 'security' as const,
      input: req.body,
      priority: 3, // Highest priority
      userId: req.user!.id,
    };

    const result = await agentCoordinator.executeTask(task);

    res.json(result);
  })
);

// Request predictive insights
router.post(
  '/oracle',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const task = {
      id: uuidv4(),
      type: 'oracle' as const,
      input: req.body,
      priority: 0,
      userId: req.user!.id,
    };

    const result = await agentCoordinator.executeTask(task);

    res.json(result);
  })
);

// Queue multiple tasks
router.post(
  '/batch',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { tasks } = req.body;

    const taskIds = tasks.map((t: any) => {
      const task = {
        id: uuidv4(),
        type: t.type,
        input: t.input,
        priority: t.priority || 1,
        userId: req.user!.id,
      };
      agentCoordinator.queueTask(task);
      return task.id;
    });

    res.json({
      message: 'Tasks queued successfully',
      taskIds,
    });
  })
);

// Generic trigger endpoint
router.post(
  '/trigger',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { agent, ...input } = req.body;

    const task = {
      id: uuidv4(),
      type: agent || 'codegen',
      input,
      priority: 1,
      userId: req.user!.id,
    };

    const result = await agentCoordinator.executeTask(task);

    res.json(result);
  })
);

// Get agent status
router.get(
  '/status',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    res.json({
      status: 'operational',
      agents: {
        codegen: 'active',
        sentinel: 'active',
        optimizer: 'active',
        securityguard: 'active',
        oracle: 'active',
      },
      queueLength: 0,
      activeAgents: 5,
      message: 'All agents operational',
    });
  })
);

export default router;

