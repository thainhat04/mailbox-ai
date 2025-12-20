import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { EmailMessage as PrismaEmailMessage } from "@prisma/client";

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
  kanbanColumnId?: string;
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
        kanbanColumnId: messageData.kanbanColumnId,
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
        kanbanColumnId: messageData.kanbanColumnId,
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

  /**
   * Find emails by kanban column ID (NEW dynamic columns approach)
   */
  async findByColumnId(
    userId: string,
    columnId: string,
    filters?: {
      unreadOnly?: boolean;
      hasAttachmentsOnly?: boolean;
      fromEmail?: string;
      includeDoneAll?: boolean;
    },
    sortBy?: "date_desc" | "date_asc" | "sender",
  ): Promise<PrismaEmailMessage[]> {
    const whereClause: any = {
      emailAccount: { userId },
      kanbanColumnId: columnId,
    };

    // Apply filters
    if (filters?.unreadOnly) {
      whereClause.isRead = false;
    }

    if (filters?.hasAttachmentsOnly) {
      whereClause.hasAttachments = true;
    }

    if (filters?.fromEmail) {
      whereClause.from = {
        contains: filters.fromEmail,
        mode: "insensitive",
      };
    }

    // Determine sort order
    let orderBy: any = { statusChangedAt: "desc" }; // Default

    if (sortBy === "date_desc") {
      orderBy = { date: "desc" };
    } else if (sortBy === "date_asc") {
      orderBy = { date: "asc" };
    } else if (sortBy === "sender") {
      orderBy = { fromName: "asc" };
    }

    return this.prisma.emailMessage.findMany({
      where: whereClause,
      orderBy,
      include: {
        attachments: true,
        body: true,
      },
    });
  }

  /**
   * Find emails by kanban status with optional DONE filtering
   * @deprecated Use findByColumnId instead for dynamic columns
   */
  async findByKanbanStatus(
    userId: string,
    status: string,
    includeDoneAll?: boolean,
    filters?: {
      unreadOnly?: boolean;
      hasAttachmentsOnly?: boolean;
      fromEmail?: string;
    },
    sortBy?: "date_desc" | "date_asc" | "sender",
  ): Promise<PrismaEmailMessage[]> {
    const whereClause: any = {
      emailAccount: { userId },
      kanbanStatus: status,
    };

    // Special filtering for DONE status - only last 7 days unless includeDoneAll is true
    if (status === "DONE" && !includeDoneAll) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      whereClause.statusChangedAt = {
        gte: sevenDaysAgo,
      };
    }

    // Apply filters
    if (filters?.unreadOnly) {
      whereClause.isRead = false;
    }

    if (filters?.hasAttachmentsOnly) {
      whereClause.hasAttachments = true;
    }

    if (filters?.fromEmail) {
      whereClause.from = {
        contains: filters.fromEmail,
        mode: "insensitive",
      };
    }

    // Determine sort order
    let orderBy: any = { statusChangedAt: "desc" }; // Default

    if (sortBy === "date_desc") {
      orderBy = { date: "desc" };
    } else if (sortBy === "date_asc") {
      orderBy = { date: "asc" };
    } else if (sortBy === "sender") {
      orderBy = { fromName: "asc" };
    }

    return this.prisma.emailMessage.findMany({
      where: whereClause,
      orderBy,
      include: {
        attachments: true,
        body: true,
      },
    });
  }

  /**
   * Find frozen emails that are ready to be unfrozen
   */
  async findExpiredFrozenEmails(): Promise<PrismaEmailMessage[]> {
    const now = new Date();

    return this.prisma.emailMessage.findMany({
      where: {
        kanbanStatus: "FROZEN",
        snoozedUntil: {
          lte: now,
        },
      },
    });
  }

  /**
   * Update email's kanban column (NEW dynamic columns approach)
   */
  async updateKanbanColumn(
    emailId: string,
    columnId: string,
  ): Promise<PrismaEmailMessage> {
    return this.prisma.emailMessage.update({
      where: { id: emailId },
      data: {
        kanbanColumnId: columnId,
        statusChangedAt: new Date(),
      },
      include: {
        attachments: true,
        body: true,
      },
    });
  }

  /**
   * Update kanban status for a single email
   * @deprecated Use updateKanbanColumn instead for dynamic columns
   */
  async updateKanbanStatus(
    emailId: string,
    status: string,
    snoozedUntil?: Date | null,
  ): Promise<PrismaEmailMessage> {
    // Get current status before updating (for FROZEN status)
    const currentEmail = await this.prisma.emailMessage.findUnique({
      where: { id: emailId },
      select: { kanbanStatus: true },
    });

    const updateData: any = {
      kanbanStatus: status,
      statusChangedAt: new Date(),
    };

    // When freezing, save the current status as previousKanbanStatus
    if (status === "FROZEN" && currentEmail) {
      updateData.previousKanbanStatus = currentEmail.kanbanStatus;
    }

    // Clear snoozedUntil and previousKanbanStatus if moving away from FROZEN status
    if (status !== "FROZEN") {
      updateData.snoozedUntil = null;
      updateData.previousKanbanStatus = null;
    } else if (snoozedUntil) {
      updateData.snoozedUntil = snoozedUntil;
    }

    return this.prisma.emailMessage.update({
      where: { id: emailId },
      data: updateData,
      include: {
        attachments: true,
        body: true,
      },
    });
  }

  /**
   * Batch update snoozed emails back to their previous status (or INBOX if none)
   */
  async unsnoozeExpiredEmails(emailIds: string[]): Promise<number> {
    // Get emails with their previous status
    const emails = await this.prisma.emailMessage.findMany({
      where: {
        id: { in: emailIds },
      },
      select: {
        id: true,
        previousKanbanStatus: true,
      },
    });

    // Update each email individually to restore previous status
    let count = 0;
    for (const email of emails) {
      try {
        await this.prisma.emailMessage.update({
          where: { id: email.id },
          data: {
            kanbanStatus: email.previousKanbanStatus || "INBOX", // Default to INBOX if no previous status
            previousKanbanStatus: null,
            snoozedUntil: null,
            statusChangedAt: new Date(),
          },
        });
        count++;
      } catch (error) {
        this.logger.error(
          `Failed to unsnooze email ${email.id}: ${error.message}`,
        );
      }
    }

    return count;
  }

  /**
   * Manually unsnooze a single email (restore to previous status)
   */
  async unsnoozeEmail(emailId: string): Promise<PrismaEmailMessage> {
    const email = await this.prisma.emailMessage.findUnique({
      where: { id: emailId },
      select: { previousKanbanStatus: true },
    });

    return this.prisma.emailMessage.update({
      where: { id: emailId },
      data: {
        kanbanStatus: email?.previousKanbanStatus || "INBOX", // Default to INBOX if no previous status
        previousKanbanStatus: null,
        snoozedUntil: null,
        statusChangedAt: new Date(),
      },
      include: {
        attachments: true,
        body: true,
      },
    });
  }

  /**
   * Update email summary
   */
  async updateSummary(
    emailId: string,
    summary: string,
  ): Promise<PrismaEmailMessage> {
    return this.prisma.emailMessage.update({
      where: { id: emailId },
      data: {
        summary,
        summaryGeneratedAt: new Date(),
      },
    });
  }

  /**
   * Fuzzy search emails using PostgreSQL pg_trgm extension
   * Returns emails ranked by match quality (best matches first)
   */
  async fuzzySearchEmails(
    userId: string,
    query: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    results: Array<PrismaEmailMessage & { relevanceScore: number }>;
    total: number;
  }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const similarityThreshold = 0.45;

    this.logger.debug(
      `Fuzzy searching emails for user ${userId} with query: "${query}"`,
    );

    // First, get all email account IDs for the user
    const emailAccounts = await this.prisma.emailAccount.findMany({
      where: { userId },
      select: { id: true },
    });

    if (emailAccounts.length === 0) {
      return { results: [], total: 0 };
    }

    const accountIds = emailAccounts.map((acc) => acc.id);

    const searchQuery = `
      SELECT
        em.*,
        GREATEST(
          COALESCE(similarity(em.subject, $1), 0),
          COALESCE(word_similarity($1, em.subject), 0),
          COALESCE(similarity(em."from", $1), 0),
          COALESCE(word_similarity($1, em."from"), 0),
          COALESCE(similarity(em."fromName", $1), 0),
          COALESCE(word_similarity($1, em."fromName"), 0),
          COALESCE(similarity(em.snippet, $1), 0),
          COALESCE(word_similarity($1, em.snippet), 0)
        ) AS relevance_score
      FROM email_messages em
      WHERE
        em."emailAccountId" = ANY($2::text[])
        AND (
          similarity(em.subject, $1) > $3
          OR similarity(em."from", $1) > $3
          OR similarity(em."fromName", $1) > $3
          OR similarity(em.snippet, $1) > $3
          OR word_similarity($1, em.subject) > $3
          OR word_similarity($1, em."from") > $3
          OR word_similarity($1, em."fromName") > $3
          OR word_similarity($1, em.snippet) > $3
          OR em.subject ILIKE '%' || $1 || '%'
          OR em."from" ILIKE '%' || $1 || '%'
          OR em."fromName" ILIKE '%' || $1 || '%'
          OR em.snippet ILIKE '%' || $1 || '%'
        )
      ORDER BY relevance_score DESC, em.date DESC
      LIMIT $4 OFFSET $5
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM email_messages em
      WHERE
        em."emailAccountId" = ANY($1::text[])
        AND (
          -- Fuzzy similarity matching
          similarity(em.subject, $2) > $3
          OR similarity(em."from", $2) > $3
          OR similarity(em."fromName", $2) > $3
          OR similarity(em.snippet, $2) > $3
          -- Word-level similarity
          OR word_similarity($2, em.subject) > $3
          OR word_similarity($2, em."from") > $3
          OR word_similarity($2, em."fromName") > $3
          OR word_similarity($2, em.snippet) > $3
          -- Substring matching
          OR em.subject ILIKE '%' || $2 || '%'
          OR em."from" ILIKE '%' || $2 || '%'
          OR em."fromName" ILIKE '%' || $2 || '%'
          OR em.snippet ILIKE '%' || $2 || '%'
        )
    `;

    // Execute both queries in parallel
    const [results, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<
        Array<PrismaEmailMessage & { relevance_score: number }>
      >(searchQuery, query, accountIds, similarityThreshold, limit, offset),
      this.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        countQuery,
        accountIds,
        query,
        similarityThreshold,
      ),
    ]);

    // Fetch full message details with relations for each result
    const messagesWithDetails = await Promise.all(
      results.map(async (result) => {
        const fullMessage = await this.prisma.emailMessage.findUnique({
          where: { id: result.id },
          include: {
            body: true,
            attachments: true,
          },
        });

        if (!fullMessage) {
          throw new Error(`Email message ${result.id} not found`);
        }

        return {
          ...fullMessage,
          relevanceScore: Number(result.relevance_score),
        } as PrismaEmailMessage & { relevanceScore: number };
      }),
    );

    const total = Number(countResult[0]?.total || 0);

    this.logger.log(
      `Fuzzy search found ${total} results, returning ${results.length} with limit ${limit}`,
    );

    return {
      results: messagesWithDetails,
      total,
    };
  }
}
