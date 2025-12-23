import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { RedisService, VectorSyncBatchMessage } from '../common/redis/redis.service';
import { SearchVectorService } from '../modules/email/services/search-vector.service';

/**
 * Vector Batch Worker - Processes batches of 20 emails at a time
 * Uses Gemini batch API for efficient embedding generation
 *
 * Run this as a separate process:
 * npm run start:vector-worker
 */
async function bootstrap() {
  const logger = new Logger('VectorBatchWorker');
  logger.log('Starting Vector Batch Worker...');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get required services
  const redisService = app.get(RedisService);
  const searchVectorService = app.get(SearchVectorService);

  logger.log('Vector Batch Worker initialized, waiting for batch messages...');

  // Subscribe to Redis batch queue
  await redisService.subscribeVectorSyncBatch(async (batchMessage: VectorSyncBatchMessage) => {
    const startTime = Date.now();
    const { batchId, emails } = batchMessage;

    logger.log(`Processing batch ${batchId} with ${emails.length} emails`);

    try {
      // Prepare texts for batch embedding
      const texts = emails.map((email) => {
        const text = `${email.subject}\n${email.bodyText}`.trim();
        // Limit to 2048 characters for Gemini API
        return text.substring(0, 2048);
      });

      // Filter out empty texts
      const validEmails = emails.filter((_, index) => texts[index].length > 0);
      const validTexts = texts.filter((text) => text.length > 0);

      if (validTexts.length === 0) {
        logger.warn(`Batch ${batchId} has no valid texts, skipping`);
        return;
      }

      // Generate embeddings in batch via AI service
      logger.debug(`Calling Gemini API for batch ${batchId} with ${validTexts.length} texts`);
      const embeddings = await searchVectorService.createVectorEmbeddingBatch(validTexts);

      if (!embeddings || embeddings.length === 0) {
        logger.error(`Failed to generate embeddings for batch ${batchId}`);
        return;
      }

      if (embeddings.length !== validTexts.length) {
        logger.error(
          `Embedding count mismatch for batch ${batchId}: expected ${validTexts.length}, got ${embeddings.length}`,
        );
        return;
      }

      // Store embeddings in database (batch)
      const emailIds = validEmails.map((email) => email.emailMessageId);
      await searchVectorService.storeBatchEmbeddings(emailIds, embeddings);

      const duration = Date.now() - startTime;
      const avgDimensions = embeddings[0]?.length || 0;

      logger.log(
        `✓ Batch ${batchId} completed: ${embeddings.length} emails processed in ${duration}ms (${avgDimensions} dimensions, ~${Math.round(duration / embeddings.length)}ms per email)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        `✗ Batch ${batchId} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );
      // In production, consider implementing:
      // - Retry logic with exponential backoff
      // - Dead letter queue for failed batches
      // - Partial success handling (some embeddings succeeded)
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.log('Shutting down Vector Batch Worker...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Shutting down Vector Batch Worker...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start Vector Batch Worker:', error);
  process.exit(1);
});
