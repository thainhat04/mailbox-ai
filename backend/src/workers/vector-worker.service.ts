import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService, VectorSyncBatchMessage } from '../common/redis/redis.service';
import { SearchVectorService } from '../modules/email/services/search-vector.service';

/**
 * Vector Worker Service
 * Automatically starts the vector batch worker when the app initializes
 * Processes batches of emails from Redis queue to generate embeddings
 */
@Injectable()
export class VectorWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('VectorWorkerService');
  private isRunning = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly searchVectorService: SearchVectorService,
  ) { }

  async onModuleInit() {
    this.logger.log('Initializing Vector Worker Service...');
    await this.startWorker();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Vector Worker Service...');
    this.isRunning = false;
  }

  /**
   * Start the vector batch worker
   */
  private async startWorker(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Vector worker is already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Vector Batch Worker started, waiting for batch messages...');

    try {
      // Subscribe to Redis batch queue
      await this.redisService.subscribeVectorSyncBatch(
        async (batchMessage: VectorSyncBatchMessage) => {
          if (!this.isRunning) {
            this.logger.warn('Worker is not running, ignoring batch message');
            return;
          }

          this.logger.log(`[Redis] Received batch message: ${batchMessage.batchId} with ${batchMessage.emails.length} emails`);
          await this.processBatch(batchMessage);
        },
      );

      this.logger.log('✅ Vector Batch Worker subscribed to Redis queue (channel: email:vector:sync:batch)');

      // Verify subscription is working by checking Redis connection
      const subscriber = this.redisService.getSubscriber();
      const subscriberStatus = subscriber.status;
      this.logger.log(`Redis subscriber status: ${subscriberStatus}`);

      if (subscriberStatus !== 'ready' && subscriberStatus !== 'connect') {
        this.logger.warn(`Redis subscriber is not ready (status: ${subscriberStatus})`);
      }
    } catch (error) {
      this.logger.error(`Failed to start vector worker: ${error.message}`, error.stack);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Process a batch of emails for embedding generation
   */
  private async processBatch(batchMessage: VectorSyncBatchMessage): Promise<void> {
    const startTime = Date.now();
    const { batchId, emails } = batchMessage;

    this.logger.log(`Processing batch ${batchId} with ${emails.length} emails`);

    try {
      // Prepare texts for batch embedding
      const texts = emails.map((email) => {
        const text = `${email.subject}\n${email.bodyText}`.trim();
        // Limit to 512 characters for sentence-transformers model
        return text.substring(0, 512);
      });

      // Filter out empty texts
      const validEmails = emails.filter((_, index) => texts[index].length > 0);
      const validTexts = texts.filter((text) => text.length > 0);

      if (validTexts.length === 0) {
        this.logger.warn(`Batch ${batchId} has no valid texts, skipping`);
        return;
      }

      // Generate embeddings in batch via AI service
      this.logger.log(
        `[Batch ${batchId}] Calling AI service for ${validTexts.length} texts...`,
      );
      const embeddings = await this.searchVectorService.createVectorEmbeddingBatch(
        validTexts,
      );
      this.logger.log(
        `[Batch ${batchId}] Received ${embeddings?.length || 0} embeddings from AI service`,
      );

      if (!embeddings || embeddings.length === 0) {
        this.logger.error(`Failed to generate embeddings for batch ${batchId}`);
        return;
      }

      if (embeddings.length !== validTexts.length) {
        this.logger.error(
          `Embedding count mismatch for batch ${batchId}: expected ${validTexts.length}, got ${embeddings.length}`,
        );
        return;
      }

      // Store embeddings in database (batch)
      const emailIds = validEmails.map((email) => email.emailMessageId);
      await this.searchVectorService.storeBatchEmbeddings(emailIds, embeddings);

      const duration = Date.now() - startTime;
      const avgDimensions = embeddings[0]?.length || 0;

      this.logger.log(
        `✓ Batch ${batchId} completed: ${embeddings.length} emails processed in ${duration}ms (${avgDimensions} dimensions, ~${Math.round(duration / embeddings.length)}ms per email)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `✗ Batch ${batchId} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      // In production, consider implementing:
      // - Retry logic with exponential backoff
      // - Dead letter queue for failed batches
      // - Partial success handling (some embeddings succeeded)
    }
  }

  /**
   * Check if the worker is running
   */
  isWorkerRunning(): boolean {
    return this.isRunning;
  }
}
