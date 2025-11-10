/**
 * Time-Travel Debugging API Routes
 */

import { Router, Request, Response } from 'express';
import { TimeTravelDebugger } from '../services/debugging/timeTravelDebugger';
import { ErrorLog } from '../services/debugging/errorPatternExtractor';
import { authMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const timeTravelDebugger = new TimeTravelDebugger();
const prisma = new PrismaClient();

/**
 * POST /api/v1/debug/analyze
 * Analyze an error and get time-travel debugging insights
 */
router.post('/analyze', authMiddleware, async (req: Request, res: Response) => {
  try {
    const errorLog: ErrorLog = {
      errorMessage: req.body.errorMessage,
      stackTrace: req.body.stackTrace,
      errorType: req.body.errorType,
      filePath: req.body.filePath,
      lineNumber: req.body.lineNumber,
      codeSnippet: req.body.codeSnippet,
      environment: req.body.environment,
      language: req.body.language,
      framework: req.body.framework,
    };

    // Validate required fields
    if (!errorLog.errorMessage || !errorLog.stackTrace) {
      return res.status(400).json({
        success: false,
        error: 'errorMessage and stackTrace are required',
      });
    }

    // Analyze error
    const userId = (req as any).user?.id;
    const result = await timeTravelDebugger.analyzeError(errorLog, userId);

    res.json({
      success: true,
      data: result,
      message: `Found ${result.recommendedFixes.length} potential fix${result.recommendedFixes.length !== 1 ? 'es' : ''}`,
    });
  } catch (error: any) {
    console.error('Error analyzing debug request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze error',
      details: error.message,
    });
  }
});

/**
 * POST /api/v1/debug/apply-fix
 * Apply a recommended fix
 */
router.post('/apply-fix', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { fixId, testMode = false } = req.body;

    if (!fixId) {
      return res.status(400).json({
        success: false,
        error: 'fixId is required',
      });
    }

    const userId = (req as any).user?.id;
    const result = await timeTravelDebugger.applyFix(fixId, userId, testMode);

    res.json({
      success: result.success,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error applying fix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply fix',
      details: error.message,
    });
  }
});

/**
 * POST /api/v1/debug/verify-fix
 * Report whether a fix worked or not
 */
router.post('/verify-fix', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { fixId, occurrenceId, success, timeToFix } = req.body;

    if (!fixId || !occurrenceId || success === undefined) {
      return res.status(400).json({
        success: false,
        error: 'fixId, occurrenceId, and success are required',
      });
    }

    await timeTravelDebugger.reportFixResult(fixId, occurrenceId, success, timeToFix);

    res.json({
      success: true,
      message: 'Fix result reported successfully',
    });
  } catch (error: any) {
    console.error('Error reporting fix result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report fix result',
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/debug/history
 * Get user's debugging history
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get user's error occurrences
    const occurrences = await prisma.errorOccurrence.findMany({
      where: { userId },
      include: {
        pattern: true,
        resolution: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    // Format for response
    const history = occurrences.map((occ) => ({
      id: occ.id,
      errorType: occ.pattern.errorType,
      errorMessage: occ.pattern.errorMessage,
      category: occ.pattern.category,
      severity: occ.pattern.severity,
      resolved: occ.resolved,
      timeToResolve: occ.timeToResolve,
      timestamp: occ.timestamp,
      resolution: occ.resolution
        ? {
            id: occ.resolution.id,
            fixType: occ.resolution.fixType,
            description: occ.resolution.fixDescription,
            successRate: occ.resolution.successRate,
          }
        : null,
    }));

    // Get total count for pagination
    const totalCount = await prisma.errorOccurrence.count({
      where: { userId },
    });

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching debug history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug history',
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/debug/patterns
 * Browse error patterns from global database
 */
router.get('/patterns', authMiddleware, async (req: Request, res: Response) => {
  try {
    const language = req.query.language as string;
    const category = req.query.category as string;
    const minOccurrences = parseInt(req.query.minOccurrences as string) || 5;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Build query
    const where: any = {
      occurrenceCount: { gte: minOccurrences },
    };

    if (language) where.language = language;
    if (category) where.category = category;

    // Get patterns
    const patterns = await prisma.errorPattern.findMany({
      where,
      include: {
        _count: {
          select: {
            resolutions: true,
          },
        },
      },
      orderBy: [{ occurrenceCount: 'desc' }, { successRate: 'desc' }],
      take: limit,
      skip: offset,
    });

    // Format for response
    const formattedPatterns = patterns.map((pattern) => ({
      id: pattern.id,
      errorType: pattern.errorType,
      errorMessage: pattern.errorMessage.substring(0, 200),
      category: pattern.category,
      severity: pattern.severity,
      language: pattern.language,
      framework: pattern.framework,
      occurrenceCount: pattern.occurrenceCount,
      resolutionCount: pattern.resolutionCount,
      successRate: pattern.successRate,
      avgTimeToFix: pattern.avgTimeToFix,
      availableFixes: pattern._count.resolutions,
      tags: pattern.tags,
    }));

    // Get total count for pagination
    const totalCount = await prisma.errorPattern.count({ where });

    res.json({
      success: true,
      data: {
        patterns: formattedPatterns,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching error patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error patterns',
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/debug/patterns/:id
 * Get details of a specific error pattern
 */
router.get('/patterns/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pattern = await prisma.errorPattern.findUnique({
      where: { id },
      include: {
        resolutions: {
          orderBy: { confidenceScore: 'desc' },
        },
        _count: {
          select: {
            occurrences: true,
            resolutions: true,
          },
        },
      },
    });

    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Pattern not found',
      });
    }

    res.json({
      success: true,
      data: {
        pattern: {
          id: pattern.id,
          errorType: pattern.errorType,
          errorMessage: pattern.errorMessage,
          normalizedStack: pattern.normalizedStack,
          category: pattern.category,
          severity: pattern.severity,
          language: pattern.language,
          framework: pattern.framework,
          occurrenceCount: pattern.occurrenceCount,
          resolutionCount: pattern.resolutionCount,
          successRate: pattern.successRate,
          avgTimeToFix: pattern.avgTimeToFix,
          firstSeen: pattern.firstSeen,
          lastSeen: pattern.lastSeen,
          tags: pattern.tags,
        },
        resolutions: pattern.resolutions.map((res) => ({
          id: res.id,
          fixType: res.fixType,
          description: res.fixDescription,
          explanation: res.explanation,
          codeChanges: res.codeChanges,
          successRate: res.successRate,
          confidenceScore: res.confidenceScore,
          appliedCount: res.appliedCount,
          verifiedBy: res.verifiedBy,
          source: res.source,
        })),
        stats: {
          totalOccurrences: pattern._count.occurrences,
          totalResolutions: pattern._count.resolutions,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching pattern details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pattern details',
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/debug/stats
 * Get global debugging statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalPatterns,
      totalOccurrences,
      totalResolutions,
      avgSuccessRate,
      topCategories,
    ] = await Promise.all([
      prisma.errorPattern.count(),
      prisma.errorOccurrence.count(),
      prisma.errorResolution.count(),
      prisma.errorPattern.aggregate({
        _avg: { successRate: true },
      }),
      prisma.errorPattern.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalPatterns,
        totalOccurrences,
        totalResolutions,
        avgSuccessRate: avgSuccessRate._avg.successRate || 0,
        topCategories: topCategories.map((cat) => ({
          category: cat.category,
          count: cat._count.category,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching debug stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug stats',
      details: error.message,
    });
  }
});

export default router;
