/**
 * Quick test of semantic search with new threshold
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmailService } from './src/modules/email/email.service';

async function testSemanticSearch() {
  console.log('🔍 Testing Semantic Search with new threshold (0.2)...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  try {
    // Get first user ID (you'll need to replace with actual user ID)
    const userId = '339b7fdb-f22d-4050-b033-66c42389f74a'; // thainhat.104@gmail.com

    const queries = ['money', 'payment', 'github', 'work'];

    for (const query of queries) {
      console.log(`\n📧 Query: "${query}"`);
      console.log('─'.repeat(60));

      try {
        const result = await emailService.semanticSearchEmails(query, userId, {
          page: 1,
          limit: 5,
        });

        console.log(`Found ${result.total} total results (showing ${result.emails.length}):\n`);

        if (result.emails.length === 0) {
          console.log('   ❌ No results found');
        } else {
          result.emails.forEach((email, i) => {
            console.log(`${i + 1}. ${email.subject}`);
            console.log(`   From: ${email.from.email}`);
            console.log(`   Score: ${email.relevanceScore.toFixed(3)}`);
            console.log('');
          });
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.close();
  }
}

testSemanticSearch();
