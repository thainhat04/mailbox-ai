/**
 * Diagnostic script to verify why embeddings are not being created
 * Run with: npx ts-node verify-embeddings.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/database/prisma.service';
import { RedisService } from './src/common/redis/redis.service';
import { SearchVectorService } from './src/modules/email/services/search-vector.service';
import { EmailSyncService } from './src/modules/email/services/email-sync.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

async function verifyEmbeddings() {
  console.log('🔍 Starting Embedding Verification...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const redisService = app.get(RedisService);
  const searchVectorService = app.get(SearchVectorService);
  const emailSyncService = app.get(EmailSyncService);
  const configService = app.get(ConfigService);

  const results = {
    database: { status: '❌', message: '' },
    redis: { status: '❌', message: '' },
    aiService: { status: '❌', message: '' },
    messages: { status: '❌', message: '', count: 0 },
    worker: { status: '❌', message: '' },
    config: { status: '❌', message: '' },
  };

  // 1. Check Database - embedding column exists
  console.log('1️⃣ Checking Database...');
  try {
    const columnCheck = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'message_bodies'
        AND column_name = 'embedding'
    `;

    if (columnCheck.length > 0) {
      results.database = { status: '✅', message: `Column exists: ${columnCheck[0].data_type}` };
      console.log(`   ✅ Embedding column exists: ${columnCheck[0].data_type}`);
    } else {
      results.database = { status: '❌', message: 'Embedding column does not exist!' };
      console.log('   ❌ Embedding column does not exist!');
    }
  } catch (error) {
    results.database = { status: '❌', message: `Error: ${error.message}` };
    console.log(`   ❌ Database error: ${error.message}`);
  }

  // 2. Check pgvector extension
  console.log('\n2️⃣ Checking pgvector extension...');
  try {
    const extensionCheck = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;

    if (extensionCheck.length > 0) {
      console.log('   ✅ pgvector extension is installed');
    } else {
      console.log('   ❌ pgvector extension is NOT installed!');
      console.log('   💡 Run: CREATE EXTENSION IF NOT EXISTS vector;');
    }
  } catch (error) {
    console.log(`   ❌ Error checking extension: ${error.message}`);
  }

  // 3. Check Redis connection
  console.log('\n3️⃣ Checking Redis connection...');
  try {
    const publisher = redisService.getPublisher();
    await publisher.ping();
    results.redis = { status: '✅', message: 'Redis is connected' };
    console.log('   ✅ Redis is connected');
  } catch (error) {
    results.redis = { status: '❌', message: `Redis connection failed: ${error.message}` };
    console.log(`   ❌ Redis connection failed: ${error.message}`);
    console.log('   💡 Make sure Redis is running and REDIS_URL is correct');
  }

  // 4. Check AI Service
  console.log('\n4️⃣ Checking AI Service...');
  const aiServiceUrl = configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  try {
    const response = await axios.get(`${aiServiceUrl}/health`, { timeout: 5000 });
    results.aiService = { status: '✅', message: `AI service is accessible at ${aiServiceUrl}` };
    console.log(`   ✅ AI service is accessible at ${aiServiceUrl}`);
  } catch (error) {
    results.aiService = { status: '❌', message: `AI service unreachable: ${error.message}` };
    console.log(`   ❌ AI service unreachable at ${aiServiceUrl}`);
    console.log(`   💡 Error: ${error.message}`);
    console.log('   💡 Make sure AI service is running and AI_SERVICE_URL is correct');
  }

  // 5. Check messages without embeddings
  console.log('\n5️⃣ Checking messages without embeddings...');
  try {
    const messagesWithoutEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM email_messages em
      LEFT JOIN message_bodies mb ON mb."emailMessageId" = em.id
      WHERE mb.embedding IS NULL
        AND mb."bodyText" IS NOT NULL
    `;

    const count = Number(messagesWithoutEmbeddings[0]?.count || 0);
    results.messages = { status: count > 0 ? '⚠️' : '✅', message: `${count} messages need embeddings`, count };

    if (count > 0) {
      console.log(`   ⚠️  Found ${count} messages without embeddings`);
    } else {
      console.log('   ✅ All messages have embeddings (or no messages with body text)');
    }
  } catch (error) {
    results.messages = { status: '❌', message: `Error: ${error.message}`, count: 0 };
    console.log(`   ❌ Error checking messages: ${error.message}`);
  }

  // 6. Check configuration
  console.log('\n6️⃣ Checking configuration...');
  const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
  console.log(`   REDIS_URL: ${redisUrl}`);
  console.log(`   AI_SERVICE_URL: ${aiServiceUrl}`);

  if (redisUrl && aiServiceUrl) {
    results.config = { status: '✅', message: 'Configuration looks good' };
  } else {
    results.config = { status: '❌', message: 'Missing configuration' };
  }

  // 7. Test embedding generation
  console.log('\n7️⃣ Testing embedding generation...');
  try {
    const testEmbedding = await searchVectorService.createVectorEmbedding('test email content');
    if (testEmbedding && testEmbedding.length === 384) {
      console.log(`   ✅ Embedding generation works! (${testEmbedding.length} dimensions)`);
    } else {
      console.log(`   ❌ Embedding generation returned invalid result (${testEmbedding?.length || 0} dimensions)`);
    }
  } catch (error) {
    console.log(`   ❌ Embedding generation failed: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Database:        ${results.database.status} ${results.database.message}`);
  console.log(`Redis:           ${results.redis.status} ${results.redis.message}`);
  console.log(`AI Service:      ${results.aiService.status} ${results.aiService.message}`);
  console.log(`Messages:        ${results.messages.status} ${results.messages.message}`);
  console.log(`Configuration:   ${results.config.status} ${results.config.message}`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (results.database.status === '❌') {
    console.log('   - Install pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('   - Run migrations: npx prisma migrate deploy');
  }
  if (results.redis.status === '❌') {
    console.log('   - Start Redis: redis-server (or docker run redis)');
    console.log('   - Check REDIS_URL in .env file');
  }
  if (results.aiService.status === '❌') {
    console.log('   - Start AI service: cd ai-service && python main.py');
    console.log('   - Check AI_SERVICE_URL in .env file');
  }
  if (results.messages.count > 0) {
    console.log(`   - ${results.messages.count} messages need embeddings`);
    console.log('   - Start vector worker: npm run start:vector-worker');
    console.log('   - Or trigger sync to queue messages for embedding generation');
  }
  if (results.worker.status === '❌') {
    console.log('   - Vector worker is not running');
    console.log('   - Start it: npm run start:vector-worker');
  }

  await app.close();
  process.exit(0);
}

verifyEmbeddings().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
