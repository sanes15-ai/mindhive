import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Project Memory Service
 * Manages per-project context, chat history, and learning
 */
export class ProjectMemoryService {
  /**
   * Get or create project memory
   */
  async getOrCreateProject(userId: string, projectPath: string, projectName: string) {
    return await prisma.projectMemory.upsert({
      where: {
        userId_projectPath: {
          userId,
          projectPath,
        },
      },
      create: {
        userId,
        projectPath,
        projectName,
        indexedFiles: [],
        projectPatterns: [],
      },
      update: {
        lastAccessed: new Date(),
      },
      include: {
        chatMessages: {
          orderBy: { timestamp: 'desc' },
          take: 50, // Last 50 messages
        },
      },
    });
  }

  /**
   * Add chat message to project
   */
  async addChatMessage(
    projectMemoryId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ) {
    return await prisma.chatMessage.create({
      data: {
        projectMemoryId,
        role,
        content,
        metadata,
      },
    });
  }

  /**
   * Get full chat history for a project
   */
  async getChatHistory(projectMemoryId: string, limit = 100) {
    return await prisma.chatMessage.findMany({
      where: { projectMemoryId },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }

  /**
   * Save code generation to project
   */
  async saveGeneration(data: {
    userId: string;
    projectMemoryId?: string;
    prompt: string;
    language: string;
    framework?: string;
    generatedCode: string;
    explanation?: string;
    context?: any;
  }) {
    return await prisma.codeGeneration.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });
  }

  /**
   * Update generation with user feedback
   */
  async updateGenerationFeedback(
    generationId: string,
    feedback: {
      userAccepted?: boolean;
      userEdited?: boolean;
      userEditedCode?: string;
      userRating?: number;
      patternExtracted?: boolean;
      extractedPatterns?: string[];
    }
  ) {
    return await prisma.codeGeneration.update({
      where: { id: generationId },
      data: feedback,
    });
  }

  /**
   * Get project context for AI (relevant files, patterns, conventions)
   */
  async getProjectContext(projectMemoryId: string) {
    const project = await prisma.projectMemory.findUnique({
      where: { id: projectMemoryId },
      include: {
        chatMessages: {
          orderBy: { timestamp: 'desc' },
          take: 10, // Last 10 messages for context
        },
        generations: {
          where: {
            userAccepted: true, // Only successful generations
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!project) return null;

    return {
      projectName: project.projectName,
      indexedFiles: project.indexedFiles,
      conventions: project.conventions,
      patterns: project.projectPatterns,
      recentChat: project.chatMessages,
      successfulGenerations: project.generations,
    };
  }

  /**
   * Index files in the project
   */
  async indexProjectFiles(
    projectMemoryId: string,
    files: Array<{ path: string; summary: string; lastModified: Date }>
  ) {
    return await prisma.projectMemory.update({
      where: { id: projectMemoryId },
      data: {
        indexedFiles: files,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string) {
    return await prisma.projectMemory.findMany({
      where: { userId },
      orderBy: { lastAccessed: 'desc' },
      select: {
        id: true,
        projectName: true,
        projectPath: true,
        lastAccessed: true,
        _count: {
          select: {
            chatMessages: true,
            generations: true,
          },
        },
      },
    });
  }
}

export const projectMemoryService = new ProjectMemoryService();

