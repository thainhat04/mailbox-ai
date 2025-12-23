/**
 * Debug semantic search - Find out why it's not working
 * Run: npx ts-node debug-semantic-search.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/database/prisma.service';
import { SearchVectorService } from './src/modules/email/services/search-vector.service';

async function debugSemanticSearch() {
  console.log('🔍 Debugging Semantic Search...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const searchVectorService = app.get(SearchVectorService);

  try {
    // 1. Check total emails
    console.log('1️⃣ Checking emails in database...');
    const totalEmails = await prisma.emailMessage.count();
    console.log(`   Total emails: ${totalEmails}`);

    if (totalEmails === 0) {
      console.log('   ❌ No emails in database! Please sync emails first.');
      await app.close();
      return;
    }

    // 2. Check message bodies
    console.log('\n2️⃣ Checking message bodies...');
    const totalBodies = await prisma.messageBody.count();
    console.log(`   Total message bodies: ${totalBodies}`);

    // 3. Check embeddings
    console.log('\n3️⃣ Checking embeddings...');
    const withEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM message_bodies
      WHERE embedding IS NOT NULL
    `;
    const withoutEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM message_bodies
      WHERE embedding IS NULL
    `;

    const countWith = Number(withEmbeddings[0]?.count || 0);
    const countWithout = Number(withoutEmbeddings[0]?.count || 0);

    console.log(`   With embeddings: ${countWith}`);
    console.log(`   Without embeddings: ${countWithout}`);

    if (countWith === 0) {
      console.log('\n   ❌ No embeddings found!');
      console.log('   💡 Run: npx ts-node src/scripts/backfill-embeddings.ts');
      await app.close();
      return;
    }

    // 4. Check pgvector extension
    console.log('\n4️⃣ Checking pgvector extension...');
    const pgvectorCheck = await prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'
    `;

    if (pgvectorCheck.length === 0) {
      console.log('   ❌ pgvector extension not installed!');
      console.log('   💡 Run: npx ts-node src/scripts/run-pgvector-setup.ts');
      await app.close();
      return;
    }

    console.log(`   ✅ pgvector installed (version ${pgvectorCheck[0].extversion})`);

    // 5. Check vector index
    console.log('\n5️⃣ Checking vector index...');
    const indexCheck = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'message_bodies'
        AND indexname LIKE '%embedding%'
    `;

    if (indexCheck.length === 0) {
      console.log('   ⚠️  No vector index found (search will be slow)');
      console.log('   💡 Run: npx ts-node src/scripts/run-pgvector-setup.ts');
    } else {
      console.log(`   ✅ Index found: ${indexCheck[0].indexname}`);
    }

    // 6. Test AI service
    console.log('\n6️⃣ Testing AI service connection...');
    try {
      const testEmbedding = await searchVectorService.createVectorEmbedding('test query');
      console.log(`   ✅ AI service works (${testEmbedding.length} dimensions)`);
    } catch (error) {
      console.log(`   ❌ AI service failed: ${error.message}`);
      console.log('   💡 Make sure AI service is running at http://localhost:8000');
      await app.close();
      return;
    }

    // 7. Test actual semantic search query
    console.log('\n7️⃣ Testing semantic search query...');

    const testQuery = 'money';
    console.log(`   Query: "${testQuery}"`);

    // Generate embedding for query
    const queryEmbedding = await searchVectorService.createVectorEmbedding(testQuery);
    console.log(`   Query embedding generated (${queryEmbedding.length} dimensions)`);

    // Try raw SQL query
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    console.log('\n   Executing raw semantic search query...');
    const rawResults = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT
        em.id,
        em.subject,
        em."from",
        (1 - (mb.embedding <=> $1::vector)) AS similarity
      FROM email_messages em
      INNER JOIN message_bodies mb ON mb."emailMessageId" = em.id
      WHERE mb.embedding IS NOT NULL
        AND (1 - (mb.embedding <=> $1::vector)) > 0.3
      ORDER BY mb.embedding <=> $1::vector ASC
      LIMIT 10`,
      embeddingStr
    );

    console.log(`\n   Found ${rawResults.length} results:`);

    if (rawResults.length === 0) {
      console.log('   ❌ No results found!');
      console.log('\n   Possible issues:');
      console.log('   1. Similarity threshold too high (currently 0.3)');
      console.log('   2. Query embedding doesn\'t match any email embeddings');
      console.log('   3. Email content might not be relevant');

      // Try without threshold
      console.log('\n   Trying without similarity threshold...');
      const allResults = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT
          em.id,
          em.subject,
          (1 - (mb.embedding <=> $1::vector)) AS similarity
        FROM email_messages em
        INNER JOIN message_bodies mb ON mb."emailMessageId" = em.id
        WHERE mb.embedding IS NOT NULL
        ORDER BY mb.embedding <=> $1::vector ASC
        LIMIT 5`,
        embeddingStr
      );

      console.log(`   Found ${allResults.length} results (no threshold):`);
      allResults.forEach((result, i) => {
        console.log(`   ${i + 1}. ${result.subject} (similarity: ${Number(result.similarity).toFixed(3)})`);
      });

    } else {
      rawResults.forEach((result, i) => {
        console.log(`   ${i + 1}. ${result.subject}`);
        console.log(`      From: ${result.from}`);
        console.log(`      Similarity: ${Number(result.similarity).toFixed(3)}`);
      });
    }

    // 8. Check actual API endpoint logic
    console.log('\n8️⃣ Checking semantic search threshold in code...');
    console.log('   Current threshold in email-message.repository.ts: 0.5');
    console.log('   💡 If no results, try lowering threshold to 0.3');

    // 9. Sample some embeddings
    console.log('\n9️⃣ Sampling existing embeddings...');
    const sampleEmbeddings = await prisma.$queryRaw<Array<{
      subject: string;
      embedding_length: number;
    }>>`
      SELECT
        em.subject,
        array_length(mb.embedding, 1) as embedding_length
      FROM email_messages em
      INNER JOIN message_bodies mb ON mb."emailMessageId" = em.id
      WHERE mb.embedding IS NOT NULL
      LIMIT 5
    `;

    console.log('   Sample embeddings:');
    sampleEmbeddings.forEach((sample, i) => {
      console.log(`   ${i + 1}. "${sample.subject}" (${sample.embedding_length} dimensions)`);
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total emails: ${totalEmails}`);
    console.log(`Emails with embeddings: ${countWith}/${totalBodies}`);
    console.log(`pgvector: ${pgvectorCheck.length > 0 ? '✅ Installed' : '❌ Not installed'}`);
    console.log(`Vector index: ${indexCheck.length > 0 ? '✅ Created' : '⚠️  Missing'}`);
    console.log(`AI service: ✅ Working`);
    console.log(`Test query results: ${rawResults.length > 0 ? `✅ Found ${rawResults.length}` : '❌ No results'}`);

    console.log('\n💡 NEXT STEPS:');
    if (rawResults.length === 0) {
      console.log('   1. Lower similarity threshold in email-message.repository.ts (line 896)');
      console.log('      Change: const similarityThreshold = 0.5;');
      console.log('      To:     const similarityThreshold = 0.3;');
      console.log('   2. Generate more embeddings: npx ts-node src/scripts/backfill-embeddings.ts');
      console.log('   3. Try different search queries');
    } else {
      console.log('   ✅ Semantic search is working!');
      console.log('   Test it via API: POST /api/v1/emails/semantic-search');
    }

  } catch (error) {
    console.error('\n❌ Error during diagnostic:', error);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

debugSemanticSearch().catch((error) => {
  console.error('Failed to run diagnostic:', error);
  process.exit(1);
});
