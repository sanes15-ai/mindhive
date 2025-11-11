import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AIOrchestrator } from '../services/ai/orchestrator';
import { NexusEngine } from '../services/nexus/engine';
import { userMemoryService } from '../services/memory/user-memory';
import { projectMemoryService } from '../services/memory/project-memory';
import { prisma } from '../index';

const router = Router();
const aiOrchestrator = new AIOrchestrator();
const nexusEngine = new NexusEngine();

// Initialize services
Promise.all([
  aiOrchestrator.initialize(),
  nexusEngine.initialize(),
]);

// Validation schemas
const generateSchema = z.object({
  description: z.string(),
  language: z.string(),
  framework: z.string().optional(),
  style: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'grok', 'ollama']).optional(),
  model: z.string().optional(),
  projectMemoryId: z.string().optional(),
});

const verifySchema = z.object({
  code: z.string(),
  language: z.string(),
  framework: z.string().optional(),
});

// Generate code
router.post(
  '/generate',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { description, language, framework, style, provider, model, projectMemoryId } = generateSchema.parse(req.body);

    // Load user preferences and project context from memory
    const [userPreferences, projectContext] = await Promise.all([
      userMemoryService.getUserPreferences(userId),
      projectMemoryId ? projectMemoryService.getProjectContext(projectMemoryId) : null,
    ]);

    // Build enhanced system message with memory context
    let systemContent = `You are an expert ${language} developer${framework ? ` specializing in ${framework}` : ''}. Generate production-ready code with:
- Complete implementation
- Error handling
- Type safety
- Documentation
- Best practices

${style ? `Follow this style: ${style}` : ''}`;

    // Add user preferences from memory
    if (userPreferences && userPreferences.languages.length > 0) {
      systemContent += `\n\nUser Preferences (Learned):
- Preferred Languages: ${userPreferences.languages.join(', ')}
- Preferred Frameworks: ${userPreferences.frameworks.join(', ')}
- Acceptance Rate: ${(userPreferences.acceptanceRate * 100).toFixed(0)}%
- Total Generations: ${userPreferences.totalGenerations}`;
    }

    // Add project context from memory
    if (projectContext) {
      systemContent += `\n\nProject Context:
- Project: ${projectContext.projectName}`;
      
      if (projectContext.conventions) {
        systemContent += `\n- Project Conventions: ${JSON.stringify(projectContext.conventions)}`;
      }
      
      if (projectContext.patterns && projectContext.patterns.length > 0) {
        systemContent += `\n- Common Patterns Used: ${projectContext.patterns.join(', ')}`;
      }
      
      if (projectContext.recentChat && projectContext.recentChat.length > 0) {
        const recentMessages = projectContext.recentChat.slice(0, 3);
        systemContent += `\n- Recent Context: ${recentMessages.map((m: any) => `${m.role}: ${m.content}`).join('; ')}`;
      }
    }

    const messages = [
      {
        role: 'system',
        content: systemContent,
      },
      {
        role: 'user',
        content: description,
      },
    ];

    // Generate code
    const response = await aiOrchestrator.chat(messages, {
      provider: provider as any,
      model,
    });

    // Verify with NEXUS
    const verification = await nexusEngine.verifySuggestion(response.content, {
      language,
      framework,
    });

    // Save generation to memory if project context provided
    let generationId: string | undefined;
    if (projectMemoryId) {
      const generation = await projectMemoryService.saveGeneration({
        userId,
        projectMemoryId,
        prompt: description,
        language,
        framework,
        generatedCode: response.content,
        context: {
          provider: response.provider,
          model: response.model,
          confidence: verification.confidence,
          isValid: verification.isValid,
          warnings: verification.warnings,
        },
      });
      generationId = generation.id;
    }

    // Track behavior
    await prisma.userBehavior.create({
      data: {
        userId: req.user!.id,
        actionType: 'CODE_GENERATION',
        context: { description, language, framework },
        metadata: { provider, model, generationId },
        outcome: verification.isValid ? 'SUCCESS' : 'WARNING',
      },
    });

    res.json({
      code: response.content,
      verification,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      generationId,
    });
  })
);

// Verify code
router.post(
  '/verify',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { code, language, framework } = verifySchema.parse(req.body);

    const verification = await nexusEngine.verifySuggestion(code, {
      language,
      framework,
    });

    res.json(verification);
  })
);

// Get code explanation
router.post(
  '/explain',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { code } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are a code explainer. Provide clear, concise explanations of code functionality.',
      },
      {
        role: 'user',
        content: `Explain this code:\n\n${code}`,
      },
    ];

    const response = await aiOrchestrator.chat(messages);

    res.json({
      explanation: response.content,
      model: response.model,
    });
  })
);

// Optimize code
router.post(
  '/optimize',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { code, language } = req.body;

    const messages = [
      {
        role: 'system',
        content: `You are a code optimization expert for ${language}. Improve code for performance, readability, and maintainability. Provide both optimized code and explanation.`,
      },
      {
        role: 'user',
        content: code,
      },
    ];

    const response = await aiOrchestrator.chat(messages);

    res.json({
      optimization: response.content,
      model: response.model,
    });
  })
);

// Fix code
router.post(
  '/fix',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { code, error, language } = req.body;

    const messages = [
      {
        role: 'system',
        content: `You are a debugging expert for ${language}. Fix the code and explain the issue.`,
      },
      {
        role: 'user',
        content: `Code:\n${code}\n\nError:\n${error}`,
      },
    ];

    const response = await aiOrchestrator.chat(messages);

    // Track fix
    await prisma.userBehavior.create({
      data: {
        userId: req.user!.id,
        actionType: 'ERROR_FIX',
        context: { error, language },
        outcome: 'SUCCESS',
      },
    });

    res.json({
      fix: response.content,
      model: response.model,
    });
  })
);

// Generate tests
router.post(
  '/tests',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { code, language, framework } = req.body;

    const messages = [
      {
        role: 'system',
        content: `Generate comprehensive unit tests for ${language}${framework ? ` using ${framework}` : ''}. Include edge cases and error scenarios.`,
      },
      {
        role: 'user',
        content: code,
      },
    ];

    const response = await aiOrchestrator.chat(messages);

    res.json({
      tests: response.content,
      model: response.model,
    });
  })
);

// Save code snippet as memory
router.post(
  '/memory',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { content, context, type, language, framework, tags } = req.body;

    // Generate embedding
    const embedding = await aiOrchestrator.generateEmbedding(content);

    const memory = await prisma.memory.create({
      data: {
        userId: req.user!.id,
        content,
        embedding,
        context,
        type,
        language,
        framework,
        tags,
      },
    });

    res.status(201).json(memory);
  })
);

// Search memories
router.post(
  '/memory/search',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    const { query, limit = 10 } = req.body;

    // In production, use Pinecone for vector search with embeddings
    // For now, simple keyword search
    const memories = await prisma.memory.findMany({
      where: {
        userId: req.user!.id,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: limit,
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    res.json(memories);
  })
);

// Store memory
router.post(
  '/memory',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { content, type, language, framework, tags, context } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    try {
      // Generate embedding for the memory
      let embedding: number[] = [];
      try {
        embedding = await aiOrchestrator.generateEmbedding(content);
      } catch (embeddingError) {
        console.warn('Embedding generation failed, using empty array:', embeddingError);
        // Continue without embedding if it fails
      }

      const memory = await prisma.memory.create({
        data: {
          userId: req.user!.id,
          content,
          type: type || 'CODE_SNIPPET',
          context: context || {},
          language,
          framework,
          tags: tags || [],
          embedding,
        },
      });

      res.status(201).json(memory);
    } catch (error: any) {
      console.error('Memory creation error:', error);
      res.status(500).json({ error: error.message || 'Failed to store memory' });
    }
  })
);

// GET /memory - Search memories
router.get(
  '/memory',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { query, type, language, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // In production, use vector similarity search with embeddings
    // For now, simple keyword search
    const whereClause: any = {
      userId: req.user!.id,
    };
    if (type) whereClause.type = type;
    if (language) whereClause.language = language;

    const memories = await prisma.memory.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      query,
      results: memories,
      count: memories.length,
    });
  })
);

export default router;

