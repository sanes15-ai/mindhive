import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * User Memory Service
 * Manages cross-project user memory and learning
 */
export class UserMemoryService {
  /**
   * Initialize user memory profile on first use
   */
  async initializeUserMemory(userId: string) {
    return await prisma.userMemoryProfile.upsert({
      where: { userId },
      create: {
        userId,
        preferredLanguages: [],
        preferredFrameworks: [],
        totalGenerations: 0,
        acceptanceRate: 0,
        editRate: 0,
        learningVelocity: 0,
      },
      update: {},
    });
  }

  /**
   * Learn from user's code generation
   */
  async learnFromGeneration(
    userId: string,
    generation: {
      language: string;
      framework?: string;
      accepted: boolean;
      edited: boolean;
      patterns: string[];
    }
  ) {
    const profile = await prisma.userMemoryProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      await this.initializeUserMemory(userId);
      return;
    }

    // Update language preferences
    const languages = new Set(profile.preferredLanguages);
    languages.add(generation.language);

    // Update framework preferences
    const frameworks = new Set(profile.preferredFrameworks);
    if (generation.framework) {
      frameworks.add(generation.framework);
    }

    // Calculate new acceptance rate
    const totalGens = profile.totalGenerations + 1;
    const acceptedCount = profile.acceptanceRate * profile.totalGenerations + (generation.accepted ? 1 : 0);
    const newAcceptanceRate = acceptedCount / totalGens;

    // Calculate edit rate
    const editedCount = profile.editRate * profile.totalGenerations + (generation.edited ? 1 : 0);
    const newEditRate = editedCount / totalGens;

    await prisma.userMemoryProfile.update({
      where: { userId },
      data: {
        preferredLanguages: Array.from(languages),
        preferredFrameworks: Array.from(frameworks),
        totalGenerations: totalGens,
        acceptanceRate: newAcceptanceRate,
        editRate: newEditRate,
        lastLearningUpdate: new Date(),
      },
    });
  }

  /**
   * Get user's learned preferences
   */
  async getUserPreferences(userId: string) {
    const profile = await prisma.userMemoryProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return null;
    }

    return {
      languages: profile.preferredLanguages,
      frameworks: profile.preferredFrameworks,
      acceptanceRate: profile.acceptanceRate,
      editRate: profile.editRate,
      totalGenerations: profile.totalGenerations,
    };
  }

  /**
   * Get AI-generated insights about user's coding style
   */
  async getCodingStyleInsights(userId: string) {
    const profile = await prisma.userMemoryProfile.findUnique({
      where: { userId },
    });

    if (!profile || profile.totalGenerations < 5) {
      return {
        ready: false,
        message: 'Need at least 5 generations to learn your style',
      };
    }

    return {
      ready: true,
      insights: {
        primaryLanguages: profile.preferredLanguages.slice(0, 3),
        primaryFrameworks: profile.preferredFrameworks.slice(0, 3),
        acceptanceRate: `${(profile.acceptanceRate * 100).toFixed(1)}%`,
        editRate: `${(profile.editRate * 100).toFixed(1)}%`,
        learningStatus:
          profile.acceptanceRate > 0.8
            ? 'Excellent! AI knows your style well'
            : profile.acceptanceRate > 0.6
            ? 'Good! AI is learning your preferences'
            : 'Still learning your style',
      },
    };
  }
}

export const userMemoryService = new UserMemoryService();

