import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { RedisService, VectorSyncMessage } from '../common/redis/redis.service';
import { SearchVectorService } from '../modules/email/services/search-vector.service';

/**
 * Vector Worker - Consumes messages from Redis queue and generates embeddings
 *
 * Run this as a separate process:
 * npm run start:vector-worker
 */
async function bootstrap() {
  const logger = new Logger('VectorWorker');
  logger.log('Starting Vector Worker...');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get required services
  const redisService = app.get(RedisService);
  const searchVectorService = app.get(SearchVectorService);

  logger.log('Vector Worker initialized, waiting for messages...');

  // Subscribe to Redis queue
  await redisService.subscribeVectorSync(async (message: VectorSyncMessage) => {
    try {
      logger.log(`Processing vector sync for email: ${message.emailMessageId}`);

      const startTime = Date.now();

      // Combine subject and body for embedding
      const text = `${message.subject}\n${message.bodyText}`.trim();

      if (!text) {
        logger.warn(`No text content for email ${message.emailMessageId}, skipping`);
        return;
      }

      // Generate embedding via AI service
      const embedding = await searchVectorService.createVectorEmbedding(text);

      if (!embedding || embedding.length === 0) {
        logger.error(`Failed to generate embedding for email ${message.emailMessageId}`);
        return;
      }

      // Store embedding in database
      await searchVectorService.storeEmbedding(message.emailMessageId, embedding);

      const duration = Date.now() - startTime;
      logger.log(
        `Successfully processed email ${message.emailMessageId} in ${duration}ms (${embedding.length} dimensions)`,
      );
    } catch (error) {
      logger.error(
        `Error processing vector sync for ${message.emailMessageId}: ${error.message}`,
        error.stack,
      );
      // Message will be lost - consider implementing dead letter queue for retries
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.log('Shutting down Vector Worker...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Shutting down Vector Worker...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start Vector Worker:', error);
  process.exit(1);
});
