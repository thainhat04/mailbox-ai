import { PrismaClient } from '@prisma/client';

async function setupPgVector() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Setting up pgvector extension and indexes...\n');

    // 1. Enable pgvector extension
    console.log('📦 Enabling pgvector extension...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector extension enabled\n');

    // 2. Create cosine similarity index
    console.log('📊 Creating vector index for cosine similarity...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_message_bodies_embedding_cosine
      ON message_bodies
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log('✅ Vector index created\n');

    // 3. Verify indexes
    console.log('🔍 Verifying indexes...');
    const indexes = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'message_bodies'
        AND indexname LIKE '%embedding%'
    `);

    if (indexes.length > 0) {
      console.log('✅ Found vector indexes:');
      console.table(indexes.map(idx => ({
        Index: idx.indexname,
        Table: idx.tablename,
      })));
    } else {
      console.log('⚠️  No vector indexes found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ pgvector setup completed successfully!');
    console.log('='.repeat(60) + '\n');

    console.log('📝 Next steps:');
    console.log('   1. Run backfill script: npx ts-node src/scripts/backfill-embeddings.ts');
    console.log('   2. Test semantic search: POST /api/v1/emails/semantic-search');

  } catch (error: any) {
    console.error('❌ Error setting up pgvector:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupPgVector().catch((error) => {
  console.error('Failed to setup pgvector:', error);
  process.exit(1);
});
