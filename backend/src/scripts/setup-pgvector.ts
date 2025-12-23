import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to enable pgvector extension and create vector indexes
 * Run with: npx ts-node src/scripts/setup-pgvector.ts
 */
async function setupPgVector() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Setting up pgvector extension and indexes...\n');

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, '../../prisma/migrations/setup_pgvector.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      if (statement.includes('SELECT')) {
        // For SELECT queries, show the results
        const result = await prisma.$queryRawUnsafe(statement);
        console.log('📊 Index verification:');
        console.table(result);
      } else {
        // For DDL statements, just execute
        await prisma.$executeRawUnsafe(statement);
        const action = statement.includes('CREATE EXTENSION')
          ? 'Extension enabled'
          : statement.includes('CREATE INDEX')
          ? 'Index created'
          : 'Statement executed';
        console.log(`✅ ${action}: ${statement.substring(0, 60)}...`);
      }
    }

    console.log('\n✅ pgvector setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the backfill script to generate embeddings for existing emails');
    console.log('   2. Test semantic search functionality');

  } catch (error) {
    console.error('❌ Error setting up pgvector:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupPgVector().catch((error) => {
  console.error('Failed to setup pgvector:', error);
  process.exit(1);
});
