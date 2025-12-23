/**
 * Check if emails belong to a user and if embeddings exist
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/database/prisma.service';

async function checkUserEmails() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`📊 Found ${users.length} users:\n`);

    for (const user of users) {
      console.log(`👤 User: ${user.email} (${user.name || 'No name'})`);
      console.log(`   ID: ${user.id}`);

      // Get email accounts for this user
      const emailAccounts = await prisma.emailAccount.findMany({
        where: { userId: user.id },
        select: { id: true, email: true },
      });

      console.log(`   Email accounts: ${emailAccounts.length}`);

      for (const account of emailAccounts) {
        console.log(`     - ${account.email}`);

        // Count emails for this account
        const emailCount = await prisma.emailMessage.count({
          where: { emailAccountId: account.id },
        });

        // Count emails with embeddings
        const withEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM email_messages em
          INNER JOIN message_bodies mb ON mb."emailMessageId" = em.id
          WHERE em."emailAccountId" = ${account.id}
            AND mb.embedding IS NOT NULL
        `;

        const embeddingCount = Number(withEmbeddings[0]?.count || 0);

        console.log(`       Emails: ${emailCount}`);
        console.log(`       With embeddings: ${embeddingCount}`);
      }

      console.log('');
    }

    // Test semantic search for first user
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🔍 Testing semantic search for user: ${testUser.email}`);

      // Get email accounts
      const emailAccounts = await prisma.emailAccount.findMany({
        where: { userId: testUser.id },
        select: { id: true },
      });

      if (emailAccounts.length === 0) {
        console.log('   ❌ No email accounts found!');
        await app.close();
        return;
      }

      const accountIds = emailAccounts.map((acc) => acc.id);

      // Simple query to check embeddings
      const emailsWithEmbeddings = await prisma.$queryRaw<Array<any>>`
        SELECT
          em.id,
          em.subject,
          em."from",
          CASE WHEN mb.embedding IS NOT NULL THEN 'YES' ELSE 'NO' END as has_embedding
        FROM email_messages em
        LEFT JOIN message_bodies mb ON mb."emailMessageId" = em.id
        WHERE em."emailAccountId" = ANY(${accountIds}::text[])
        LIMIT 10
      `;

      console.log('\n   Sample emails:');
      emailsWithEmbeddings.forEach((email, i) => {
        console.log(`   ${i + 1}. ${email.subject}`);
        console.log(`      Embedding: ${email.has_embedding}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.close();
  }
}

checkUserEmails();
