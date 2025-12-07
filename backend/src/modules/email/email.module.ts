import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { OAuth2TokenService } from './services/oauth2-token.service';
import { EmailSyncService } from './services/email-sync.service';
import { DatabaseModule } from '../../database/database.module';

// Provider abstraction
import { GmailProvider } from './providers/gmail/gmail.provider';
import { OutlookProvider } from './providers/outlook/outlook.provider';
import { MailProviderFactory } from './providers/provider.factory';
import { MailProviderRegistry } from './providers/provider.registry';

// Repository
import { EmailMessageRepository } from './repositories/email-message.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [EmailController],
  providers: [
    // Core services
    EmailService,
    OAuth2TokenService,
    EmailSyncService,

    // Repository
    EmailMessageRepository,

    // Provider implementations
    GmailProvider,
    OutlookProvider,

    // Provider management
    MailProviderFactory,
    MailProviderRegistry,
  ],
  exports: [
    EmailService,
    OAuth2TokenService,
    EmailSyncService,
    EmailMessageRepository,
    MailProviderRegistry,
  ],
})
export class EmailModule {}
