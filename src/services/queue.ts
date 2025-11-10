import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class QueueManager {
  private connection: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor() {
    this.connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.connection.ping();
      
      // Create queues
      this.createQueue('code-generation');
      this.createQueue('pattern-analysis');
      this.createQueue('security-scan');
      this.createQueue('self-healing');
      this.createQueue('optimization');

      logger.info('📬 Queue Manager initialized');
    } catch (error) {
      logger.error('Queue initialization failed:', error);
      throw error;
    }
  }

  private createQueue(name: string): void {
    const queue = new Queue(name, { connection: this.connection });

    this.queues.set(name, queue);

    logger.info(`Queue "${name}" created`);
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async addJob(queueName: string, data: any, options?: any): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    await queue.add(queueName, data, options);
    logger.info(`Job added to queue "${queueName}"`);
  }

  createWorker(
    queueName: string,
    processor: (job: any) => Promise<any>
  ): void {
    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency: 5,
    });

    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} in queue "${queueName}" completed`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} in queue "${queueName}" failed:`, err);
    });

    this.workers.set(queueName, worker);
    logger.info(`Worker created for queue "${queueName}"`);
  }

  async close(): Promise<void> {
    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info(`Worker "${name}" closed`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue "${name}" closed`);
    }

    // Close Redis connection
    await this.connection.quit();
    logger.info('Redis connection closed');
  }
}

