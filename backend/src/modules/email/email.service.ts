import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { Email, Mailbox } from "./entities";
import { ModifyEmailDto } from "./dto/modify.dto";
import { OAuth2TokenService } from "./services/oauth2-token.service";
import { EmailListQueryDto, MailboxType } from "./dto";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly oauth2TokenService: OAuth2TokenService,
  ) { }

  /**
   * Get a specific mailbox by ID
   */
  findMailboxById(id: string): Mailbox {
    // List of valid hardcoded mailbox IDs
    const validMailboxIds = [
      "inbox",
      "sent",
      "drafts",
      "starred",
      "important",
      "trash",
      "spam",
      "archive",
    ];

    // Check if it's a valid hardcoded mailbox
    if (validMailboxIds.includes(id)) {
      // Return a basic mailbox object (counts will be filled when needed)
      return {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        type: MailboxType.CUSTOM,
        unreadCount: 0,
        totalCount: 0,
        order: 0,
      };
    }

    throw new NotFoundException(`Mailbox with ID "${id}" not found`);
  }

  /**
   * Get emails by mailbox ID with pagination and filtering
   * Note: IMAP functionality has been removed
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

    // Return empty result - IMAP functionality removed
    const page = query.page || 1;
    const limit = query.limit || 50;

    return {
      emails: [],
      page,
      limit,
      total: 0,
      totalPages: 0,
    };
  }

  /**
   * Get a specific email by ID
   * Note: IMAP functionality has been removed
   */
  async findEmailById(
    id: string,
    userId: string,
    mailboxId?: string,
  ): Promise<Email> {
    throw new NotFoundException("Email functionality requires IMAP which has been removed");
  }

  /**
   * Mark email as read
   * Note: IMAP functionality has been removed
   */
  async markAsRead(id: string): Promise<Email> {
    throw new NotFoundException("Mark as read functionality requires IMAP which has been removed");
  }

  /**
   * Mark email as unread
   * Note: IMAP functionality has been removed
   */
  async markAsUnread(id: string): Promise<Email> {
    throw new NotFoundException("Mark as unread functionality requires IMAP which has been removed");
  }

  /**
   * Toggle star status
   * Note: IMAP functionality has been removed
   */
  async toggleStar(id: string): Promise<Email> {
    throw new NotFoundException("Toggle star functionality requires IMAP which has been removed");
  }

  /**
   * Delete email
   * Note: IMAP functionality has been removed
   */
  async deleteEmail(id: string): Promise<void> {
    throw new NotFoundException("Delete email functionality requires IMAP which has been removed");
  }

  /**
   * Search emails
   * Note: IMAP functionality has been removed
   */
  searchEmails(query: string): Email[] {
    throw new NotFoundException("Search emails functionality requires IMAP which has been removed");
  }

  /**
   * Send email
   * Note: IMAP functionality has been removed
   */
  async sendEmail(userId: string, userEmail: string, dto: any) {
    throw new NotFoundException("Send email functionality requires IMAP which has been removed");
  }

  /**
   * Get email detail
   * Note: IMAP functionality has been removed
   */
  async getEmailDetail(
    userId: string,
    userEmail: string,
    id: number,
    mailbox: string = "INBOX",
  ) {
    throw new NotFoundException("Get email detail functionality requires IMAP which has been removed");
  }

  /**
   * Reply to email
   * Note: IMAP functionality has been removed
   */
  async replyEmail(userId: string, userEmail: string, original: any, dto: any) {
    throw new NotFoundException("Reply email functionality requires IMAP which has been removed");
  }

  /**
   * Modify email
   * Note: IMAP functionality has been removed
   */
  async modifyEmail(
    userId: string,
    userEmail: string,
    id: number,
    dto: ModifyEmailDto,
  ) {
    throw new NotFoundException("Modify email functionality requires IMAP which has been removed");
  }

  /**
   * Get all emails
   * Note: IMAP functionality has been removed
   */
  async getAllEmails(userId: string, userEmail: string) {
    throw new NotFoundException("Get all emails functionality requires IMAP which has been removed");
  }

  /**
   * Stream email attachment
   * Note: IMAP functionality has been removed
   */
  async streamAttachment(
    userId: string,
    attachmentId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; metadata: any }> {
    throw new NotFoundException("Stream attachment functionality requires IMAP which has been removed");
  }

  /**
   * Get hardcoded mailboxes with email counts
   * Note: IMAP functionality has been removed, returns empty counts
   */
  async getHardcodedMailboxesWithCounts(userId?: string): Promise<Mailbox[]> {
    // Define hardcoded mailboxes
    const hardcodedMailboxes: Mailbox[] = [
      {
        id: "inbox",
        name: "Inbox",
        type: MailboxType.INBOX,
        icon: "📥",
        unreadCount: 0,
        totalCount: 0,
        order: 1,
      },
      {
        id: "sent",
        name: "Sent",
        type: MailboxType.SENT,
        icon: "📤",
        unreadCount: 0,
        totalCount: 0,
        order: 2,
      },
      {
        id: "drafts",
        name: "Drafts",
        type: MailboxType.DRAFTS,
        icon: "📝",
        unreadCount: 0,
        totalCount: 0,
        order: 3,
      },
      {
        id: "starred",
        name: "Starred",
        type: MailboxType.STARRED,
        icon: "⭐",
        unreadCount: 0,
        totalCount: 0,
        order: 4,
      },
      {
        id: "important",
        name: "Important",
        type: MailboxType.CUSTOM,
        icon: "❗",
        unreadCount: 0,
        totalCount: 0,
        order: 5,
      },
      {
        id: "trash",
        name: "Trash",
        type: MailboxType.TRASH,
        icon: "🗑️",
        unreadCount: 0,
        totalCount: 0,
        order: 6,
      },
      {
        id: "spam",
        name: "Spam",
        type: MailboxType.CUSTOM,
        icon: "⚠️",
        unreadCount: 0,
        totalCount: 0,
        order: 7,
      },
      {
        id: "archive",
        name: "Archive",
        type: MailboxType.ARCHIVE,
        icon: "📦",
        unreadCount: 0,
        totalCount: 0,
        order: 8,
      },
    ];

    return hardcodedMailboxes;
  }
}
