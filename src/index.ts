import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import routes from './routes';
import { WebSocketManager } from './services/websocket';
import { QueueManager } from './services/queue';
import { AIOrchestrator } from './services/ai/orchestrator';
import { AgentCoordinator } from './agents/coordinator';
import { NexusEngine } from './services/nexus/engine';

dotenv.config();

// Initialize Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

class MindHiveServer {
  public app: Application;
  public httpServer;
  public io: SocketIOServer;
  private wsManager: WebSocketManager;
  private queueManager: QueueManager;
  private aiOrchestrator: AIOrchestrator;
  private agentCoordinator: AgentCoordinator;
  private nexusEngine: NexusEngine;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
      },
    });

    this.wsManager = new WebSocketManager(this.io);
    this.queueManager = new QueueManager();
    this.aiOrchestrator = new AIOrchestrator();
    this.nexusEngine = new NexusEngine();
    this.agentCoordinator = new AgentCoordinator(
      this.aiOrchestrator,
      this.nexusEngine
    );
  }

  private setupMiddleware(): void {
    // Security
    if (process.env.ENABLE_HELMET === 'true') {
      this.app.use(helmet());
    }

    // CORS
    if (process.env.ENABLE_CORS === 'true') {
      this.app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
      }));
    }

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
      }));
    }

    // Rate limiting
    this.app.use('/api', rateLimiter);
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      });
    });

    // API routes
    this.app.use('/api', routes);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
      });
    });

    // Error handler
    this.app.use(errorHandler);
  }

  private async setupDatabase(): Promise<void> {
    try {
      await prisma.$connect();
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize AI Orchestrator
      await this.aiOrchestrator.initialize();
      logger.info('✅ AI Orchestrator initialized');

      // Initialize Nexus Engine
      await this.nexusEngine.initialize();
      logger.info('✅ NEXUS Anti-Hallucination Engine initialized');

      // Initialize Queue Manager
      await this.queueManager.initialize();
      logger.info('✅ Queue Manager initialized');

      // Initialize Agent Coordinator
      await this.agentCoordinator.initialize();
      logger.info('✅ AI Agents initialized');

      // Initialize WebSocket Manager
      await this.wsManager.initialize();
      logger.info('✅ WebSocket Manager initialized');

    } catch (error) {
      logger.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      // Setup
      this.setupMiddleware();
      this.setupRoutes();
      await this.setupDatabase();
      await this.initializeServices();

      // Start server
      const PORT = process.env.PORT || 3000;
      const HOST = process.env.HOST || 'localhost';

      this.httpServer.listen(PORT, () => {
        logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           🧠 MINDHIVE - Collective Intelligence           ║
║                                                            ║
║  Status: ONLINE                                            ║
║  Server: http://${HOST}:${PORT}                           ║
║  Environment: ${process.env.NODE_ENV}                     ║
║                                                            ║
║  ✓ Database Connected                                      ║
║  ✓ AI Orchestrator Ready                                   ║
║  ✓ NEXUS Anti-Hallucination Active                         ║
║  ✓ AI Agents Deployed                                      ║
║  ✓ WebSocket Network Active                                ║
║  ✓ Global Intelligence Synchronized                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
        `);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      // Close HTTP server
      this.httpServer.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Disconnect database
          await prisma.$disconnect();
          logger.info('Database disconnected');

          // Close WebSocket connections
          this.io.close();
          logger.info('WebSocket connections closed');

          // Close queue connections
          await this.queueManager.close();
          logger.info('Queue connections closed');

          logger.info('✅ Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start server
const server = new MindHiveServer();

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.start();
}

// Export the Express app for testing
export const app = server.app;
export default server;

