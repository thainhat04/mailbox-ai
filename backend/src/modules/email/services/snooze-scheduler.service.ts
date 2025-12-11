import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailMessageRepository } from '../repositories/email-message.repository';

@Injectable()
export class SnoozeSchedulerService {
  private readonly logger = new Logger(SnoozeSchedulerService.name);

  constructor(
    private readonly emailMessageRepository: EmailMessageRepository,
  ) {}

  /**
   * Runs every minute to check and unsnooze emails
   * Restores emails to their previous status (or INBOX if none)
   */
  @Cron('*/1 * * * *')
  async checkAndUnsnoozeEmails() {
    try {
      // Find frozen emails where snoozedUntil <= now
      const emailsToUnfreeze =
        await this.emailMessageRepository.findExpiredFrozenEmails();

      if (emailsToUnfreeze.length === 0) {
        return;
      }

      // Batch restore to previous status (or INBOX if no previous status)
      const emailIds = emailsToUnfreeze.map((e) => e.id);

      await this.emailMessageRepository.unsnoozeExpiredEmails(emailIds);

      this.logger.log(`Auto-unsnoozed ${emailIds.length} emails to their previous status`);
    } catch (error) {
      this.logger.error('Error in snooze scheduler', error);
    }
  }
}