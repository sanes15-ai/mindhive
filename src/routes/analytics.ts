import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../index';

const router = Router();

// Get user analytics
router.get(
  '/user',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const analytics = await prisma.userAnalytics.findUnique({
      where: { userId: req.user!.id },
    });

    // Get recent behaviors
    const behaviors = await prisma.userBehavior.findMany({
      where: { userId: req.user!.id },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Calculate stats
    const stats = {
      totalActions: behaviors.length,
      byType: {} as Record<string, number>,
      successRate: 0,
      avgTimeSpent: 0,
    };

    let totalTime = 0;
    let successCount = 0;

    for (const behavior of behaviors) {
      stats.byType[behavior.actionType] = (stats.byType[behavior.actionType] || 0) + 1;
      if (behavior.timeSpent) totalTime += behavior.timeSpent;
      if (behavior.outcome === 'SUCCESS') successCount++;
    }

    stats.successRate = behaviors.length > 0 ? successCount / behaviors.length : 0;
    stats.avgTimeSpent = behaviors.length > 0 ? totalTime / behaviors.length : 0;

    res.json({
      analytics,
      stats,
    });
  })
);

// Get team analytics
router.get(
  '/team/:teamId',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { teamId } = req.params;

    // Verify user is team member
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: req.user!.id,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const analytics = await prisma.teamAnalytics.findUnique({
      where: { teamId },
    });

    const knowledgeMaps = await prisma.knowledgeMap.findMany({
      where: { teamId },
      orderBy: { riskLevel: 'desc' },
    });

    res.json({
      analytics,
      knowledgeMaps,
    });
  })
);

// Get security scans
router.get(
  '/security',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { limit = 20, riskLevel } = req.query;

    const where: any = {
      userId: req.user!.id,
    };

    if (riskLevel) where.riskLevel = riskLevel;

    const scans = await prisma.securityScan.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const summary = {
      total: scans.length,
      byRisk: {} as Record<string, number>,
      autoFixAvailable: 0,
      fixedCount: 0,
    };

    for (const scan of scans) {
      summary.byRisk[scan.riskLevel] = (summary.byRisk[scan.riskLevel] || 0) + 1;
      if (scan.autoFixAvailable) summary.autoFixAvailable++;
      if (scan.fixApplied) summary.fixedCount++;
    }

    res.json({
      scans,
      summary,
    });
  })
);

// Get agent activity
router.get(
  '/agents',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { agentType, limit = 50 } = req.query;

    const where: any = {};
    if (agentType) where.agentType = agentType;

    const activities = await prisma.agentActivity.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const stats = {
      total: activities.length,
      byAgent: {} as Record<string, number>,
      successRate: 0,
      avgExecutionTime: 0,
    };

    let totalTime = 0;
    let successCount = 0;

    for (const activity of activities) {
      stats.byAgent[activity.agentType] = (stats.byAgent[activity.agentType] || 0) + 1;
      totalTime += activity.executionTime;
      if (activity.success) successCount++;
    }

    stats.successRate = activities.length > 0 ? successCount / activities.length : 0;
    stats.avgExecutionTime = activities.length > 0 ? totalTime / activities.length : 0;

    res.json({
      activities,
      stats,
    });
  })
);

// Get healing incidents
router.get(
  '/self-healing',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { status, limit = 20 } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const incidents = await prisma.healingIncident.findMany({
      where,
      take: Number(limit),
      orderBy: { detectedAt: 'desc' },
    });

    // Calculate summary
    const summary = {
      total: incidents.length,
      byStatus: {} as Record<string, number>,
      autoFixed: 0,
      avgResolutionTime: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const incident of incidents) {
      summary.byStatus[incident.status] = (summary.byStatus[incident.status] || 0) + 1;
      
      if (incident.status === 'VERIFIED' && incident.resolvedAt) {
        summary.autoFixed++;
        const resolutionTime = incident.resolvedAt.getTime() - incident.detectedAt.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    summary.avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    res.json({
      incidents,
      summary,
    });
  })
);

// Get productivity metrics
router.get(
  '/productivity',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const analytics = await prisma.userAnalytics.findUnique({
      where: { userId: req.user!.id },
    });

    // Get behaviors from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBehaviors = await prisma.userBehavior.findMany({
      where: {
        userId: req.user!.id,
        timestamp: { gte: thirtyDaysAgo },
      },
    });

    // Calculate trend
    const weeklyStats = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(thirtyDaysAgo);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekBehaviors = recentBehaviors.filter(
        (b) => b.timestamp >= weekStart && b.timestamp < weekEnd
      );

      weeklyStats.push({
        week: i + 1,
        actions: weekBehaviors.length,
        successRate:
          weekBehaviors.length > 0
            ? weekBehaviors.filter((b) => b.outcome === 'SUCCESS').length / weekBehaviors.length
            : 0,
      });
    }

    res.json({
      analytics,
      weeklyTrend: weeklyStats,
    });
  })
);

export default router;

