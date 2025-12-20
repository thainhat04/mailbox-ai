import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { PrismaService } from '../../../database/prisma.service';
import { SummaryService } from './summary.service';
import { KanbanColumnService } from './kanban-column.service';
import { MailProviderRegistry } from '../providers/provider.registry';
import { SnoozeEmailDto } from '../dto';

@Injectable()
export class KanbanService {
  private readonly logger = new Logger(KanbanService.name);

  constructor(
    private readonly emailMessageRepository: EmailMessageRepository,
    private readonly prisma: PrismaService,
    private readonly summaryService: SummaryService,
    private readonly kanbanColumnService: KanbanColumnService,
    private readonly providerRegistry: MailProviderRegistry,
  ) {}

  /**
   * Update email kanban column (NEW dynamic columns)
   * Syncs Gmail labels when moving emails between columns
   */
  async updateKanbanColumn(
    userId: string,
    emailId: string,
    columnId: string,
  ) {
    // Verify user owns the email
    const email = await this.prisma.emailMessage.findFirst({
      where: {
        id: emailId,
        emailAccount: { userId },
      },
      include: {
        emailAccount: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Verify column exists and belongs to user
    const columns = await this.kanbanColumnService.getColumns(userId);
    const newColumn = columns.find(c => c.id === columnId);

    if (!newColumn) {
      throw new NotFoundException('Column not found');
    }

    // Get old column information
    const oldColumn = email.kanbanColumnId
      ? columns.find(c => c.id === email.kanbanColumnId)
      : null;

    // Sync Gmail labels if account is Google
    if (email.emailAccount.account?.provider === 'google') {
      try {
        await this.syncGmailLabels(
          email.emailAccount.id,
          email.messageId,
          oldColumn,
          newColumn,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync Gmail labels for email ${emailId}: ${error.message}`,
        );
        throw new BadRequestException(
          `Failed to update Gmail labels: ${error.message}`,
        );
      }
    }

    // Update database only after Gmail sync succeeds
    return this.emailMessageRepository.updateKanbanColumn(emailId, columnId);
  }

  /**
   * Sync Gmail labels when moving email between columns
   * - Removes old column's label
   * - Adds new column's label
   * - Removes INBOX label when moving out of INBOX column
   */
  private async syncGmailLabels(
    emailAccountId: string,
    messageId: string,
    oldColumn: any,
    newColumn: any,
  ): Promise<void> {
    const provider = await this.providerRegistry.getProvider(emailAccountId);

    const labelsToRemove: string[] = [];
    const labelsToAdd: string[] = [];

    // Remove old column's Gmail label
    if (oldColumn?.gmailLabelId) {
      labelsToRemove.push(oldColumn.gmailLabelId);
    }

    // Remove INBOX label when moving out of INBOX column
    if (oldColumn?.key === 'INBOX') {
      labelsToRemove.push('INBOX');
    }

    // Add new column's Gmail label
    if (newColumn?.gmailLabelId) {
      labelsToAdd.push(newColumn.gmailLabelId);
    }

    // Call Gmail API to modify labels
    if (labelsToRemove.length > 0 || labelsToAdd.length > 0) {
      this.logger.log(
        `Syncing Gmail labels for message ${messageId}: ` +
        `removing [${labelsToRemove.join(', ')}], ` +
        `adding [${labelsToAdd.join(', ')}]`,
      );

      await provider.modifyLabels(messageId, {
        addLabelIds: labelsToAdd,
        removeLabelIds: labelsToRemove,
      });
    }
  }

  /**
   * Update email kanban status
   * @deprecated Use updateKanbanColumn instead
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
   * Get emails grouped by kanban columns (NEW dynamic approach)
   */
  async getKanbanBoard(
    userId: string,
    includeDoneAll?: boolean,
    filters?: {
      unreadOnly?: boolean;
      hasAttachmentsOnly?: boolean;
      fromEmail?: string;
    },
    sortBy?: 'date_desc' | 'date_asc' | 'sender',
  ): Promise<any> {
    // Get user's columns
    const columns = await this.kanbanColumnService.getColumns(userId);

    if (columns.length === 0) {
      return { columns: [], emails: {} };
    }

    // Fetch emails for each column in parallel
    const emailsPromises = columns.map(column =>
      this.emailMessageRepository.findByColumnId(
        userId,
        column.id,
        { ...filters, includeDoneAll },
        sortBy,
      )
    );

    const emailsArrays = await Promise.all(emailsPromises);

    // Build response with column info and emails
    const emailsByColumn: Record<string, any[]> = {};
    const allEmails: any[] = [];

    columns.forEach((column, index) => {
      const emails = emailsArrays[index];
      emailsByColumn[column.id] = emails;
      allEmails.push(...emails);
    });

    // Pre-generate summaries for emails that don't have one
    await this.ensureSummaries(userId, allEmails);

    return {
      columns: columns.map(col => ({
        id: col.id,
        name: col.name,
        key: col.key,
        color: col.color,
        icon: col.icon,
        order: col.order,
        isSystemProtected: col.isSystemProtected,
        emailCount: emailsByColumn[col.id].length,
      })),
      emails: emailsByColumn,
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

    // Update to FROZEN status
    return this.emailMessageRepository.updateKanbanStatus(
      emailId,
      'FROZEN',
      snoozedUntil,
    );
  }

  /**
   * Manually unsnooze email (restore to previous status)
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

    // Restore to previous status (or INBOX if no previous status)
    return this.emailMessageRepository.unsnoozeEmail(emailId);
  }

  /**
   * Get list of frozen emails
   */
  async getFrozenEmails(userId: string) {
    return this.emailMessageRepository.findByKanbanStatus(
      userId,
      'FROZEN',
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