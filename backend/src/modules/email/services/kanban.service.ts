import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { PrismaService } from '../../../database/prisma.service';
import { SummaryService } from './summary.service';
import {
  KanbanBoardDto,
  SnoozeEmailDto,
  EmailDto,
} from '../dto';

@Injectable()
export class KanbanService {
  private readonly logger = new Logger(KanbanService.name);

  constructor(
    private readonly emailMessageRepository: EmailMessageRepository,
    private readonly prisma: PrismaService,
    private readonly summaryService: SummaryService,
  ) {}

  /**
   * Update email kanban status
   */
  async updateKanbanStatus(
    userId: string,
    emailId: string,
    newStatus: string,
  ) {
    // Verify user owns the email
    const email = await this.prisma.emailMessage.findFirst({
      where: {
        id: emailId,
        emailAccount: { userId },
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Update status
    return this.emailMessageRepository.updateKanbanStatus(emailId, newStatus);
  }

  /**
   * Get emails grouped by kanban status
   */
  async getKanbanBoard(
    userId: string,
    includeDoneAll?: boolean,
  ): Promise<KanbanBoardDto> {
    // Fetch emails for each status in parallel
    const [inbox, toDo, inProgress, done, snoozed] = await Promise.all([
      this.emailMessageRepository.findByKanbanStatus(
        userId,
        'INBOX',
        false,
      ),
      this.emailMessageRepository.findByKanbanStatus(
        userId,
        'TO_DO',
        false,
      ),
      this.emailMessageRepository.findByKanbanStatus(
        userId,
        'IN_PROGRESS',
        false,
      ),
      this.emailMessageRepository.findByKanbanStatus(
        userId,
        'DONE',
        includeDoneAll,
      ),
      this.emailMessageRepository.findByKanbanStatus(
        userId,
        'SNOOZED',
        false,
      ),
    ]);

    // Pre-generate summaries for emails that don't have one
    const allEmails = [...inbox, ...toDo, ...inProgress, ...done, ...snoozed];
    await this.ensureSummaries(userId, allEmails);

    return {
      inbox: inbox as any,
      toDo: toDo as any,
      inProgress: inProgress as any,
      done: done as any,
      snoozed: snoozed as any,
    };
  }

  /**
   * Snooze email with duration calculation
   */
  async snoozeEmail(
    userId: string,
    emailId: string,
    snoozeDto: SnoozeEmailDto,
  ) {
    // Verify user owns the email
    const email = await this.prisma.emailMessage.findFirst({
      where: {
        id: emailId,
        emailAccount: { userId },
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Calculate snoozedUntil datetime
    const snoozedUntil = this.calculateSnoozeDateTime(
      snoozeDto.duration,
      snoozeDto.customDateTime,
    );

    // Update to SNOOZED status
    return this.emailMessageRepository.updateKanbanStatus(
      emailId,
      'SNOOZED',
      snoozedUntil,
    );
  }

  /**
   * Manually unsnooze email
   */
  async unsnoozeEmail(userId: string, emailId: string) {
    // Verify user owns the email
    const email = await this.prisma.emailMessage.findFirst({
      where: {
        id: emailId,
        emailAccount: { userId },
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Update to INBOX status and clear snoozedUntil
    return this.emailMessageRepository.updateKanbanStatus(emailId, 'INBOX');
  }

  /**
   * Get list of snoozed emails
   */
  async getSnoozedEmails(userId: string) {
    return this.emailMessageRepository.findByKanbanStatus(
      userId,
      'SNOOZED',
      false,
    );
  }

  /**
   * Calculate snooze datetime from duration enum
   */
  private calculateSnoozeDateTime(
    duration: string,
    customDateTime?: string,
  ): Date {
    const now = new Date();

    switch (duration) {
      case '1_HOUR':
        return new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

      case '3_HOURS':
        return new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3 hours

      case '1_DAY': {
        // Tomorrow at 9 AM
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      }

      case '3_DAYS': {
        // 3 days from now at 9 AM
        const threeDays = new Date(now);
        threeDays.setDate(threeDays.getDate() + 3);
        threeDays.setHours(9, 0, 0, 0);
        return threeDays;
      }

      case '1_WEEK': {
        // 7 days from now at 9 AM
        const oneWeek = new Date(now);
        oneWeek.setDate(oneWeek.getDate() + 7);
        oneWeek.setHours(9, 0, 0, 0);
        return oneWeek;
      }

      case 'CUSTOM':
        if (!customDateTime) {
          throw new Error('Custom datetime is required for CUSTOM duration');
        }
        return new Date(customDateTime);

      default:
        throw new Error(`Invalid duration: ${duration}`);
    }
  }

  /**
   * Pre-generate summaries for emails that don't have one yet
   * This enables eager loading of summaries in kanban board
   */
  private async ensureSummaries(userId: string, emails: any[]): Promise<void> {
    // Filter emails that need summary generation
    const emailsNeedingSummary = emails.filter((email) => !email.summary);

    if (emailsNeedingSummary.length === 0) {
      return; // All emails already have summaries
    }

    this.logger.log(
      `Pre-generating summaries for ${emailsNeedingSummary.length} emails`,
    );

    // Generate summaries in parallel (but don't wait for all to complete)
    // Use Promise.allSettled to avoid blocking if some fail
    const results = await Promise.allSettled(
      emailsNeedingSummary.map((email) =>
        this.summaryService
          .getEmailSummary(userId, email.id, false)
          .catch((error) => {
            this.logger.warn(
              `Failed to generate summary for email ${email.id}: ${error.message}`,
            );
            return null;
          }),
      ),
    );

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value !== null,
    ).length;

    this.logger.log(
      `Successfully generated ${successCount}/${emailsNeedingSummary.length} summaries`,
    );
  }
}