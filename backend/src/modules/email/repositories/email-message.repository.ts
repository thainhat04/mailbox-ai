import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailMessage as PrismaEmailMessage } from '@prisma/client';

/**
 * Email message data for upserting
 */
export interface EmailMessageData {
  messageId: string;
  threadId: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject?: string;
  snippet?: string;
  labels?: string[];
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  inReplyTo?: string;
  references?: string[];
  bodyText?: string;
  bodyHtml?: string;
  attachments?: AttachmentData[];
}

export interface AttachmentData {
  providerId: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  isInline?: boolean;
}

export interface SyncStateData {
  lastSyncedHistoryId?: string;
  lastDeltaLink?: string;
}

/**
 * Repository for email message database operations
 */
@Injectable()
export class EmailMessageRepository {
  private readonly logger = new Logger(EmailMessageRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a single email message
   */
  async upsertMessage(
    emailAccountId: string,
    messageData: EmailMessageData,
  ): Promise<PrismaEmailMessage> {
    this.logger.debug(
      `Upserting message ${messageData.messageId} for account ${emailAccountId}`,
    );

    const message = await this.prisma.emailMessage.upsert({
      where: {
        emailAccountId_messageId: {
          emailAccountId,
          messageId: messageData.messageId,
        },
      },
      update: {
        threadId: messageData.threadId,
        from: messageData.from,
        fromName: messageData.fromName,
        to: messageData.to,
        cc: messageData.cc || [],
        bcc: messageData.bcc || [],
        replyTo: messageData.replyTo,
        subject: messageData.subject,
        snippet: messageData.snippet,
        labels: messageData.labels || [],
        date: messageData.date,
        isRead: messageData.isRead,
        isStarred: messageData.isStarred,
        hasAttachments: messageData.hasAttachments,
        inReplyTo: messageData.inReplyTo,
        references: messageData.references || [],
        updatedAt: new Date(),
        // Update body if provided
        body:
          messageData.bodyText || messageData.bodyHtml
            ? {
                upsert: {
                  create: {
                    bodyText: messageData.bodyText,
                    bodyHtml: messageData.bodyHtml,
                  },
                  update: {
                    bodyText: messageData.bodyText,
                    bodyHtml: messageData.bodyHtml,
                  },
                },
              }
            : undefined,
      },
      create: {
        emailAccountId,
        messageId: messageData.messageId,
        threadId: messageData.threadId,
        from: messageData.from,
        fromName: messageData.fromName,
        to: messageData.to,
        cc: messageData.cc || [],
        bcc: messageData.bcc || [],
        replyTo: messageData.replyTo,
        subject: messageData.subject,
        snippet: messageData.snippet,
        labels: messageData.labels || [],
        date: messageData.date,
        isRead: messageData.isRead,
        isStarred: messageData.isStarred,
        hasAttachments: messageData.hasAttachments,
        inReplyTo: messageData.inReplyTo,
        references: messageData.references || [],
        // Create body if provided
        body:
          messageData.bodyText || messageData.bodyHtml
            ? {
                create: {
                  bodyText: messageData.bodyText,
                  bodyHtml: messageData.bodyHtml,
                },
              }
            : undefined,
      },
    });

    // Upsert attachments if provided
    if (messageData.attachments && messageData.attachments.length > 0) {
      await this.upsertAttachments(message.id, messageData.attachments);
    }

    return message;
  }

  /**
   * Upsert multiple email messages in a transaction
   */
  async upsertMessages(
    emailAccountId: string,
    messages: EmailMessageData[],
  ): Promise<number> {
    this.logger.debug(
      `Upserting ${messages.length} messages for account ${emailAccountId}`,
    );

    let count = 0;

    for (const messageData of messages) {
      try {
        await this.upsertMessage(emailAccountId, messageData);
        count++;
      } catch (error) {
        this.logger.error(
          `Failed to upsert message ${messageData.messageId}: ${error.message}`,
        );
        // Continue with other messages
      }
    }

    this.logger.log(
      `Successfully upserted ${count}/${messages.length} messages for account ${emailAccountId}`,
    );

    return count;
  }

  /**
   * Delete a single message by messageId
   */
  async deleteMessage(
    emailAccountId: string,
    messageId: string,
  ): Promise<void> {
    this.logger.debug(
      `Deleting message ${messageId} for account ${emailAccountId}`,
    );

    try {
      await this.prisma.emailMessage.delete({
        where: {
          emailAccountId_messageId: {
            emailAccountId,
            messageId,
          },
        },
      });
    } catch (error) {
      // Message might not exist in database, which is fine
      this.logger.debug(`Message ${messageId} not found in database`);
    }
  }

  /**
   * Delete multiple messages by messageIds
   */
  async deleteMessages(
    emailAccountId: string,
    messageIds: string[],
  ): Promise<number> {
    this.logger.debug(
      `Deleting ${messageIds.length} messages for account ${emailAccountId}`,
    );

    const result = await this.prisma.emailMessage.deleteMany({
      where: {
        emailAccountId,
        messageId: {
          in: messageIds,
        },
      },
    });

    this.logger.log(
      `Deleted ${result.count} messages for account ${emailAccountId}`,
    );

    return result.count;
  }

  /**
   * Update sync state for an email account
   */
  async updateSyncState(
    emailAccountId: string,
    syncState: SyncStateData,
  ): Promise<void> {
    this.logger.debug(`Updating sync state for account ${emailAccountId}`);

    await this.prisma.emailAccount.update({
      where: { id: emailAccountId },
      data: {
        lastSyncedHistoryId: syncState.lastSyncedHistoryId,
        lastDeltaLink: syncState.lastDeltaLink,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get sync state for an email account
   */
  async getSyncState(emailAccountId: string): Promise<SyncStateData | null> {
    const account = await this.prisma.emailAccount.findUnique({
      where: { id: emailAccountId },
      select: {
        lastSyncedHistoryId: true,
        lastDeltaLink: true,
      },
    });

    if (!account) {
      return null;
    }

    return {
      lastSyncedHistoryId: account.lastSyncedHistoryId || undefined,
      lastDeltaLink: account.lastDeltaLink || undefined,
    };
  }

  /**
   * Upsert attachments for a message
   */
  async upsertAttachments(
    emailMessageId: string,
    attachments: AttachmentData[],
  ): Promise<number> {
    if (!attachments || attachments.length === 0) {
      return 0;
    }

    this.logger.debug(
      `Upserting ${attachments.length} attachments for message ${emailMessageId}`,
    );

    // Delete existing attachments first
    await this.prisma.attachment.deleteMany({
      where: { emailMessageId },
    });

    // Create new attachments
    const result = await this.prisma.attachment.createMany({
      data: attachments.map((att) => ({
        emailMessageId,
        providerId: att.providerId,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        contentId: att.contentId,
        isInline: att.isInline || false,
      })),
    });

    return result.count;
  }

  /**
   * Get message count for an account
   */
  async getMessageCount(emailAccountId: string): Promise<number> {
    return this.prisma.emailMessage.count({
      where: { emailAccountId },
    });
  }

  /**
   * Check if a message exists
   */
  async messageExists(
    emailAccountId: string,
    messageId: string,
  ): Promise<boolean> {
    const count = await this.prisma.emailMessage.count({
      where: {
        emailAccountId,
        messageId,
      },
    });

    return count > 0;
  }
}
