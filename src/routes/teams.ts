import { Router } from 'express';
import { authMiddleware, AuthRequest, requireTier } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../index';
import { z } from 'zod';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

// Create team
router.post(
  '/',
  authMiddleware,
  requireTier('TEAM', 'ENTERPRISE'),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { name, slug, description } = createTeamSchema.parse(req.body);

    // Check slug availability
    const existing = await prisma.team.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError(400, 'Team slug already taken');
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        slug,
        description,
        plan: req.user!.tier as any,
        members: {
          create: {
            userId: req.user!.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Create team analytics
    await prisma.teamAnalytics.create({
      data: { teamId: team.id },
    });

    res.status(201).json(team);
  })
);

// Get user's teams
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: req.user!.id },
      include: {
        team: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    res.json({
      teams: memberships.map((m) => ({
        ...m.team,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  })
);

// Get team details
router.get(
  '/:teamId',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { teamId } = req.params;

    // Verify membership
    const membership = await prisma.teamMember.findFirst({
      where: { teamId, userId: req.user!.id },
    });

    if (!membership) {
      throw new AppError(403, 'Not a team member');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        analytics: true,
      },
    });

    res.json(team);
  })
);

// Invite member
router.post(
  '/:teamId/members',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { teamId } = req.params;
    const { email, role = 'MEMBER' } = req.body;

    // Verify admin access
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: req.user!.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      throw new AppError(403, 'Insufficient permissions');
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Check if already member
    const existing = await prisma.teamMember.findFirst({
      where: { teamId, userId: user.id },
    });

    if (existing) {
      throw new AppError(400, 'User is already a team member');
    }

    // Add member
    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(newMember);
  })
);

// Remove member
router.delete(
  '/:teamId/members/:userId',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { teamId, userId } = req.params;

    // Verify admin access
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: req.user!.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      throw new AppError(403, 'Insufficient permissions');
    }

    // Cannot remove owner
    const targetMember = await prisma.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (targetMember?.role === 'OWNER') {
      throw new AppError(400, 'Cannot remove team owner');
    }

    await prisma.teamMember.delete({
      where: {
        id: targetMember!.id,
      },
    });

    res.json({ message: 'Member removed successfully' });
  })
);

// Get knowledge map
router.get(
  '/:teamId/knowledge-map',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { teamId } = req.params;

    // Verify membership
    const membership = await prisma.teamMember.findFirst({
      where: { teamId, userId: req.user!.id },
    });

    if (!membership) {
      throw new AppError(403, 'Not a team member');
    }

    const knowledgeMap = await prisma.knowledgeMap.findMany({
      where: { teamId },
      orderBy: { riskLevel: 'desc' },
    });

    res.json({ knowledgeMap });
  })
);

// Update knowledge map
router.post(
  '/:teamId/knowledge-map',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { teamId } = req.params;
    const { domain, expertise, riskLevel, documentation, owners } = req.body;

    // Verify admin access
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: req.user!.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      throw new AppError(403, 'Insufficient permissions');
    }

    const knowledgeEntry = await prisma.knowledgeMap.create({
      data: {
        teamId,
        domain,
        expertise,
        riskLevel,
        documentation,
        owners,
      },
    });

    res.status(201).json(knowledgeEntry);
  })
);

export default router;

