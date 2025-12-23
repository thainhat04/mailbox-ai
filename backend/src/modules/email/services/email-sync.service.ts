import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../database/prisma.service";
import { MailProviderRegistry } from "../providers/provider.registry";
import { EmailMessageRepository } from "../repositories/email-message.repository";
import { OAuth2TokenService } from "./oauth2-token.service";
import { SyncConfig } from "../../../common/configs/sync.config";
import {
  retryWithBackoff,
  isTokenExpiredError,
} from "../../../common/utils/retry.util";

/**
 * Email Sync Service
 * Handles periodic email synchronization for all accounts using cron jobs
 */
@Injectable()
export class EmailSyncService {
  private readonly logger = new Logger(EmailSyncService.name);
  private readonly syncingAccounts = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: MailProviderRegistry,
    private readonly messageRepository: EmailMessageRepository,
  ) { }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncAllEmails(): Promise<void> {
    this.logger.log("[EMAILS] Starting scheduled email sync");

    try {
      const emailAccounts = await this.prisma.emailAccount.findMany({
        select: { id: true },
      });

      if (emailAccounts.length === 0) {
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const account of emailAccounts) {
        try {
          const result = await this.syncAccount(account.id);
          if (result.success) synced++;
        } catch (error) {
          this.logger.error(
            `[EMAILS] Failed for ${account.id}:`,
            error.message,
          );
          failed++;
        }
      }

      this.logger.log(
        `[EMAILS] Sync completed: ${synced} success, ${failed} failed`,
      );
    } catch (error) {
      this.logger.error("[EMAILS] Sync failed:", error);
    }
  }

  @Cron(CronExpression.EVERY_11_HOURS)
  async syncAllLabels(): Promise<void> {
    this.logger.log("[LABELS] Starting scheduled label sync");

    try {
      const emailAccounts = await this.prisma.emailAccount.findMany({
        select: { id: true },
      });

      if (emailAccounts.length === 0) {
        return;
      }

      let totalSynced = 0;
      let failed = 0;

      for (const account of emailAccounts) {
        try {
          const count = await this.syncLabels(account.id);
          totalSynced += count;
        } catch (error) {
          this.logger.error(
            `[LABELS] Failed for ${account.id}:`,
            error.message,
          );
          failed++;
        }
      }

      this.logger.log(
        `[LABELS] Sync completed: ${totalSynced} labels synced, ${failed} failed`,
      );
    } catch (error) {
      this.logger.error("[LABELS] Sync failed:", error);
    }
  }

  /**
   * Sync a single email account
   * Returns sync results with counts of messages added/deleted
   */
  async syncAccount(emailAccountId: string): Promise<{
    messagesAdded: number;
    messagesDeleted: number;
    success: boolean;
  }> {
    // Prevent duplicate syncs for the same account
    if (this.syncingAccounts.has(emailAccountId)) {
      this.logger.debug(
        `Account ${emailAccountId} is already syncing, skipping`,
      );
      return { messagesAdded: 0, messagesDeleted: 0, success: false };
    }

    this.syncingAccounts.add(emailAccountId);

    try {
      this.logger.log(`Starting sync for account: ${emailAccountId}`);

      // Get email account with account credentials
      const emailAccount = await this.prisma.emailAccount.findUnique({
        where: { id: emailAccountId },
        include: { account: true },
      });

      if (!emailAccount || !emailAccount.account) {
        throw new Error(
          `Email account ${emailAccountId} not found or has no credentials`,
        );
      }

      // Ensure token is valid and refresh if needed
      await this.ensureValidToken(emailAccountId);

      // Get provider
      const provider = await this.providerRegistry.getProvider(emailAccountId);

      // Check if provider supports syncing
      if (!provider.syncChanges) {
        throw new Error(`Provider does not support synchronization`);
      }

      // Get current sync state
      const syncStateData =
        await this.messageRepository.getSyncState(emailAccountId);

      // Convert SyncStateData to SyncState
      const syncState = syncStateData
        ? {
          historyId: syncStateData.lastSyncedHistoryId,
          deltaLink: syncStateData.lastDeltaLink,
        }
        : {};

      // Perform sync with retry logic
      const syncResult = await retryWithBackoff(
        () => provider.syncChanges!(syncState),
        {
          maxAttempts: SyncConfig.RETRY_ATTEMPTS,
          delayMs: SyncConfig.RETRY_DELAY_MS,
          exponentialBackoff: true,
          onRetry: (attempt, error) => {
            this.logger.warn(
              `Retry attempt ${attempt} for account ${emailAccountId}: ${error.message}`,
            );
          },
        },
        this.logger,
      );

      // Get user's columns to map emails to columnId based on Gmail labels
      const userColumns = await this.prisma.kanbanColumn.findMany({
        where: { userId: emailAccount.userId },
        select: { id: true, gmailLabelId: true, key: true },
      });

      // Store synced messages in database with columnId mapping
      const messagesAdded = await this.messageRepository.upsertMessages(
        emailAccountId,
        syncResult.messages.map((msg) =>
          this.convertToMessageData(msg, userColumns),
        ),
      );

      // Delete removed messages
      const messagesDeleted = await this.messageRepository.deleteMessages(
        emailAccountId,
        syncResult.deletedMessageIds,
      );

      // Update sync state - convert SyncState back to SyncStateData
      await this.messageRepository.updateSyncState(emailAccountId, {
        lastSyncedHistoryId: syncResult.newSyncState.historyId,
        lastDeltaLink: syncResult.newSyncState.deltaLink,
      });

      this.logger.log(
        `Sync completed for account ${emailAccountId}: +${messagesAdded} messages, -${messagesDeleted} messages`,
      );

      return {
        messagesAdded,
        messagesDeleted,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to sync account ${emailAccountId}:`, error);

      // Handle token expiration errors
      if (isTokenExpiredError(error)) {
        this.logger.warn(
          `Token expired for account ${emailAccountId}, will refresh on next sync`,
        );
      }

      return {
        messagesAdded: 0,
        messagesDeleted: 0,
        success: false,
      };
    } finally {
      this.syncingAccounts.delete(emailAccountId);
    }
  }

  /**
   * Ensure access token is valid, refresh if needed
   */
  private async ensureValidToken(emailAccountId: string): Promise<void> {
    const emailAccount = await this.prisma.emailAccount.findUnique({
      where: { id: emailAccountId },
      include: { account: true },
    });

    if (!emailAccount?.account) {
      throw new Error("Email account or credentials not found");
    }

    const account = emailAccount.account;

    // Check if token is expired or expiring soon
    const now = new Date();
    const expiresAt = account.expires_at;

    if (!expiresAt) {
      this.logger.warn(
        `Account ${emailAccountId} has no expiration date, assuming valid`,
      );
      return;
    }

    const bufferTime = SyncConfig.TOKEN_REFRESH_BUFFER_MS;
    const shouldRefresh = expiresAt.getTime() - now.getTime() < bufferTime;

    if (shouldRefresh) {
      this.logger.log(
        `Token for account ${emailAccountId} is expiring soon, refreshing...`,
      );

      try {
        // Get provider to refresh token
        const provider =
          await this.providerRegistry.getProvider(emailAccountId);

        if (!provider.refreshAccessToken) {
          throw new Error("Provider does not support token refresh");
        }

        const newCredentials = await provider.refreshAccessToken();

        // Update credentials in database
        await this.prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: newCredentials.accessToken,
            expires_at: newCredentials.expiresAt,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Token refreshed successfully for account ${emailAccountId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to refresh token for account ${emailAccountId}:`,
          error,
        );
        throw error;
      }
    }
  }

  /**
   * Manually trigger sync for all accounts of a specific user
   */
  async syncUserAccounts(userId: string): Promise<{
    total: number;
    synced: number;
    failed: number;
  }> {
    this.logger.log(`Manually syncing accounts for user: ${userId}`);

    const emailAccounts = await this.prisma.emailAccount.findMany({
      where: { userId },
      select: { id: true },
    });

    if (emailAccounts.length === 0) {
      return { total: 0, synced: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      emailAccounts.map((acc) => this.syncAccount(acc.id)),
    );

    const synced = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    const failed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success),
    ).length;

    return {
      total: emailAccounts.length,
      synced,
      failed,
    };
  }

  /**
   * Perform initial sync for a newly added account
   */
  async performInitialSync(emailAccountId: string): Promise<void> {
    this.logger.log(`Performing initial sync for account: ${emailAccountId}`);
    await this.syncAccount(emailAccountId);
  }

  /**
   * Sync labels from provider to database
   */
  async syncLabels(emailAccountId: string): Promise<number> {
    this.logger.log(`Syncing labels for account: ${emailAccountId}`);

    try {
      // Ensure token is valid and refresh if needed
      await this.ensureValidToken(emailAccountId);

      // Get provider
      const provider = await this.providerRegistry.getProvider(emailAccountId);

      // Fetch labels from provider API with retry logic
      const labels = await retryWithBackoff(
        async () => {
          try {
            return await provider.listLabels();
          } catch (error) {
            // If 401, force refresh token and retry
            if (isTokenExpiredError(error)) {
              this.logger.warn(
                `Token expired during API call, forcing refresh...`,
              );
              await this.forceRefreshToken(emailAccountId);
              // Re-initialize provider with new token
              const refreshedProvider =
                await this.providerRegistry.getProvider(emailAccountId);
              return await refreshedProvider.listLabels();
            }
            throw error;
          }
        },
        {
          maxAttempts: 2, // Only retry once after refresh
          delayMs: 1000,
          exponentialBackoff: false,
        },
        this.logger,
      );

      // Upsert labels to database
      let syncedCount = 0;
      for (const label of labels) {
        await this.prisma.label.upsert({
          where: {
            emailAccountId_labelId: {
              emailAccountId,
              labelId: label.id,
            },
          },
          create: {
            emailAccountId,
            labelId: label.id,
            name: label.name,
            type: label.type,
            color: label.color,
            messageListVisibility: label.messageListVisibility,
            labelListVisibility: label.labelListVisibility,
          },
          update: {
            name: label.name,
            type: label.type,
            color: label.color,
            messageListVisibility: label.messageListVisibility,
            labelListVisibility: label.labelListVisibility,
            updatedAt: new Date(),
          },
        });
        syncedCount++;
      }

      this.logger.log(
        `Synced ${syncedCount} labels for account ${emailAccountId}`,
      );
      return syncedCount;
    } catch (error) {
      this.logger.error(
        `Failed to sync labels for account ${emailAccountId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Force refresh token (used when API returns 401)
   */
  private async forceRefreshToken(emailAccountId: string): Promise<void> {
    const emailAccount = await this.prisma.emailAccount.findUnique({
      where: { id: emailAccountId },
      include: { account: true },
    });

    if (!emailAccount?.account) {
      throw new Error("Email account or credentials not found");
    }

    const account = emailAccount.account;
    const provider = await this.providerRegistry.getProvider(emailAccountId);

    if (!provider.refreshAccessToken) {
      throw new Error("Provider does not support token refresh");
    }

    this.logger.log(`Force refreshing token for account ${emailAccountId}`);
    const newCredentials = await provider.refreshAccessToken();

    // Update credentials in database
    await this.prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: newCredentials.accessToken,
        expires_at: newCredentials.expiresAt,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Token force refreshed for account ${emailAccountId}`);
  }

  /**
   * Sync labels for all accounts of a user
   */
  async syncLabelsForUser(userId: string): Promise<number> {
    this.logger.log(`Syncing labels for user: ${userId}`);

    const emailAccounts = await this.prisma.emailAccount.findMany({
      where: { userId },
      select: { id: true },
    });

    let totalSynced = 0;
    for (const account of emailAccounts) {
      const count = await this.syncLabels(account.id);
      totalSynced += count;
    }

    return totalSynced;
  }

  /**
   * Convert EmailMessage to MessageData for repository
   * Maps Gmail labels to kanbanColumnId
   */
  private convertToMessageData(
    message: any,
    userColumns: Array<{
      id: string;
      gmailLabelId: string | null;
      key: string | null;
    }>,
  ): any {
    // Map Gmail labels to kanbanColumnId
    const emailLabels = message.labels || [];
    let kanbanColumnId: string | null = null;

    // Try to find matching column by Gmail label ID
    for (const column of userColumns) {
      if (column.gmailLabelId && emailLabels.includes(column.gmailLabelId)) {
        kanbanColumnId = column.id;
        break;
      }
    }

    // If no match found, use INBOX column (system protected)
    if (!kanbanColumnId) {
      const inboxColumn = userColumns.find((col) => col.key === "INBOX");
      if (inboxColumn) {
        kanbanColumnId = inboxColumn.id;
      }
    }

    return {
      messageId: message.id,
      threadId: message.threadId,
      from: message.from.email,
      fromName: message.from.name,
      to: message.to.map((addr: any) => addr.email),
      cc: message.cc?.map((addr: any) => addr.email) || [],
      bcc: message.bcc?.map((addr: any) => addr.email) || [],
      replyTo: message.replyTo,
      subject: message.subject,
      snippet: message.snippet,
      labels: message.labels || [],
      date: message.date,
      isRead: message.isRead,
      isStarred: message.isStarred,
      hasAttachments: message.hasAttachments,
      inReplyTo: message.inReplyTo,
      references: message.references || [],
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
      kanbanColumnId,
      attachments: message.attachments?.map((att: any) => ({
        providerId: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        contentId: att.contentId,
        isInline: att.isInline,
      })),
    };
  }
}
