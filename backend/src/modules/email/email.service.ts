import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Email, Mailbox } from "./entities";
import { MOCK_EMAILS, MOCK_MAILBOXES } from "./data";
import { EmailListQueryDto } from "./dto";
import { ImapService } from "./services/imap.service";
import { OAuth2TokenService } from "./services/oauth2-token.service";
import { ModifyEmailFlagsDto } from "./dto/modify.dto";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private emails: Email[] = MOCK_EMAILS;
  private mailboxes: Mailbox[] = MOCK_MAILBOXES;

  constructor(
    private readonly imapService: ImapService,
    private readonly oauth2TokenService: OAuth2TokenService,
  ) {}

  /**
   * Get all mailboxes for the current user
   */
  findAllMailboxes(): Mailbox[] {
    return this.mailboxes.sort((a, b) => a.order - b.order);
  }

  /**
   * Get a specific mailbox by ID
   */
  findMailboxById(id: string): Mailbox {
    const mailbox = this.mailboxes.find((m) => m.id === id);
    if (!mailbox) {
      throw new NotFoundException(`Mailbox with ID "${id}" not found`);
    }
    return mailbox;
  }

  /**
   * Get emails by mailbox ID with pagination and filtering
   * If OAuth2 token is available, fetch from IMAP, otherwise use mock data
   */
  async findEmailsByMailbox(
    mailboxId: string,
    query: EmailListQueryDto,
    userId?: string,
  ): Promise<{
    emails: Email[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    // Verify mailbox exists
    this.findMailboxById(mailboxId);

    // Check if user has OAuth2 tokens for IMAP access
    if (userId) {
      const tokens = await this.oauth2TokenService.getUserTokens(userId);
      if (tokens && tokens.length > 0) {
        try {
          // Try to fetch from IMAP
          return await this.fetchEmailsFromImap(
            userId,
            mailboxId,
            query,
            tokens,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to fetch emails from IMAP: ${error.message}, falling back to mock data`,
          );
        }
      }
    }

    // Fallback to mock data
    return this.fetchEmailsFromMock(mailboxId, query);
  }

  /**
   * Fetch emails from IMAP server
   */
  private async fetchEmailsFromImap(
    userId: string,
    mailboxId: string,
    query: EmailListQueryDto,
    tokens: any[],
  ) {
    // Use the first available token
    const token = tokens[0];

    // Map mailbox ID to IMAP folder
    const imapFolder = this.mapMailboxToImapFolder(mailboxId);

    const page = query.page || 1;
    const limit = query.limit || 50;

    // Fetch emails from IMAP
    const imapMessages = await this.imapService.fetchEmails(
      {
        userId,
        provider: token.provider,
        email: token.email,
      },
      imapFolder,
      limit,
    );

    // Convert IMAP messages to Email entities
    const emails: Email[] = imapMessages.map((msg) => ({
      id: msg.id,
      mailboxId,
      from: {
        name: msg.from.split("<")[0].trim(),
        email: msg.from.match(/<(.+)>/)?.[1] || msg.from,
        avatar: "",
      },
      to: msg.to.map((t) => ({
        name: t.split("<")[0].trim(),
        email: t.match(/<(.+)>/)?.[1] || t,
      })),
      subject: msg.subject,
      preview: msg.body.substring(0, 150),
      body: msg.body,
      timestamp: msg.date.toISOString(),
      isRead: false,
      isStarred: false,
      isImportant: false,
      hasAttachments: (msg.attachments?.length || 0) > 0,
      attachments: (msg.attachments || []).map((att, idx) => ({
        id: `${msg.id}-att-${idx}`,
        filename: att.filename,
        mimeType: att.contentType,
        size: att.size,
        url: "",
      })),
      labels: [],
    }));

    return {
      emails,
      page,
      limit,
      total: emails.length,
      totalPages: Math.ceil(emails.length / limit),
    };
  }

  /**
   * Fetch emails from mock data
   */
  private fetchEmailsFromMock(mailboxId: string, query: EmailListQueryDto) {
    // Filter emails by mailbox
    let filteredEmails = this.emails.filter((e) => e.mailboxId === mailboxId);

    // Apply additional filters
    if (query.unreadOnly) {
      filteredEmails = filteredEmails.filter((e) => !e.isRead);
    }

    if (query.starredOnly) {
      filteredEmails = filteredEmails.filter((e) => e.isStarred);
    }

    // Sort by timestamp (newest first)
    filteredEmails.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedEmails = filteredEmails.slice(startIndex, endIndex);
    const total = filteredEmails.length;
    const totalPages = Math.ceil(total / limit);

    return {
      emails: paginatedEmails,
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Map mailbox ID to IMAP folder name
   */
  private mapMailboxToImapFolder(mailboxId: string): string {
    const mapping: Record<string, string> = {
      inbox: "INBOX",
      sent: "Sent",
      drafts: "Drafts",
      trash: "Trash",
      spam: "Spam",
      starred: "Starred",
    };
    return mapping[mailboxId] || "INBOX";
  }

  /**
   * Get a specific email by ID
   */
  findEmailById(id: string): Email {
    const email = this.emails.find((e) => e.id === id);
    if (!email) {
      throw new NotFoundException(`Email with ID "${id}" not found`);
    }
    return email;
  }

  /**
   * Mark email as read
   */
  markAsRead(id: string): Email {
    const email = this.findEmailById(id);
    email.isRead = true;

    // Update mailbox unread count
    this.updateMailboxUnreadCount(email.mailboxId);

    return email;
  }

  /**
   * Mark email as unread
   */
  markAsUnread(id: string): Email {
    const email = this.findEmailById(id);
    email.isRead = false;

    // Update mailbox unread count
    this.updateMailboxUnreadCount(email.mailboxId);

    return email;
  }

  /**
   * Toggle star status
   */
  toggleStar(id: string): Email {
    const email = this.findEmailById(id);
    email.isStarred = !email.isStarred;

    // If starring, add to starred mailbox
    if (email.isStarred && email.mailboxId !== "starred") {
      // Create a copy in starred mailbox
      const starredEmail = { ...email, mailboxId: "starred" };
      this.emails.push(starredEmail);
    } else if (!email.isStarred) {
      // Remove from starred mailbox
      this.emails = this.emails.filter(
        (e) => !(e.id === id && e.mailboxId === "starred"),
      );
    }

    this.updateMailboxCounts();

    return email;
  }

  /**
   * Delete email (move to trash)
   */
  deleteEmail(id: string): void {
    const email = this.findEmailById(id);

    if (email.mailboxId === "trash") {
      // Permanently delete if already in trash
      this.emails = this.emails.filter((e) => e.id !== id);
    } else {
      // Move to trash
      email.mailboxId = "trash";
      this.updateMailboxCounts();
    }
  }

  /**
   * Search emails by subject, body, or sender
   */
  searchEmails(query: string): Email[] {
    const lowerQuery = query.toLowerCase();

    return this.emails.filter(
      (email) =>
        email.subject.toLowerCase().includes(lowerQuery) ||
        email.body.toLowerCase().includes(lowerQuery) ||
        email.from.name.toLowerCase().includes(lowerQuery) ||
        email.from.email.toLowerCase().includes(lowerQuery) ||
        email.preview.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Update mailbox unread count
   */
  private updateMailboxUnreadCount(mailboxId: string): void {
    const mailbox = this.mailboxes.find((m) => m.id === mailboxId);
    if (mailbox) {
      const unreadCount = this.emails.filter(
        (e) => e.mailboxId === mailboxId && !e.isRead,
      ).length;
      mailbox.unreadCount = unreadCount;
    }
  }

  /**
   * Update all mailbox counts
   */
  private updateMailboxCounts(): void {
    this.mailboxes.forEach((mailbox) => {
      const mailboxEmails = this.emails.filter(
        (e) => e.mailboxId === mailbox.id,
      );
      mailbox.totalCount = mailboxEmails.length;
      mailbox.unreadCount = mailboxEmails.filter((e) => !e.isRead).length;
    });
  }
  async sendEmail(userId: string, userEmail: string, dto: any) {
    // Here you would integrate with an SMTP service to send the email.
    const result = await this.imapService.sendEmail(
      {
        userId,
        email: userEmail,
        provider: "GOOGLE",
      },
      dto,
    );
    return result;
  }
  async getEmailDetail(userId: string, userEmail: string, id: number) {
    return this.imapService.getMailDetail(
      {
        userId,
        email: userEmail,
        provider: "GOOGLE",
      },
      id,
    );
  }
  async replyEmail(userId: string, userEmail: string, original: any, dto: any) {
    const result = await this.imapService.replyEmail(
      {
        userId,
        email: userEmail,
        provider: "GOOGLE",
      },
      original,
      dto,
    );
    return result;
  }
  async modifyEmail(
    userId: string,
    userEmail: string,
    id: number,
    dto: ModifyEmailFlagsDto,
  ) {
    await this.imapService.modifyEmailFlags(
      {
        userId,
        email: userEmail,
        provider: "GOOGLE",
      },
      id,
      dto,
    );
    return {
      success: true,
    };
  }
  async getAllEmails(userId: string, userEmail: string) {
    return this.imapService.fetchEmails({
      userId,
      email: userEmail,
      provider: "GOOGLE",
    });
  }
}
