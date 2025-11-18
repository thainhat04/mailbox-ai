import { Injectable, NotFoundException } from "@nestjs/common";
import { Email, Mailbox } from "./entities";
import { MOCK_EMAILS, MOCK_MAILBOXES } from "./data";
import { EmailListQueryDto } from "./dto";

@Injectable()
export class EmailService {
  private emails: Email[] = MOCK_EMAILS;
  private mailboxes: Mailbox[] = MOCK_MAILBOXES;

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
   */
  findEmailsByMailbox(
    mailboxId: string,
    query: EmailListQueryDto,
  ): {
    emails: Email[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } {
    // Verify mailbox exists
    this.findMailboxById(mailboxId);

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
}
