import { Router } from 'express';
import { authMiddleware, AuthRequest, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../index';

const router = Router();

// Get global patterns
router.get(
  '/global-patterns',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { intent, language, framework, category, limit = 20, offset = 0 } = req.query;

    const where: any = {
      isDeprecated: false,
    };

    if (language) where.language = language;
    if (framework) where.framework = framework;
    if (category) where.category = category;

    const patterns = await prisma.globalPattern.findMany({
      where,
      take: Number(limit),
      skip: Number(offset),
      orderBy: {
        confidenceScore: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        language: true,
        framework: true,
        category: true,
        tags: true,
        usageCount: true,
        successRate: true,
        confidenceScore: true,
        createdAt: true,
      },
    });

    res.json({ patterns, total: patterns.length });
  })
);

// Get pattern by ID
router.get(
  '/global-patterns/:id',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { id } = req.params;

    const pattern = await prisma.globalPattern.findUnique({
      where: { id },
      include: {
        verifications: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        usageMetrics: {
          take: 100,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    res.json(pattern);
  })
);

// Predict success
router.post(
  '/predict-success',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { code, language, framework, context } = req.body;

    // Find similar patterns
    const similarPatterns = await prisma.globalPattern.findMany({
      where: {
        language,
        framework,
      },
      take: 10,
      orderBy: {
        usageCount: 'desc',
      },
    });

    // Calculate success probability based on similar patterns
    const avgSuccessRate =
      similarPatterns.reduce((sum, p) => sum + p.successRate, 0) /
      (similarPatterns.length || 1);

    res.json({
      probability: avgSuccessRate,
      confidence: similarPatterns.length >= 5 ? 0.9 : 0.6,
      similarPatterns: similarPatterns.length,
      recommendation: avgSuccessRate > 0.8 ? 'PROCEED' : 'REVIEW_NEEDED',
    });
  })
);

// Get best practices
router.get(
  '/best-practices',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { language, framework } = req.query;

    const patterns = await prisma.globalPattern.findMany({
      where: {
        language: language as string,
        framework: framework as string,
        successRate: { gte: 0.9 },
        usageCount: { gte: 100 },
      },
      take: 20,
      orderBy: [{ successRate: 'desc' }, { usageCount: 'desc' }],
    });

    res.json({ practices: patterns });
  })
);

// Get trending intelligence
router.get(
  '/trending',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const intelligence = await prisma.collectiveIntelligence.findMany({
      where: {
        trendingScore: { gte: 0.7 },
      },
      take: 50,
      orderBy: {
        trendingScore: 'desc',
      },
    });

    res.json({ trending: intelligence });
  })
);

// Get deprecation feed
router.get(
  '/deprecations',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const deprecations = await prisma.globalPattern.findMany({
      where: {
        isDeprecated: true,
      },
      select: {
        name: true,
        deprecationReason: true,
        alternativeId: true,
        language: true,
        framework: true,
      },
      take: 50,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({ deprecations });
  })
);

// Submit pattern verification
router.post(
  '/verify-pattern/:patternId',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { patternId } = req.params;
    const { outcome, notes, context } = req.body;

    const verification = await prisma.patternVerification.create({
      data: {
        patternId,
        verifiedBy: req.user!.id,
        outcome,
        notes,
        context,
      },
    });

    // Update pattern verification count
    await prisma.globalPattern.update({
      where: { id: patternId },
      data: {
        verificationCount: { increment: 1 },
        upvotes: outcome === 'SUCCESS' ? { increment: 1 } : undefined,
        downvotes: outcome === 'FAILURE' ? { increment: 1 } : undefined,
      },
    });

    res.status(201).json(verification);
  })
);

// Get collective insights
router.get(
  '/insights',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { topic, language, framework } = req.query;

    const where: any = {};
    if (topic) where.topic = { contains: topic as string, mode: 'insensitive' };
    if (language) where.language = language;
    if (framework) where.framework = framework;

    const insights = await prisma.collectiveIntelligence.findMany({
      where,
      take: 10,
      orderBy: {
        avgConfidence: 'desc',
      },
    });

    res.json({ insights });
  })
);

// Browse patterns (alias for global-patterns)
router.get(
  '/patterns',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { language, framework, category, limit = 20, offset = 0 } = req.query;

    const where: any = {
      isDeprecated: false,
    };

    if (language) where.language = language;
    if (framework) where.framework = framework;
    if (category) where.category = category;

    const patterns = await prisma.globalPattern.findMany({
      where,
      take: Number(limit),
      skip: Number(offset),
      orderBy: {
        confidenceScore: 'desc',
      },
    });

    res.json({ patterns, total: patterns.length });
  })
);

// Predict success
router.post(
  '/predict',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { code, language, framework } = req.body;

    // Find similar patterns
    const patterns = await prisma.globalPattern.findMany({
      where: {
        language,
        framework,
        isDeprecated: false,
      },
      orderBy: {
        successRate: 'desc',
      },
      take: 10,
    });

    if (patterns.length === 0) {
      return res.json({
        prediction: 'UNKNOWN',
        confidence: 0.5,
        message: 'No similar patterns found',
        recommendation: 'PROCEED_WITH_CAUTION',
      });
    }

    // Calculate average success rate
    const avgSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
    const confidence = Math.min(avgSuccessRate, 0.95);

    let prediction = 'UNKNOWN';
    let recommendation = 'REVIEW';

    if (confidence >= 0.9) {
      prediction = 'SUCCESS';
      recommendation = 'PROCEED';
    } else if (confidence >= 0.7) {
      prediction = 'LIKELY_SUCCESS';
      recommendation = 'PROCEED_WITH_CAUTION';
    } else if (confidence >= 0.5) {
      prediction = 'UNCERTAIN';
      recommendation = 'REVIEW';
    } else {
      prediction = 'LIKELY_FAILURE';
      recommendation = 'DO_NOT_PROCEED';
    }

    res.json({
      prediction,
      confidence,
      recommendation,
      similarPatterns: patterns.length,
      avgSuccessRate,
      analysis: `Based on ${patterns.length} similar patterns with ${(avgSuccessRate * 100).toFixed(1)}% success rate`,
    });
  })
);

export default router;

