import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { prisma } from '../index';

export class WebSocketManager {
  private connectedUsers: Map<string, Socket> = new Map();

  constructor(private io: SocketIOServer) {}

  async initialize(): Promise<void> {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.info('🌐 WebSocket Manager initialized');
  }

  private handleConnection(socket: Socket): void {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      this.connectedUsers.set(userId, socket);
      logger.info(`User ${userId} connected via WebSocket`);
    }

    // Handle events
    socket.on('subscribe:global-patterns', () => this.subscribeToGlobalPatterns(socket));
    socket.on('subscribe:team', (teamId: string) => this.subscribeToTeam(socket, teamId));
    socket.on('code:update', (data) => this.handleCodeUpdate(socket, data));
    socket.on('agent:request', (data) => this.handleAgentRequest(socket, data));

    socket.on('disconnect', () => {
      if (userId) {
        this.connectedUsers.delete(userId);
        logger.info(`User ${userId} disconnected`);
      }
    });
  }

  private subscribeToGlobalPatterns(socket: Socket): void {
    socket.join('global-patterns');
    logger.info(`Socket ${socket.id} subscribed to global patterns`);
  }

  private subscribeToTeam(socket: Socket, teamId: string): void {
    socket.join(`team:${teamId}`);
    logger.info(`Socket ${socket.id} subscribed to team ${teamId}`);
  }

  private async handleCodeUpdate(socket: Socket, data: any): Promise<void> {
    // Broadcast code updates to team
    const { teamId, code, language } = data;
    if (teamId) {
      this.io.to(`team:${teamId}`).emit('code:updated', {
        userId: data.userId,
        code,
        language,
        timestamp: new Date(),
      });
    }
  }

  private async handleAgentRequest(socket: Socket, data: any): Promise<void> {
    // Handle real-time agent requests
    socket.emit('agent:processing', { requestId: data.requestId });
    // Agent processing would be handled by AgentCoordinator
  }

  // Broadcast global pattern updates
  broadcastGlobalPattern(pattern: any): void {
    this.io.to('global-patterns').emit('pattern:new', pattern);
  }

  // Send notification to specific user
  notifyUser(userId: string, event: string, data: any): void {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  // Broadcast to team
  broadcastToTeam(teamId: string, event: string, data: any): void {
    this.io.to(`team:${teamId}`).emit(event, data);
  }

  // Get connection stats
  getStats(): { totalConnections: number; users: number } {
    return {
      totalConnections: this.io.sockets.sockets.size,
      users: this.connectedUsers.size,
    };
  }
}

