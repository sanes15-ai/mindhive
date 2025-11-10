import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const UIEventSchema = z.object({
  platform: z.enum(['VSCODE', 'WEB_DASHBOARD', 'CHROME_EXTENSION']).optional().default('WEB_DASHBOARD'),
  eventType: z.string().min(1),
  eventData: z.record(z.any()).optional().default({}),
  url: z.string().optional(),
  sessionId: z.string().optional(),
});

// POST /api/v1/ui/events - Log UI event
router.post('/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = UIEventSchema.parse(req.body);
    const userId = (req as any).user.id;

    // Get or create session
    let sessionId = data.sessionId;
    if (!sessionId) {
      // Create new session
      const session = await prisma.uISession.create({
        data: {
          userId,
          sessionId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          platform: data.platform || 'WEB_DASHBOARD',
          metadata: {},
        },
      });
      sessionId = session.sessionId;
    }

    // Log event
    const event = await prisma.uIEvent.create({
      data: {
        sessionId,
        eventType: data.eventType,
        eventData: data.eventData || {},
        url: data.url,
      },
    });

    res.json({ success: true, event, sessionId });
  } catch (error: any) {
    console.error('UI event logging error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/ui/sessions - Get user sessions
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { platform, limit = '10' } = req.query;

    const sessions = await prisma.uISession.findMany({
      where: {
        userId,
        ...(platform && { platform: platform as any }),
      },
      include: {
        events: {
          take: 5,
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ sessions });
  } catch (error: any) {
    console.error('Session fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/ui/analytics - Get UI analytics
router.get('/analytics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { days = '30' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Session count by platform
    const sessionsByPlatform = await prisma.uISession.groupBy({
      by: ['platform'],
      where: {
        userId,
        startedAt: { gte: daysAgo },
      },
      _count: true,
    });

    // Event count by type
    const eventsByType = await prisma.uIEvent.groupBy({
      by: ['eventType'],
      where: {
        session: { userId },
        timestamp: { gte: daysAgo },
      },
      _count: true,
    });

    // Total session time
    const sessions = await prisma.uISession.findMany({
      where: {
        userId,
        startedAt: { gte: daysAgo },
        endedAt: { not: null },
      },
      select: {
        startedAt: true,
        endedAt: true,
      },
    });

    const totalSessionTime = sessions.reduce((sum, session) => {
      if (session.endedAt) {
        return sum + (session.endedAt.getTime() - session.startedAt.getTime());
      }
      return sum;
    }, 0);

    res.json({
      sessionsByPlatform,
      eventsByType,
      totalSessionTime: Math.round(totalSessionTime / 1000 / 60), // minutes
      totalSessions: sessions.length,
      totalEvents: eventsByType.reduce((sum, e) => sum + e._count, 0),
    });
  } catch (error: any) {
    console.error('UI analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/ui/sessions/:sessionId/end - End session
router.post('/sessions/:sessionId/end', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user.id;

    const session = await prisma.uISession.updateMany({
      where: {
        sessionId,
        userId,
      },
      data: {
        endedAt: new Date(),
      },
    });

    res.json({ success: true, session });
  } catch (error: any) {
    console.error('Session end error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

