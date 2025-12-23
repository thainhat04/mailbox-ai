import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailController } from './email.controller';
import { KanbanColumnController } from './controllers/kanban-column.controller';
import { EmailService } from './email.service';
import { OAuth2TokenService } from './services/oauth2-token.service';
import { EmailSyncService } from './services/email-sync.service';
import { KanbanService } from './services/kanban.service';
import { KanbanColumnService } from './services/kanban-column.service';
import { GmailLabelInitializerService } from './services/gmail-label-initializer.service';
import { SummaryService } from './services/summary.service';
import { SnoozeSchedulerService } from './services/snooze-scheduler.service';
import { SearchVectorService } from './services/search-vector.service';
import { DatabaseModule } from '../../database/database.module';
import { VectorWorkerService } from '../../workers/vector-worker.service';

// Provider abstraction
import { GmailProvider } from './providers/gmail/gmail.provider';
import { OutlookProvider } from './providers/outlook/outlook.provider';
import { MailProviderFactory } from './providers/provider.factory';
import { MailProviderRegistry } from './providers/provider.registry';

// Repository
import { EmailMessageRepository } from './repositories/email-message.repository';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(), // Enable cron jobs
  ],
  controllers: [EmailController, KanbanColumnController],
  providers: [
    // Core services
    EmailService,
    OAuth2TokenService,
    EmailSyncService,

    // Kanban services
    KanbanService,
    KanbanColumnService,
    GmailLabelInitializerService,
    SummaryService,
    SnoozeSchedulerService,

    // Search services
    SearchVectorService,

    // Workers
    VectorWorkerService,

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
    KanbanService,
    KanbanColumnService,
    GmailLabelInitializerService,
    SummaryService,
    EmailMessageRepository,
    MailProviderRegistry,
  ],
})
export class EmailModule { }
