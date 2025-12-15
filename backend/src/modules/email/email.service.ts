import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Email } from "./entities";
import { SendEmailDto } from "./dto/send-email.dto";
import { ReplyEmailDto } from "./dto/reply-emai.dto";
import { OAuth2TokenService } from "./services/oauth2-token.service";
import { MailProviderRegistry } from "./providers/provider.registry";
import { EmailMessageRepository } from "./repositories/email-message.repository";
import { EmailListQueryDto } from "./dto";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth2TokenService: OAuth2TokenService,
    private readonly providerRegistry: MailProviderRegistry,
    private readonly messageRepository: EmailMessageRepository,
  ) { }

  async getLabelById(labelId: string, userId: string): Promise<any> {
    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    // Get all email accounts for the user
    const emailAccounts = await this.prisma.emailAccount.findMany({
      where: { userId },
      select: { id: true },
    });

    if (emailAccounts.length === 0) {
      throw new NotFoundException("No email accounts found for user");
    }

    const accountIds = emailAccounts.map((acc) => acc.id);

    // Try to find the label in the database
    const label = await this.prisma.label.findFirst({
      where: {
        labelId,
        emailAccountId: {
          in: accountIds,
        },
      },
    });

    if (!label) {
      throw new NotFoundException(`Label with ID "${labelId}" not found`);
    }

    // Get email counts for this label
    const where: any = {
      emailAccountId: {
        in: accountIds,
      },
      labels: {
        has: labelId,
      },
    };

    const [unreadCount] = await Promise.all([
      this.prisma.emailMessage.count({ where: { ...where, isRead: false } }),
    ]);

    return {
      id: label.labelId,
      name: label.name,
      type: label.type,
      color: label.color,
      messageListVisibility: label.messageListVisibility || "show",
      labelListVisibility: label.labelListVisibility || "show",
      unreadCount,
    };
  }

  async findEmailsByLabel(
    labelId: string,
    query: EmailListQueryDto,
    userId: string,
  ): Promise<{
    emails: Email[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    // Get emails from database (synced via cron job)
    const where: any = {
      emailAccount: {
        userId,
      },
      labels: {
        has: labelId,
      },
    };

    // Filter by unread
    if (query.unreadOnly) {
      where.isRead = false;
    }

    // Filter by starred
    if (query.starredOnly) {
      where.isStarred = true;
    }

    const [messages, total] = await Promise.all([
      this.prisma.emailMessage.findMany({
        where,
        orderBy: {
          date: "desc",
        },
        skip,
        take: limit,
        include: {
          body: true,
          attachments: true,
        },
      }),
      this.prisma.emailMessage.count({ where }),
    ]);

    // Convert database messages to Email entities
    const emails = messages.map((msg) => this.convertToEmail(msg));

    return {
      emails,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findEmailById(
    id: string,
    userId: string,
  ): Promise<Email> {
    const message = await this.prisma.emailMessage.findFirst({
      where: {
        messageId: id,
        emailAccount: {
          userId,
        },
      },
      include: {
        body: true,
        attachments: true,
      },
    });

    if (!message) {
      throw new NotFoundException(`Email with ID "${id}" not found`);
    }

    return this.convertToEmail(message);
  }

  async markAsRead(id: string, userId: string): Promise<Email> {
    // Get provider for user
    const provider = await this.providerRegistry.getProviderForUser(userId);

    // Modify message via Gmail API
    const updated = await provider.modifyMessage(id, {
      removeLabelIds: ["UNREAD"],
    });

    return this.convertProviderMessageToEmail(updated);
  }

  async markAsUnread(id: string, userId: string): Promise<Email> {
    // Get provider for user
    const provider = await this.providerRegistry.getProviderForUser(userId);

    // Modify message via Gmail API
    const updated = await provider.modifyMessage(id, {
      addLabelIds: ["UNREAD"],
    });

    return this.convertProviderMessageToEmail(updated);
  }

  async toggleStar(id: string, userId: string): Promise<Email> {
    // Get provider for user
    const provider = await this.providerRegistry.getProviderForUser(userId);

    // Get current message to check star status
    const current = await provider.getMessage(id);
    const isStarred = current.labels.includes("STARRED");

    // Toggle star via Gmail API
    const updated = await provider.modifyMessage(id, {
      ...(isStarred
        ? { removeLabelIds: ["STARRED"] }
        : { addLabelIds: ["STARRED"] }),
    });

    return this.convertProviderMessageToEmail(updated);
  }

  async deleteEmail(id: string, userId: string): Promise<void> {
    // Get provider for user
    const provider = await this.providerRegistry.getProviderForUser(userId);

    // Move to trash via Gmail API
    await provider.trashMessage(id);

    // Mark as deleted in database (or move to trash label)
    await this.prisma.emailMessage.updateMany({
      where: {
        messageId: id,
        emailAccount: {
          userId,
        },
      },
      data: {
        labels: {
          push: "TRASH",
        },
      },
    });
  }

  async searchEmails(query: string, userId: string): Promise<Email[]> {
    const messages = await this.prisma.emailMessage.findMany({
      where: {
        emailAccount: {
          userId,
        },
        OR: [
          { subject: { contains: query, mode: "insensitive" } },
          { snippet: { contains: query, mode: "insensitive" } },
          { from: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: {
        date: "desc",
      },
      take: 50,
      include: {
        body: true,
        attachments: true,
      },
    });

    return messages.map((msg) => this.convertToEmail(msg));
  }

  /**
   * Fuzzy search emails using PostgreSQL pg_trgm for typo tolerance and partial matching
   * Supports Vietnamese characters and ranks results by relevance
   */
  async fuzzySearchEmails(
    query: string,
    userId: string,
    options?: {
      page?: number;
      limit?: number;
    },
  ): Promise<{
    emails: Array<Email & { relevanceScore: number }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    this.logger.log(
      `Fuzzy search request: query="${query}", userId=${userId}, page=${page}, limit=${limit}`,
    );

    // Call repository fuzzy search method
    const { results, total } = await this.messageRepository.fuzzySearchEmails(
      userId,
      query,
      {
        limit,
        offset,
      },
    );

    // Convert database messages to Email entities with relevance score
    const emails = results.map((msg) => ({
      ...this.convertToEmail(msg),
      relevanceScore: msg.relevanceScore,
    }));

    return {
      emails,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendEmail(userId: string, dto: SendEmailDto) {
    // Get provider for user
    const provider = await this.providerRegistry.getProviderForUser(userId);

    // Convert attachments from DTO format to provider format
    const attachments = dto.attachments?.map((att) => ({
      filename: att.filename,
      mimeType: att.mimeType,
      content: Buffer.from(att.contentBase64 || '', 'base64'),
    }));

    // Send email via Gmail API
    const sentMessage = await provider.sendEmail({
      to: [{ email: dto.to }],
      cc: dto.cc?.map((email) => ({ email })),
      bcc: dto.bcc?.map((email) => ({ email })),
      subject: dto.subject,
      bodyHtml: dto.html,
      bodyText: dto.text,
      attachments,
    });

    return {
      emailId: sentMessage.id,
      sendAt: sentMessage.date,
      labelId: sentMessage.labels,
    };
  }

  async replyEmail(userId: string, originalId: string, dto: ReplyEmailDto) {
    // Get provider for user
    const provider = await this.providerRegistry.getProviderForUser(userId);

    // Get original message
    const original = await provider.getMessage(originalId);

    // Send reply via Gmail API
    const sentMessage = await provider.sendEmail({
      to: [original.from],
      subject: `Re: ${original.subject || "(no subject)"}`,
      bodyHtml: dto.replyHtml,
      bodyText: dto.replyText,
      inReplyTo: original.id,
      references: original.references
        ? [...original.references, original.id]
        : [original.id],
    });

    return {
      emailId: sentMessage.id,
      sendAt: sentMessage.date,
      labelId: sentMessage.labels,
    };
  }


  async streamAttachment(
    userId: string,
    attachmentId: string,
  ): Promise<{ data: Buffer; metadata: any }> {
    // Parse attachmentId format: "messageId-providerId"
    // Note: providerId can contain dashes, so only split on first dash
    const dashIndex = attachmentId.indexOf("-");

    if (dashIndex === -1) {
      throw new BadRequestException("Invalid attachment ID format");
    }

    const messageId = attachmentId.substring(0, dashIndex);
    const providerId = attachmentId.substring(dashIndex + 1);

    if (!messageId || !providerId) {
      throw new BadRequestException("Invalid attachment ID format");
    }

    // Get email message to verify access and get attachment info
    const message = await this.prisma.emailMessage.findFirst({
      where: {
        messageId,
        emailAccount: {
          userId,
        },
      },
      include: {
        attachments: {
          where: {
            providerId,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException(`Email with ID "${messageId}" not found`);
    }

    if (!message.attachments || message.attachments.length === 0) {
      throw new NotFoundException(`Attachment "${providerId}" not found`);
    }

    const attachment = message.attachments[0];

    // Get provider for user
    const provider = await this.providerRegistry.getProviderForUser(userId);

    // Get attachment data via provider API
    const data = await provider.getAttachment(messageId, providerId);

    return {
      data,
      metadata: {
        messageId,
        providerId,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
      },
    };
  }

  async getLabels(userId: string): Promise<any[]> {
    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    // Get all email accounts for the user
    const emailAccounts = await this.prisma.emailAccount.findMany({
      where: { userId },
      select: { id: true },
    });

    if (emailAccounts.length === 0) {
      return [];
    }

    const accountIds = emailAccounts.map((acc) => acc.id);

    // Get labels
    const labels = await this.prisma.label.findMany({
      where: {
        emailAccountId: {
          in: accountIds,
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // Get email counts for each label
    const labelsWithCounts = await Promise.all(
      labels.map(async (label) => {
        const where: any = {
          emailAccountId: {
            in: accountIds,
          },
          labels: {
            has: label.labelId,
          },
        };

        const unreadCount = await this.prisma.emailMessage.count({
          where: { ...where, isRead: false },
        });

        return {
          id: label.labelId,
          name: label.name,
          type: label.type,
          color: label.color,
          messageListVisibility: label.messageListVisibility || "show",
          labelListVisibility: label.labelListVisibility || "show",
          unreadCount,
        };
      }),
    );

    return labelsWithCounts;
  }

  private convertProviderMessageToEmail(message: any): Email {
    return {
      id: message.id,
      from: {
        name: message.from.name || message.from.email,
        email: message.from.email,
      },
      to: message.to.map((addr: any) => ({
        name: addr.name || addr.email,
        email: addr.email,
      })),
      cc: message.cc?.map((addr: any) => ({
        name: addr.name || addr.email,
        email: addr.email,
      })),
      bcc: message.bcc?.map((addr: any) => ({
        name: addr.name || addr.email,
        email: addr.email,
      })),
      subject: message.subject || "(no subject)",
      body: message.bodyHtml || message.bodyText || "",
      preview: message.snippet || "",
      timestamp: message.date.toISOString(),
      isRead: message.isRead,
      isStarred: message.isStarred,
      isImportant: message.labels?.includes("IMPORTANT") || false,
      labelId: message.labels,
      attachments: message.attachments?.map((att: any) => ({
        id: att.id,
        filename: att.filename,
        size: att.size,
        mimeType: att.mimeType,
        url: `/api/v1/attachments/${message.id}-${att.id}`,
      })),
      labels: message.labels || [],
      messageId: message.id,
      inReplyTo: message.inReplyTo,
      references: message.references || [],
    };
  }

  private convertToEmail(message: any): Email {
    return {
      id: message.messageId,
      from: {
        name: message.fromName || message.from,
        email: message.from,
      },
      to: message.to.map((email: string) => ({
        name: email,
        email: email,
      })),
      cc: message.cc?.map((email: string) => ({
        name: email,
        email: email,
      })),
      bcc: message.bcc?.map((email: string) => ({
        name: email,
        email: email,
      })),
      subject: message.subject || "(no subject)",
      body: message.body?.bodyHtml || message.body?.bodyText || "",
      preview: message.snippet || "",
      timestamp: message.date.toISOString(),
      isRead: message.isRead,
      isStarred: message.isStarred,
      isImportant: message.labels?.includes("IMPORTANT") || false,
      labelId: message.labels,
      attachments: message.attachments?.map((att: any) => ({
        id: `${message.messageId}-${att.providerId}`,
        filename: att.filename,
        size: att.size,
        mimeType: att.mimeType,
        url: `/api/v1/attachments/${message.messageId}-${att.providerId}`,
      })) || [],
      labels: message.labels || [],
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      references: message.references || [],
    };
  }
}
