import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  enableLearning: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name, enableLearning } = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(400, 'User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        tier: 'FREE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        createdAt: true,
      },
    });

    // Create analytics profile
    await prisma.userAnalytics.create({
      data: { userId: user.id },
    });

    // Create preferences with learning consent
    await prisma.userPreferences.create({
      data: { 
        userId: user.id,
        enableLearning: enableLearning ?? true,
        learningConsentDate: enableLearning !== false ? new Date() : null,
      },
    });

    // Initialize user memory profile if learning is enabled
    if (enableLearning !== false) {
      await prisma.userMemoryProfile.create({
        data: { userId: user.id },
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user,
      token,
    });
  })
);

// Login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
      token,
    });
  })
);

// Get current user
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: any, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        createdAt: true,
        lastActiveAt: true,
        preferences: true,
        analytics: true,
      },
    });

    res.json(user);
  })
);

// Update preferences
router.patch(
  '/preferences',
  authMiddleware,
  asyncHandler(async (req: any, res) => {
    const preferences = await prisma.userPreferences.update({
      where: { userId: req.user.id },
      data: req.body,
    });

    res.json(preferences);
  })
);

export default router;

