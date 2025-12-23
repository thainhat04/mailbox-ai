import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface VectorSyncMessage {
  emailMessageId: string;
  subject: string;
  bodyText: string;
  timestamp: Date;
}

export interface VectorSyncBatchMessage {
  emails: Array<{
    emailMessageId: string;
    subject: string;
    bodyText: string;
  }>;
  batchId: string;
  timestamp: Date;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private publisher: Redis;
  private subscriber: Redis;

  // Redis channels
  public readonly VECTOR_SYNC_CHANNEL = 'email:vector:sync';
  public readonly VECTOR_SYNC_BATCH_CHANNEL = 'email:vector:sync:batch';

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

    // Create separate connections for pub/sub
    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis publisher connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    });

    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis subscriber connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    });

    this.publisher.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.publisher.on('error', (err) => {
      this.logger.error(`Redis publisher error: ${err.message}`);
    });

    this.subscriber.on('error', (err) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Publish a message to vector sync queue
   */
  async publishVectorSync(message: VectorSyncMessage): Promise<void> {
    try {
      const payload = JSON.stringify(message);
      await this.publisher.publish(this.VECTOR_SYNC_CHANNEL, payload);
      this.logger.debug(`Published vector sync for email: ${message.emailMessageId}`);
    } catch (error) {
      this.logger.error(`Failed to publish vector sync: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish multiple messages to vector sync queue (batch)
   */
  async publishVectorSyncBatch(messages: VectorSyncMessage[]): Promise<void> {
    try {
      const pipeline = this.publisher.pipeline();

      for (const message of messages) {
        const payload = JSON.stringify(message);
        pipeline.publish(this.VECTOR_SYNC_CHANNEL, payload);
      }

      await pipeline.exec();
      this.logger.log(`Published ${messages.length} vector sync messages`);
    } catch (error) {
      this.logger.error(`Failed to publish batch vector sync: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe to vector sync queue
   */
  async subscribeVectorSync(callback: (message: VectorSyncMessage) => Promise<void>): Promise<void> {
    await this.subscriber.subscribe(this.VECTOR_SYNC_CHANNEL);

    this.subscriber.on('message', async (channel, message) => {
      if (channel === this.VECTOR_SYNC_CHANNEL) {
        try {
          const data: VectorSyncMessage = JSON.parse(message);
          await callback(data);
        } catch (error) {
          this.logger.error(`Error processing vector sync message: ${error.message}`);
        }
      }
    });

    this.logger.log(`Subscribed to ${this.VECTOR_SYNC_CHANNEL}`);
  }

  /**
   * Get Redis publisher instance (for advanced usage)
   */
  getPublisher(): Redis {
    return this.publisher;
  }

  /**
   * Publish batch message to vector sync queue
   */
  async publishVectorSyncBatchMessage(message: VectorSyncBatchMessage): Promise<void> {
    try {
      const payload = JSON.stringify(message);
      const subscribers = await this.publisher.publish(this.VECTOR_SYNC_BATCH_CHANNEL, payload);
      this.logger.log(
        `Published batch vector sync with ${message.emails.length} emails (batch ID: ${message.batchId}) to ${subscribers} subscriber(s)`,
      );

      if (subscribers === 0) {
        this.logger.warn(
          `⚠️  No subscribers listening to channel ${this.VECTOR_SYNC_BATCH_CHANNEL}! Make sure vector worker is running.`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to publish batch vector sync: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe to batch vector sync queue
   */
  async subscribeVectorSyncBatch(callback: (message: VectorSyncBatchMessage) => Promise<void>): Promise<void> {
    // Remove any existing listeners to avoid duplicates
    this.subscriber.removeAllListeners('message');

    await this.subscriber.subscribe(this.VECTOR_SYNC_BATCH_CHANNEL);

    this.subscriber.on('message', async (channel, message) => {
      if (channel === this.VECTOR_SYNC_BATCH_CHANNEL) {
        try {
          this.logger.debug(`Received message on channel ${channel}, parsing...`);
          const data: VectorSyncBatchMessage = JSON.parse(message);
          this.logger.debug(`Parsed batch message: ${data.batchId} with ${data.emails.length} emails`);
          await callback(data);
        } catch (error) {
          this.logger.error(`Error processing batch vector sync message: ${error.message}`, error.stack);
        }
      }
    });

    this.logger.log(`✅ Subscribed to ${this.VECTOR_SYNC_BATCH_CHANNEL}`);
  }

  /**
   * Get Redis subscriber instance (for advanced usage)
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }
}
