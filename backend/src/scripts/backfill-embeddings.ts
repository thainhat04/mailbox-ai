import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { SearchVectorService } from '../modules/email/services/search-vector.service';

/**
 * Backfill embeddings for existing emails that don't have embeddings yet
 * Run with: npx ts-node src/scripts/backfill-embeddings.ts
 *
 * Options:
 *   --limit N     Process only N emails (default: 1000)
 *   --batch-size N  Process N emails per batch (default: 20)
 */
async function backfillEmbeddings() {
  const logger = new Logger('BackfillEmbeddings');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const batchSizeIndex = args.indexOf('--batch-size');

  const LIMIT = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : 1000;
  const BATCH_SIZE = batchSizeIndex >= 0 ? parseInt(args[batchSizeIndex + 1], 10) : 20;

  logger.log('🚀 Starting embedding backfill process...');
  logger.log(`📊 Configuration: limit=${LIMIT}, batch_size=${BATCH_SIZE}\n`);

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const searchVectorService = app.get(SearchVectorService);

  try {
    // Find messages without embeddings
    logger.log('🔍 Finding emails without embeddings...');

    const messagesWithoutEmbeddings = await prisma.$queryRaw<
      Array<{
        id: string;
        messageId: string;
        subject: string | null;
        bodyText: string | null;
        emailAccountId: string;
      }>
    >`
      SELECT em.id, em."messageId", em.subject, em."emailAccountId", mb."bodyText"
      FROM email_messages em
      LEFT JOIN message_bodies mb ON mb."emailMessageId" = em.id
      WHERE mb.embedding IS NULL
        AND (mb."bodyText" IS NOT NULL OR em.subject IS NOT NULL)
      LIMIT ${LIMIT}
    `;

    if (messagesWithoutEmbeddings.length === 0) {
      logger.log('✅ No emails found without embeddings. All done!');
      return;
    }

    logger.log(`📧 Found ${messagesWithoutEmbeddings.length} emails without embeddings\n`);

    // Process in batches
    const totalBatches = Math.ceil(messagesWithoutEmbeddings.length / BATCH_SIZE);
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < messagesWithoutEmbeddings.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = messagesWithoutEmbeddings.slice(i, i + BATCH_SIZE);

      logger.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)...`);

      // Prepare texts for batch embedding
      const texts = batch.map((msg) =>
        `${msg.subject || ''}\n${msg.bodyText || ''}`.trim()
      );

      try {
        // Generate embeddings in batch
        const startTime = Date.now();
        const embeddings = await searchVectorService.createVectorEmbeddingBatch(texts);
        const duration = Date.now() - startTime;

        if (!embeddings || embeddings.length === 0) {
          logger.warn(`⚠️  Failed to generate embeddings for batch ${batchNumber}, skipping`);
          failedCount += batch.length;
          continue;
        }

        // Store embeddings in database
        const emailMessageIds = batch.map((msg) => msg.id);
        await searchVectorService.storeBatchEmbeddings(emailMessageIds, embeddings);

        processedCount += batch.length;
        successCount += embeddings.length;

        logger.log(
          `✅ Batch ${batchNumber}/${totalBatches} completed in ${duration}ms (${embeddings.length} embeddings stored)`
        );

        // Progress report every 5 batches
        if (batchNumber % 5 === 0) {
          const progress = ((processedCount / messagesWithoutEmbeddings.length) * 100).toFixed(1);
          logger.log(`📊 Progress: ${processedCount}/${messagesWithoutEmbeddings.length} (${progress}%)\n`);
        }

      } catch (error) {
        logger.error(`❌ Error processing batch ${batchNumber}:`, error.message);
        failedCount += batch.length;
        // Continue with next batch even if one fails
      }
    }

    logger.log('\n' + '='.repeat(60));
    logger.log('✅ Backfill completed!');
    logger.log(`📊 Summary:`);
    logger.log(`   - Total emails processed: ${processedCount}`);
    logger.log(`   - Successfully embedded: ${successCount}`);
    logger.log(`   - Failed: ${failedCount}`);
    logger.log('='.repeat(60) + '\n');

    logger.log('💡 Next steps:');
    logger.log('   1. Test semantic search: POST /api/v1/emails/semantic-search');
    logger.log('   2. Try queries like "money", "urgent meeting", "vacation"');

  } catch (error) {
    logger.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the backfill
backfillEmbeddings().catch((error) => {
  console.error('Failed to backfill embeddings:', error);
  process.exit(1);
});
