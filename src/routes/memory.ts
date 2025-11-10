import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { userMemoryService } from '../services/memory/user-memory';
import { projectMemoryService } from '../services/memory/project-memory';
import { patternExtractor } from '../services/learning/pattern-extractor';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

// All memory routes require authentication
router.use(authMiddleware);

// ============================================
// USER MEMORY ROUTES
// ============================================

/**
 * GET /api/v1/memory/profile
 * Get user's learned coding style and preferences
 */
router.get(
  '/profile',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;

    const [preferences, insights] = await Promise.all([
      userMemoryService.getUserPreferences(userId),
      userMemoryService.getCodingStyleInsights(userId),
    ]);

    res.json({
      preferences,
      insights,
    });
  })
);

// ============================================
// PROJECT MEMORY ROUTES
// ============================================

/**
 * GET /api/v1/memory/projects
 * Get all projects for the user
 */
router.get(
  '/projects',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const projects = await projectMemoryService.getUserProjects(userId);

    res.json({
      projects,
      total: projects.length,
    });
  })
);

/**
 * POST /api/v1/memory/projects
 * Create or get existing project memory
 */
const createProjectSchema = z.object({
  projectPath: z.string(),
  projectName: z.string(),
});

router.post(
  '/projects',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { projectPath, projectName } = createProjectSchema.parse(req.body);

    const project = await projectMemoryService.getOrCreateProject(
      userId,
      projectPath,
      projectName
    );

    res.json(project);
  })
);

/**
 * GET /api/v1/memory/projects/:id
 * Get project context (files, patterns, conventions)
 */
router.get(
  '/projects/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const context = await projectMemoryService.getProjectContext(id);

    if (!context) {
      throw new AppError(404, 'Project not found');
    }

    res.json(context);
  })
);

// ============================================
// CHAT HISTORY ROUTES
// ============================================

/**
 * GET /api/v1/memory/chat/:projectId
 * Get chat history for a project
 */
router.get(
  '/chat/:projectId',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const messages = await projectMemoryService.getChatHistory(projectId, limit);

    res.json({
      messages,
      total: messages.length,
    });
  })
);

/**
 * POST /api/v1/memory/chat
 * Add a message to chat history
 */
const chatMessageSchema = z.object({
  projectMemoryId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.any().optional(),
});

router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const data = chatMessageSchema.parse(req.body);
    const message = await projectMemoryService.addChatMessage(
      data.projectMemoryId,
      data.role,
      data.content,
      data.metadata
    );

    res.json(message);
  })
);

// ============================================
// CODE GENERATION ROUTES
// ============================================

/**
 * POST /api/v1/memory/generations
 * Save a code generation
 */
const saveGenerationSchema = z.object({
  projectMemoryId: z.string().optional(),
  prompt: z.string(),
  language: z.string(),
  framework: z.string().optional(),
  generatedCode: z.string(),
  explanation: z.string().optional(),
  context: z.any().optional(),
});

router.post(
  '/generations',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const data = saveGenerationSchema.parse(req.body);

    const generation = await projectMemoryService.saveGeneration({
      userId,
      projectMemoryId: data.projectMemoryId,
      prompt: data.prompt,
      language: data.language,
      framework: data.framework,
      generatedCode: data.generatedCode,
      explanation: data.explanation,
      context: data.context,
    });

    res.json(generation);
  })
);

/**
 * PATCH /api/v1/memory/generations/:id/feedback
 * Update generation with user feedback
 */
const feedbackSchema = z.object({
  userAccepted: z.boolean().optional(),
  userEdited: z.boolean().optional(),
  userEditedCode: z.string().optional(),
  userRating: z.number().min(1).max(5).optional(),
});

router.patch(
  '/generations/:id/feedback',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const feedback = feedbackSchema.parse(req.body);

    // Update generation
    const generation = await projectMemoryService.updateGenerationFeedback(id, feedback);

    // Extract patterns from accepted code
    let extractedPatterns: string[] = [];
    if (feedback.userAccepted && generation.generatedCode) {
      try {
        const patterns = await patternExtractor.extractPatterns(
          generation.generatedCode,
          generation.language,
          generation.framework || undefined
        );
        
        // Convert patterns to string array for storage
        extractedPatterns = [
          ...patterns.architecturePatterns,
          `naming:${patterns.namingConventions.variables}`,
          `quotes:${patterns.codeStyle.quotesStyle}`,
        ];

        if (patterns.generalPatterns.usesArrowFunctions) {
          extractedPatterns.push('arrow-functions');
        }
        if (patterns.generalPatterns.usesAsyncAwait) {
          extractedPatterns.push('async-await');
        }
        if (patterns.generalPatterns.usesDestructuring) {
          extractedPatterns.push('destructuring');
        }
        if (patterns.codeStyle.semicolons) {
          extractedPatterns.push('semicolons');
        }

        // Store full patterns in generation
        await projectMemoryService.updateGenerationFeedback(id, {
          patternExtracted: true,
          extractedPatterns,
        });
      } catch (error) {
        console.error('Pattern extraction failed:', error);
      }
    }

    // Learn from feedback
    if (feedback.userAccepted !== undefined || feedback.userEdited !== undefined) {
      await userMemoryService.learnFromGeneration(userId, {
        language: generation.language,
        framework: generation.framework || undefined,
        accepted: feedback.userAccepted || false,
        edited: feedback.userEdited || false,
        patterns: extractedPatterns,
      });
    }

    res.json(generation);
  })
);

/**
 * GET /api/v1/memory/generations/:projectId
 * Get all generations for a project
 */
router.get(
  '/generations/:projectId',
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // This would need a new method in projectMemoryService
    // For now, return empty array
    res.json({
      generations: [],
      total: 0,
    });
  })
);

// ============================================
// PROJECT FILE INDEXING
// ============================================

/**
 * POST /api/v1/memory/projects/:id/index
 * Index files in a project
 */
const indexFilesSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      summary: z.string(),
      lastModified: z.string(),
    })
  ),
});

router.post(
  '/projects/:id/index',
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { files } = indexFilesSchema.parse(req.body);

    // Transform the string dates to Date objects
    const filesWithDates = files.map(f => ({
      path: f.path,
      summary: f.summary,
      lastModified: new Date(f.lastModified)
    }));

    await projectMemoryService.indexProjectFiles(id, filesWithDates);

    res.json({
      success: true,
      filesIndexed: files.length,
    });
  })
);

export default router;

