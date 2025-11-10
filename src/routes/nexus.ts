/**
 * NEXUS API Routes
 * Endpoints for anti-hallucination code generation
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { nexusConsensus } from '../services/nexus/consensus';
import { nexusValidator } from '../services/nexus/validator';
import { projectMemoryService } from '../services/memory/project-memory';
import { userMemoryService } from '../services/memory/user-memory';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// ============================================
// NEXUS CODE GENERATION
// ============================================

/**
 * POST /api/v1/nexus/generate
 * Generate code with multi-model consensus
 */
const generateSchema = z.object({
  prompt: z.string().min(10),
  language: z.string(),
  framework: z.string().optional(),
  projectMemoryId: z.string().optional(),
  context: z.any().optional(),
});

router.post(
  '/generate',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const data = generateSchema.parse(req.body);

    // Load user preferences and project context
    const [userPreferences, projectContext] = await Promise.all([
      userMemoryService.getUserPreferences(userId),
      data.projectMemoryId
        ? projectMemoryService.getProjectContext(data.projectMemoryId)
        : null,
    ]);

    // Build enhanced prompt with memory context
    const enhancedPrompt = `
User Preferences:
- Preferred Languages: ${userPreferences?.languages?.join(', ') || 'None set'}
- Preferred Frameworks: ${userPreferences?.frameworks?.join(', ') || 'None set'}
- Acceptance Rate: ${userPreferences?.acceptanceRate || 0}

${projectContext ? `Project Context:\n- Project: ${projectContext.projectName}\n- Conventions: ${JSON.stringify(projectContext.conventions)}` : ''}

User Request:
${data.prompt}
`;

    // Generate with consensus
    const consensusResult = await nexusConsensus.generateWithConsensus(
      enhancedPrompt,
      data.language,
      {
        framework: data.framework,
        userPreferences,
        projectContext,
        ...data.context,
      }
    );

    // Extract code from response
    const codeMatch = consensusResult.finalResponse.match(/```[\w]*\n([\s\S]*?)```/);
    const generatedCode = codeMatch ? codeMatch[1].trim() : consensusResult.finalResponse;

    // Validate the generated code
    const validationResult = await nexusValidator.validateCode(
      generatedCode,
      data.language
    );

    // Auto-fix if there are issues
    let finalCode = generatedCode;
    if (!validationResult.isValid && validationResult.fixedCode) {
      finalCode = validationResult.fixedCode;
    } else if (!validationResult.isValid) {
      // If validation fails and no auto-fix, try to fix manually
      finalCode = await nexusValidator.autoFix(generatedCode, data.language);
    }

    // Save generation to memory
    let savedGeneration = null;
    if (data.projectMemoryId) {
      savedGeneration = await projectMemoryService.saveGeneration({
        userId,
        projectMemoryId: data.projectMemoryId,
        prompt: data.prompt,
        language: data.language,
        framework: data.framework,
        generatedCode: finalCode,
        explanation: consensusResult.explanation,
        context: {
          consensus: consensusResult,
          validation: validationResult,
        },
      });
    }

    res.json({
      success: true,
      code: finalCode,
      consensus: {
        confidence: consensusResult.confidence,
        agreement: consensusResult.agreement,
        decision: consensusResult.decision,
        explanation: consensusResult.explanation,
        models: consensusResult.modelResponses.map((r) => ({
          provider: r.provider,
          model: r.model,
          confidence: r.confidence,
          latency: r.latency,
        })),
      },
      validation: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        wasAutoFixed: !!validationResult.fixedCode,
      },
      generationId: savedGeneration?.id,
    });
  })
);

/**
 * POST /api/v1/nexus/validate
 * Validate code without generation
 */
const validateSchema = z.object({
  code: z.string(),
  language: z.string(),
});

router.post(
  '/validate',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = validateSchema.parse(req.body);

    const validationResult = await nexusValidator.validateCode(
      data.code,
      data.language
    );

    // Try auto-fix if invalid
    let fixedCode = null;
    if (!validationResult.isValid) {
      fixedCode = await nexusValidator.autoFix(data.code, data.language);
    }

    res.json({
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      fixedCode: fixedCode || validationResult.fixedCode,
    });
  })
);

/**
 * GET /api/v1/nexus/statistics
 * Get NEXUS consensus statistics
 */
router.get(
  '/statistics',
  asyncHandler(async (req: AuthRequest, res) => {
    const stats = await nexusConsensus.getStatistics();

    res.json({
      statistics: stats,
    });
  })
);

/**
 * POST /api/v1/nexus/configure
 * Configure NEXUS settings (admin only)
 */
const configureSchema = z.object({
  similarityThreshold: z.number().min(0).max(1).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
});

router.post(
  '/configure',
  asyncHandler(async (req: AuthRequest, res) => {
    const data = configureSchema.parse(req.body);

    if (data.similarityThreshold !== undefined) {
      nexusConsensus.setSimilarityThreshold(data.similarityThreshold);
    }

    res.json({
      success: true,
      message: 'NEXUS configuration updated',
    });
  })
);

export default router;

