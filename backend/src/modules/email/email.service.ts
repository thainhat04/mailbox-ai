import {
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Email, Mailbox } from "./entities";
import { MOCK_EMAILS, MOCK_MAILBOXES } from "./data";

import { ModifyEmailDto } from "./dto/modify.dto";

import { OAuth2TokenService } from "./services/oauth2-token.service";
import { EmailListQueryDto, MailboxType } from "./dto";
import { ImapService } from "./services/imap.service";

// Custom error classes for IMAP operations
export class ImapConnectionError extends Error {
  constructor(
    message: string,
    public provider: string,
  ) {
    super(message);
    this.name = "ImapConnectionError";
  }
}

export class ImapAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImapAuthenticationError";
  }
}

export class ImapTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImapTimeoutError";
  }
}
import { MailProvider } from "@prisma/client";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private emails: Email[] = MOCK_EMAILS;
  private mailboxes: Mailbox[] = MOCK_MAILBOXES;

  // Cache for mailbox counts (30 seconds TTL)
  private mailboxCountsCache = new Map<string, { data: Mailbox[]; timestamp: number }>();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  constructor(
    private readonly imapService: ImapService,
    private readonly oauth2TokenService: OAuth2TokenService,
  ) {}

  /**
   * Retry an IMAP operation with exponential backoff
   */
  private async retryImapOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    // Retry mechanism disabled as requested
    return operation();
  }

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

    // Fall back to mock mailboxes
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
          console.log("Fetching emails from IMAP for mailbox:", mailboxId);
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
   * Fetch emails from IMAP server with proper pagination
   */
  private async fetchEmailsFromImap(
    userId: string,
    mailboxId: string,
    query: EmailListQueryDto,
    tokens: any[],
  ) {
    const startTime = Date.now();
    const page = query.page || 1;
    const limit = query.limit || 50;

    // Use the first available token
    const token = tokens[0];

    // Map mailbox ID to IMAP folder based on provider
    const imapFolder = this.mapMailboxToImapFolder(mailboxId, token.provider);

    const config = {
      userId,
      provider: token.provider,
      email: token.email,
    };

    this.logger.log(
      `Fetching emails from ${mailboxId} -> IMAP folder: "${imapFolder}" (provider: ${token.provider})`,
    );

    // Get total message count for proper pagination
    const totalMessages = await this.imapService.getMessageCount(
      config,
      imapFolder,
    );

    this.logger.log(
      `Found ${totalMessages} messages in "${imapFolder}" folder`,
    );

    if (totalMessages === 0) {
      return {
        emails: [],
        page,
        limit,
        total: 0,
        totalPages: 0,
      };
    }

    this.logger.log(
      `Fetching emails from ${mailboxId} (page ${page}, limit ${limit}) for user ${userId}`,
    );

    // Fetch emails from IMAP with retry logic and pagination
    const imapMessages = await this.retryImapOperation(() =>
      this.imapService.fetchEmails(config, imapFolder, limit, page),
    );

    this.logger.log(
      `Fetched ${imapMessages.length} emails in ${Date.now() - startTime}ms`,
    );

    // Convert IMAP messages to Email entities
    const emails: Email[] = imapMessages.map((msg) => {
      const fromName = msg.from.split("<")[0].trim();
      const fromEmail = msg.from.match(/<(.+)>/)?.[1] || msg.from;

      return {
        id: msg.id,
        mailboxId,
        from: {
          name: fromName,
          email: fromEmail,
          avatar: this.generateAvatar(fromName, fromEmail),
        },
        to: msg.to.map((t) => ({
          name: t.split("<")[0].trim(),
          email: t.match(/<(.+)>/)?.[1] || t,
        })),
        subject: msg.subject,
        preview: this.stripHtmlTags(msg.body).substring(0, 150),
        body: msg.body,
        timestamp: msg.date.toISOString(),
        isRead: false,
        isStarred: false,
        isImportant: false,
        attachments: (msg.attachments || []).map((att, idx) => ({
          id: `${msg.id}-att-${idx}`,
          filename: att.filename,
          mimeType: att.contentType,
          size: att.size,
          url: `/api/attachments/${msg.id}-att-${idx}`,
        })),
        labels: [],
        // Threading fields
        messageId: msg.messageId,
        inReplyTo: msg.inReplyTo,
        references: msg.references,
      };
    });

    // For proper threading, fetch related emails from both Inbox and Sent folders
    // This ensures conversations are complete across different mailboxes
    let allEmailsForThreading = [...emails];
    const shouldFetchRelatedEmails = [
      "inbox",
      "sent",
      "important",
      "starred",
      "archive",
    ].includes(mailboxId);

    if (shouldFetchRelatedEmails) {
      try {
        // Determine which folders to fetch for cross-mailbox threading
        const foldersToFetch: Array<{
          name: string;
          folder: string;
          mailboxId: string;
        }> = [];
        if (mailboxId !== "inbox") {
          foldersToFetch.push({
            name: "inbox",
            folder: this.mapMailboxToImapFolder("inbox", token.provider),
            mailboxId: "inbox",
          });
        }
        if (mailboxId !== "sent") {
          foldersToFetch.push({
            name: "sent",
            folder: this.mapMailboxToImapFolder("sent", token.provider),
            mailboxId: "sent",
          });
        }
        // Also fetch from archive to get full thread history even if some messages are archived
        // But only for inbox/important/starred, not for sent (usually sent is self-contained or just needs inbox)
        if (
          mailboxId === "inbox" ||
          mailboxId === "important" ||
          mailboxId === "starred"
        ) {
          foldersToFetch.push({
            name: "archive",
            folder: this.mapMailboxToImapFolder("archive", token.provider),
            mailboxId: "archive",
          });
        }

        if (foldersToFetch.length > 0) {
          this.logger.log(
            `Fetching related emails from ${foldersToFetch.map((f) => f.name).join(" and ")} for threading...`,
          );

          // Collect message IDs, references, and subjects from current mailbox
          const currentMessageIds = new Set<string>();
          const currentReferences = new Set<string>();
          const currentSubjects = new Set<string>();

          emails.forEach((email) => {
            if (email.messageId) currentMessageIds.add(email.messageId);
            if (email.inReplyTo) currentReferences.add(email.inReplyTo);
            if (email.references) {
              email.references.forEach((ref) => currentReferences.add(ref));
            }
            currentSubjects.add(this.normalizeSubject(email.subject));
          });

          // Fetch and filter related emails from other mailboxes
          // Use fetchEmailHeaders for performance
          const fetchPromises = foldersToFetch.map(async (fetchFolder) => {
            try {
              // Use fetchEmailHeaders instead of fetchEmails
              // Fetch all headers to find related messages (since we don't know which page they are on)
              // But limit to recent messages to avoid scanning entire mailbox?
              // For now, let's fetch headers for the whole mailbox or a large range if possible,
              // but fetchEmailHeaders currently fetches *all* headers if we don't specify range.
              // Let's assume fetchEmailHeaders fetches all headers which is fast enough.
              const messages = await this.retryImapOperation(
                () => this.imapService.fetchEmailHeaders(config, fetchFolder.folder),
                1, // Don't retry too much for related folders
              );

              return messages
                .filter((msg) => {
                  const normalizedSubject = this.normalizeSubject(msg.subject);

                  // Include if referenced by current mailbox via Message-ID
                  if (msg.messageId && currentReferences.has(msg.messageId)) {
                    return true;
                  }
                  // Or if current mailbox emails reply to this message
                  if (
                    msg.messageId &&
                    emails.some((e) => e.inReplyTo === msg.messageId)
                  ) {
                    return true;
                  }
                  // Or if this message replies to current mailbox email
                  if (msg.inReplyTo && currentMessageIds.has(msg.inReplyTo)) {
                    return true;
                  }
                  // Fallback: match by normalized subject
                  if (currentSubjects.has(normalizedSubject)) {
                    return true;
                  }
                  return false;
                })
                .map((msg) => {
                  const fromName = msg.from.split("<")[0].trim();
                  const fromEmail = msg.from.match(/<(.+)>/)?.[1] || msg.from;
                  const flags = msg.flags || [];

                  return {
                    id: msg.id,
                    mailboxId: fetchFolder.mailboxId,
                    from: {
                      name: fromName,
                      email: fromEmail,
                      avatar: this.generateAvatar(fromName, fromEmail),
                    },
                    to: msg.to.map((t) => ({
                      name: t.split("<")[0].trim(),
                      email: t.match(/<(.+)>/)?.[1] || t,
                    })),
                    subject: msg.subject,
                    preview: "", // Headers don't have body
                    body: "", // Headers don't have body
                    timestamp: msg.date.toISOString(),
                    isRead: flags.includes("\\Seen"),
                    isStarred: flags.includes("\\Flagged"),
                    isImportant: false,
                    attachments: [],
                    labels: [],
                    messageId: msg.messageId,
                    inReplyTo: msg.inReplyTo,
                    references: msg.references,
                  };
                });
            } catch (error) {
              this.logger.warn(
                `Failed to fetch related emails from ${fetchFolder.name}: ${error.message}`,
              );
              return [];
            }
          });

          const relatedResults = await Promise.all(fetchPromises);
          const relatedMessages = relatedResults.flat();

          this.logger.log(
            `Found ${relatedMessages.length} related emails for threading`,
          );
          allEmailsForThreading.push(...relatedMessages);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch related emails for threading: ${error.message}`,
        );
        // Continue with inbox emails only
      }
    }

    // De-duplicate emails by Message-ID to handle cross-folder fetching (e.g. Inbox vs Archive)
    const uniqueEmails = new Map<string, Email>();
    allEmailsForThreading.forEach((email) => {
      if (email.messageId) {
        if (!uniqueEmails.has(email.messageId)) {
          uniqueEmails.set(email.messageId, email);
        } else {
          // If we already have this email, prefer the one from the current mailbox
          const existing = uniqueEmails.get(email.messageId)!;
          if (
            existing.mailboxId !== mailboxId &&
            email.mailboxId === mailboxId
          ) {
            uniqueEmails.set(email.messageId, email);
          }
        }
      } else {
        // Fallback for emails without Message-ID (use internal ID)
        uniqueEmails.set(email.id, email);
      }
    });

    // Use de-duplicated list for threading
    const dedupedEmails = Array.from(uniqueEmails.values());

    // Sort all emails by date (newest first)
    dedupedEmails.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Group emails into threads
    const threads = this.groupEmailsIntoThreads(dedupedEmails);

    // For archive, return all threads (archive contains all emails)
    // For other mailboxes, filter to only return threads that have at least one email from the requested mailbox
    let filteredThreads: Email[];

    if (mailboxId === "archive") {
      // Archive shows all threads MINUS those in Inbox
      // Identify Inbox message IDs from allEmailsForThreading where mailboxId === 'inbox'
      const inboxEmails = allEmailsForThreading.filter(
        (e) => e.mailboxId === "inbox",
      );
      const inboxMessageIds = new Set(
        inboxEmails.map((e) => e.messageId).filter(Boolean),
      );

      filteredThreads = threads.filter((thread) => {
        // Check if representative is in Inbox
        if (thread.messageId && inboxMessageIds.has(thread.messageId))
          return false;

        // Check if any email in thread is in Inbox
        if (thread.threadEmails && thread.threadEmails.length > 0) {
          const threadEmailIds = new Set(thread.threadEmails);
          const emailsInThread = allEmailsForThreading.filter((e) =>
            threadEmailIds.has(e.id),
          );

          return !emailsInThread.some(
            (e) => e.messageId && inboxMessageIds.has(e.messageId),
          );
        }

        return true;
      });
    } else {
      filteredThreads = threads.filter((thread) => {
        // If this is the main email, check its mailbox
        if (thread.mailboxId === mailboxId) {
          return true;
        }
        // If this is a thread, check if any email in thread is from this mailbox
        if (thread.threadEmails && thread.threadEmails.length > 0) {
          return allEmailsForThreading
            .filter((e) => thread.threadEmails!.includes(e.id))
            .some((e) => e.mailboxId === mailboxId);
        }
        return false;
      });
    }

    this.logger.log(
      `Grouped ${allEmailsForThreading.length} emails into ${filteredThreads.length} threads for mailbox ${mailboxId}`,
    );

    // Log thread details
    const threadsWithCount = filteredThreads.filter(
      (t) => t.threadCount && t.threadCount > 1,
    );
    if (threadsWithCount.length > 0) {
      this.logger.log(
        `Found ${threadsWithCount.length} conversations with multiple emails`,
      );
    }

    return {
      emails: filteredThreads,
      page,
      limit,
      total: totalMessages, // Return total messages count from IMAP for correct pagination
      totalPages: Math.ceil(totalMessages / limit),
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
   * Map mailbox ID to IMAP folder name based on provider
   * Different providers use different folder naming conventions
   */
  private mapMailboxToImapFolder(
    mailboxId: string,
    provider?: MailProvider,
  ): string {
    // Gmail-specific folder mapping
    if (provider === MailProvider.GOOGLE) {
      const gmailMapping: Record<string, string> = {
        inbox: "INBOX",
        sent: "[Gmail]/Sent Mail",
        drafts: "[Gmail]/Drafts",
        trash: "[Gmail]/Trash",
        spam: "[Gmail]/Spam",
        starred: "[Gmail]/Starred",
        important: "[Gmail]/Important",
        archive: "[Gmail]/All Mail",
      };
      return gmailMapping[mailboxId.toLowerCase()] || "INBOX";
    }

    // Microsoft/Outlook folder mapping
    if (provider === MailProvider.MICROSOFT) {
      const outlookMapping: Record<string, string> = {
        inbox: "INBOX",
        sent: "Sent Items",
        drafts: "Drafts",
        trash: "Deleted Items",
        spam: "Junk Email",
        starred: "Flagged",
        important: "Important",
        archive: "Archive",
      };
      return outlookMapping[mailboxId.toLowerCase()] || "INBOX";
    }

    // Generic/fallback mapping
    const mapping: Record<string, string> = {
      inbox: "INBOX",
      sent: "Sent",
      drafts: "Drafts",
      trash: "Trash",
      spam: "Spam",
      starred: "Starred",
      important: "Important",
      archive: "Archive",
    };
    return mapping[mailboxId.toLowerCase()] || "INBOX";
  }

  private normalizeSubject(subject: string): string {
    if (!subject) return "";
    let normalized = subject;
    let prevNormalized = "";
    while (prevNormalized !== normalized) {
      prevNormalized = normalized;
      normalized = normalized.replace(
        /^(re|fwd|fw|aw|sv|vs|r|wg|tr|odp|ynt|İlt):\s*/gi,
        "",
      );
    }
    return normalized.trim();
  }

  /**
   * Get a specific email by ID from IMAP
   */
  async findEmailById(
    id: string,
    userId: string,
    mailboxId?: string,
  ): Promise<Email> {
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    if (!tokens || tokens.length === 0) {
      throw new NotFoundException("No IMAP tokens found for user");
    }

    try {
      const email = await this.fetchSingleEmailFromImap(
        userId,
        id,
        tokens[0],
        mailboxId,
      );
      return email;
    } catch (error) {
      this.logger.error(
        `Failed to fetch email ${id} from IMAP: ${error.message}`,
      );
      throw new NotFoundException(`Email with ID "${id}" not found`);
    }
  }

  /**
   * Fetch single email from IMAP server
   * If mailboxId is not provided, search through common folders
   */
  private async fetchSingleEmailFromImap(
    userId: string,
    emailId: string,
    token: any,
    mailboxId?: string,
  ): Promise<Email> {
    const config = {
      userId,
      provider: token.provider,
      email: token.email,
    };

    // If mailbox is specified, use it directly
    if (mailboxId) {
      const imapFolder = this.mapMailboxToImapFolder(mailboxId, token.provider);
      try {
        const imapMessage = await this.imapService.fetchEmailById(
          config,
          imapFolder,
          emailId,
        );
        return this.convertImapMessageToEmail(imapMessage, mailboxId);
      } catch (error) {
        this.logger.warn(
          `Email ${emailId} not found in ${mailboxId}: ${error.message}`,
        );
      }
    }

    // Otherwise, search through common folders
    const foldersToSearch = ["inbox", "sent", "drafts", "trash", "spam"];

    for (const folder of foldersToSearch) {
      // Skip the already checked mailbox if provided
      if (mailboxId && folder === mailboxId) continue;

      try {
        const imapFolder = this.mapMailboxToImapFolder(folder, token.provider);
        const imapMessage = await this.imapService.fetchEmailById(
          config,
          imapFolder,
          emailId,
        );
        return this.convertImapMessageToEmail(imapMessage, folder);
      } catch (error) {
        // Continue searching
      }
    }

    throw new NotFoundException(`Email ${emailId} not found in any folder`);
  }

  /**
   * Group emails into threads based on Message-ID, References, and Subject
   */
  private groupEmailsIntoThreads(emails: Email[]): Email[] {
    const messageIdMap = new Map<string, Email>();
    emails.forEach((email) => {
      if (email.messageId) {
        messageIdMap.set(email.messageId, email);
      }
    });

    // Helper function to find the root of a thread by following In-Reply-To chain
    const findThreadRoot = (
      email: Email,
      visited = new Set<string>(),
    ): string => {
      // Prevent infinite loops
      if (email.messageId && visited.has(email.messageId)) {
        return email.messageId;
      }

      if (email.messageId) {
        visited.add(email.messageId);
      }

      // If email has inReplyTo, try to find the parent
      if (email.inReplyTo) {
        const parent = messageIdMap.get(email.inReplyTo);
        if (parent) {
          // Recursively find root
          return findThreadRoot(parent, visited);
        }
        // Parent not in our set, use inReplyTo as root
        return email.inReplyTo;
      }

      // If email has references, use the first one as root
      if (email.references && email.references.length > 0) {
        return email.references[0];
      }

      // This is a root message
      if (email.messageId) {
        return email.messageId;
      }

      // Fallback to subject
      return `subject:${this.normalizeSubject(email.subject)}`;
    };

    // Build threads using Message-ID and References
    const threadRoots = new Map<string, Email[]>(); // threadId -> emails in thread

    emails.forEach((email) => {
      const threadId = findThreadRoot(email);

      if (!threadRoots.has(threadId)) {
        threadRoots.set(threadId, []);
      }

      threadRoots.get(threadId)!.push(email);

      // Log for debugging
      this.logger.debug(
        `Email "${email.subject}" (msgId: ${email.messageId?.substring(0, 20)}...) threaded with root ID: ${threadId.substring(0, 20)}...`,
      );
    });

    // Convert threads to array of representative emails
    const threadedEmails: Email[] = [];

    threadRoots.forEach((threadEmails, threadId) => {
      if (threadEmails.length === 1) {
        // Single email, not a thread
        threadedEmails.push(threadEmails[0]);
      } else {
        // Multiple emails in thread - use the most recent one as representative
        const sortedThread = threadEmails.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        const representative = {
          ...sortedThread[0],
          // Add thread metadata
          threadCount: threadEmails.length,
          threadEmails: sortedThread.map((e) => e.id),
        };

        threadedEmails.push(representative as Email);

        this.logger.debug(
          `Thread "${threadId}" has ${threadEmails.length} emails`,
        );
      }
    });

    // Sort threads by most recent email timestamp
    return threadedEmails.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Generate avatar URL from email address using UI Avatars service
   */
  private generateAvatar(name: string, email: string): string {
    const displayName = name || email.split("@")[0];
    const encodedName = encodeURIComponent(displayName);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=random&size=128`;
  }

  /**
   * Strip HTML tags from text for preview
   */
  private stripHtmlTags(html: string): string {
    if (!html) return "";

    let text = html;

    // Remove style tags and their content
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Remove script tags and their content
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

    // Remove head tag and its content
    text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

    // Remove comments
    text = text.replace(/<!--[\s\S]*?-->/g, "");

    // Add space before closing tags to preserve word boundaries
    text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|td|th|tr)>/gi, " ");

    // Add line break for br tags
    text = text.replace(/<br\s*\/?>/gi, "\n");

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, "");

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
      .replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );

    // Clean up whitespace
    text = text
      .replace(/\n\s*\n/g, "\n") // Remove multiple newlines
      .replace(/[ \t]+/g, " ") // Replace multiple spaces/tabs with single space
      .replace(/^\s+|\s+$/gm, ""); // Trim each line

    return text.trim();
  }

  /**
   * Convert IMAP message to Email entity
   */
  private convertImapMessageToEmail(
    imapMessage: any,
    mailboxId: string,
  ): Email {
    const fromName = imapMessage.from.split("<")[0].trim();
    const fromEmail = imapMessage.from.match(/<(.+)>/)?.[1] || imapMessage.from;

    return {
      id: imapMessage.id,
      mailboxId,
      from: {
        name: fromName,
        email: fromEmail,
        avatar: this.generateAvatar(fromName, fromEmail),
      },
      to: imapMessage.to.map((t) => ({
        name: t.split("<")[0].trim(),
        email: t.match(/<(.+)>/)?.[1] || t,
      })),
      subject: imapMessage.subject,
      preview: this.stripHtmlTags(imapMessage.body).substring(0, 150),
      body: imapMessage.body,
      timestamp: imapMessage.date.toISOString(),
      isRead: false,
      isStarred: false,
      isImportant: false,
      attachments: (imapMessage.attachments || []).map((att, idx) => ({
        id: `${imapMessage.id}-att-${idx}`,
        filename: att.filename,
        mimeType: att.contentType,
        size: att.size,
        url: `/api/attachments/${imapMessage.id}-att-${idx}`,
      })),
      labels: [],
    };
  }

  /**
   * Stream email attachment
   */
  async streamAttachment(
    userId: string,
    attachmentId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; metadata: any }> {
    // Parse attachmentId format: {emailId}-att-{partIndex}
    // Example: "123-att-0" means email 123, attachment index 0
    const parts = attachmentId.split("-att-");
    if (parts.length !== 2) {
      throw new NotFoundException(
        "Invalid attachment ID format. Expected format: emailId-att-index",
      );
    }

    const emailId = parts[0];
    const partIndex = parseInt(parts[1]);

    if (isNaN(partIndex)) {
      throw new NotFoundException("Invalid attachment index");
    }

    // Get OAuth2 tokens
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    if (!tokens || tokens.length === 0) {
      throw new NotFoundException("No IMAP tokens found for user");
    }
    const token = tokens[0];

    const config = {
      userId,
      provider: token.provider,
      email: token.email,
    };

    const foldersToSearch = ["inbox", "sent", "drafts", "trash", "spam"];

    for (const folder of foldersToSearch) {
      try {
        const imapFolder = this.mapMailboxToImapFolder(folder, token.provider);
        
        // Calculate the actual part number from attachments
        // IMAP parts typically start from 2 for attachments (1 is usually body)
        const partNumber = `${partIndex + 2}`;

        this.logger.log(
          `Fetching attachment ${attachmentId} from ${folder}, part ${partNumber}`,
        );

        return await this.imapService.fetchAttachment(
          config,
          imapFolder,
          emailId,
          partNumber,
        );
      } catch (error) {
        // Continue searching in next folder
        this.logger.debug(
          `Attachment not found in ${folder}: ${error.message}`,
        );
        continue;
      }
    }

    throw new NotFoundException(
      `Attachment ${attachmentId} not found in any folder`,
    );
  }

  /**
   * Mark email as read
   */
  async markAsRead(userId: string, id: string): Promise<Email> {
    const email = await this.findEmailById(id, userId);
    email.isRead = true;

    // Update mailbox unread count
    this.updateMailboxUnreadCount(email.mailboxId);

    return email;
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(userId: string, id: string): Promise<Email> {
    const email = await this.findEmailById(id, userId);
    email.isRead = false;

    // Update mailbox unread count
    this.updateMailboxUnreadCount(email.mailboxId);

    return email;
  }

  /**
   * Toggle star status
   */
  async toggleStar(userId: string, id: string): Promise<Email> {
    const email = await this.findEmailById(id, userId);
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
  async deleteEmail(userId: string, id: string): Promise<void> {
    const email = await this.findEmailById(id, userId);

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
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    const token = tokens.find((t) => t.email === userEmail);
    if (!token) {
      throw new NotFoundException(`No account found for email ${userEmail}`);
    }

    // Here you would integrate with an SMTP service to send the email.
    const result = await this.imapService.sendEmail(
      {
        userId,
        email: userEmail,
        provider: token.provider,
      },
      dto,
    );
    return result;
  }
  async getThreadEmails(
    userId: string,
    userEmail: string,
    threadId: string,
    mailbox: string = "INBOX",
  ) {
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    const token = tokens.find((t) => t.email === userEmail);
    if (!token) {
      throw new NotFoundException(`No account found for email ${userEmail}`);
    }

    // Since we don't have a direct "get thread" IMAP command, we need to:
    // 1. Fetch the specific email if threadId looks like an ID
    // 2. Or search for emails with the same Message-ID / References
    // For now, let's assume threadId is the ID of one of the emails in the thread.
    // We'll fetch that email, then search for related emails.

    // This is a simplified implementation. A robust one would search across mailboxes.
    const config = {
      userId,
      provider: token.provider,
      email: token.email,
    };

    const imapFolder = this.mapMailboxToImapFolder(mailbox, token.provider);
    
    try {
      // 1. Fetch the requested email to get its metadata
      const rootEmailMsg = await this.imapService.fetchEmailById(config, imapFolder, threadId);
      if (!rootEmailMsg) return [];
      
      const rootEmail = this.convertImapMessageToEmail(rootEmailMsg, mailbox);
      
      // 2. Identify folders to search (Inbox, Sent, Archive)
      const foldersToSearch = [
        { name: "inbox", folder: this.mapMailboxToImapFolder("inbox", token.provider), mailboxId: "inbox" },
        { name: "sent", folder: this.mapMailboxToImapFolder("sent", token.provider), mailboxId: "sent" },
        { name: "archive", folder: this.mapMailboxToImapFolder("archive", token.provider), mailboxId: "archive" },
      ];

      // Remove duplicates (e.g. if mailbox is inbox, don't add it again)
      const uniqueFolders = foldersToSearch.filter((f, index, self) => 
        index === self.findIndex((t) => t.folder === f.folder)
      );

      // 3. Fetch headers from all folders to find related messages
      const messageId = rootEmail.messageId;
      const references = new Set(rootEmail.references || []);
      if (rootEmail.inReplyTo) references.add(rootEmail.inReplyTo);
      const normalizedSubject = this.normalizeSubject(rootEmail.subject);

      const relatedEmailPromises = uniqueFolders.map(async (folderInfo) => {
        try {
           // Fetch headers
           const headers = await this.retryImapOperation(() => 
             this.imapService.fetchEmailHeaders(config, folderInfo.folder)
           , 1);

           // Filter for related emails
           return headers.filter(h => {
             // Match by Message-ID (if referenced)
             if (h.messageId && references.has(h.messageId)) return true;
             // Match by References (if it references root)
             if (messageId && h.references && Array.isArray(h.references) && h.references.includes(messageId)) return true;
             if (messageId && h.inReplyTo === messageId) return true;
             // Match by Subject
             if (this.normalizeSubject(h.subject || "") === normalizedSubject) return true;
             // Match if it is the root email itself (but in this folder)
             if (h.messageId === messageId) return true;
             
             return false;
           }).map(h => ({ ...h, mailboxId: folderInfo.mailboxId, folderName: folderInfo.folder }));
        } catch (e) {
          return [];
        }
      });

      const relatedHeaders = (await Promise.all(relatedEmailPromises)).flat();

      // 4. De-duplicate headers by Message-ID
      const uniqueHeaders = new Map<string, any>();
      relatedHeaders.forEach(h => {
        if (h.messageId) {
            if (!uniqueHeaders.has(h.messageId)) {
                uniqueHeaders.set(h.messageId, h);
            }
        } else {
            uniqueHeaders.set(h.id, h);
        }
      });

      // 5. Fetch full bodies for the identified emails
      const fullEmails: Email[] = [];
      
      // We already have the root email
      fullEmails.push(rootEmail);
      if (rootEmail.messageId) {
        uniqueHeaders.delete(rootEmail.messageId); // Don't fetch root again if possible
      }

      const fetchBodyPromises = Array.from(uniqueHeaders.values()).map(async (header) => {
         try {
            const fullMsg = await this.imapService.fetchEmailById(config, header.folderName, header.id);
            return this.convertImapMessageToEmail(fullMsg, header.mailboxId);
         } catch (e) {
            return null;
         }
      });

      const fetchedBodies = await Promise.all(fetchBodyPromises);
      fetchedBodies.forEach(e => {
        if (e) fullEmails.push(e);
      });

      // 6. Sort by date
      return fullEmails.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    } catch (error) {
      this.logger.warn(`Failed to fetch thread ${threadId}: ${error.message}`);
      return [];
    }
  }

  async getEmailDetail(
    userId: string,
    userEmail: string,
    id: number,
    mailbox: string = "INBOX",
  ) {
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    const token = tokens.find((t) => t.email === userEmail);
    if (!token) {
      throw new NotFoundException(`No account found for email ${userEmail}`);
    }

    return this.imapService.getMailDetail(
      {
        userId,
        email: userEmail,
        provider: token.provider,
      },
      id,
      mailbox,
    );
  }
  async replyEmail(userId: string, userEmail: string, original: any, dto: any) {
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    const token = tokens.find((t) => t.email === userEmail);
    if (!token) {
      throw new NotFoundException(`No account found for email ${userEmail}`);
    }

    const result = await this.imapService.replyEmail(
      {
        userId,
        email: userEmail,
        provider: token.provider,
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
    dto: ModifyEmailDto,
  ) {
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    const token = tokens.find((t) => t.email === userEmail);
    if (!token) {
      throw new NotFoundException(`No account found for email ${userEmail}`);
    }

    await this.imapService.modifyEmailFlags(
      {
        userId,
        email: userEmail,
        provider: token.provider,
      },
      id,
      dto.flags,
      dto.mailBox || "INBOX",
    );
    return {
      success: true,
    };
  }
  async getAllEmails(userId: string, userEmail: string) {
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    const token = tokens.find((t) => t.email === userEmail);
    if (!token) {
      throw new NotFoundException(`No account found for email ${userEmail}`);
    }

    return this.imapService.fetchEmails(
      {
        userId,
        email: userEmail,
        provider: token.provider,
      },
      this.mapMailboxToImapFolder("sent", token.provider),
    );
  }

  /**
   * Map IMAP mailboxes to Mailbox DTO format
   */
  mapImapMailboxesToDto(imapMailboxes: any[]): Mailbox[] {
    const mailboxMap: Map<string, Mailbox> = new Map();

    // Common folder mapping with friendly names and icons
    const folderMapping: Record<
      string,
      {
        id: string;
        name: string;
        icon: string;
        type: MailboxType;
        order: number;
      }
    > = {
      INBOX: {
        id: "inbox",
        name: "Inbox",
        icon: "📥",
        type: MailboxType.INBOX,
        order: 1,
      },
      "[Gmail]/Sent Mail": {
        id: "sent",
        name: "Sent",
        icon: "📤",
        type: MailboxType.SENT,
        order: 2,
      },
      "Sent Items": {
        id: "sent",
        name: "Sent",
        icon: "📤",
        type: MailboxType.SENT,
        order: 2,
      },
      "[Gmail]/Drafts": {
        id: "drafts",
        name: "Drafts",
        icon: "📝",
        type: MailboxType.DRAFTS,
        order: 3,
      },
      Drafts: {
        id: "drafts",
        name: "Drafts",
        icon: "📝",
        type: MailboxType.DRAFTS,
        order: 3,
      },
      "[Gmail]/Trash": {
        id: "trash",
        name: "Trash",
        icon: "🗑️",
        type: MailboxType.TRASH,
        order: 6,
      },
      "Deleted Items": {
        id: "trash",
        name: "Trash",
        icon: "🗑️",
        type: MailboxType.TRASH,
        order: 6,
      },
      "[Gmail]/Spam": {
        id: "spam",
        name: "Spam",
        icon: "⚠️",
        type: MailboxType.CUSTOM,
        order: 7,
      },
      "Junk Email": {
        id: "spam",
        name: "Spam",
        icon: "⚠️",
        type: MailboxType.CUSTOM,
        order: 7,
      },
      "[Gmail]/Starred": {
        id: "starred",
        name: "Starred",
        icon: "⭐",
        type: MailboxType.STARRED,
        order: 4,
      },
      "[Gmail]/Important": {
        id: "important",
        name: "Important",
        icon: "❗",
        type: MailboxType.CUSTOM,
        order: 5,
      },
      Archive: {
        id: "archive",
        name: "Archive",
        icon: "📦",
        type: MailboxType.ARCHIVE,
        order: 8,
      },
    };

    // Process IMAP mailboxes
    imapMailboxes.forEach((box) => {
      const mapping = folderMapping[box.name];

      if (mapping) {
        // Use mapped folder
        if (!mailboxMap.has(mapping.id)) {
          mailboxMap.set(mapping.id, {
            id: mapping.id,
            name: mapping.name,
            type: mapping.type,
            icon: mapping.icon,
            unreadCount: 0,
            totalCount: 0,
            order: mapping.order,
          });
        }
      } else {
        // Create custom folder
        const id = box.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        mailboxMap.set(id, {
          id,
          name: box.name,
          type: MailboxType.CUSTOM,
          icon: "📁",
          unreadCount: 0,
          totalCount: 0,
          order: 100 + mailboxMap.size,
        });
      }
    });

    // Convert to array and sort
    return Array.from(mailboxMap.values()).sort((a, b) => a.order - b.order);
  }



  /**
   * Get hardcoded mailboxes with email counts from IMAP
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

    // If user is authenticated, try to get threaded email counts from IMAP
    if (userId) {
      try {
        const tokens = await this.oauth2TokenService.getUserTokens(userId);
        if (tokens && tokens.length > 0) {
          const token = tokens[0];
          const config = {
            userId,
            provider: token.provider,
            email: token.email,
          };

          // Cache for fetched emails to avoid refetching for cross-mailbox threading
          const emailCache = new Map<string, Email[]>();

          // Helper function to fetch and map emails
          const fetchAndMapEmails = async (
            mailboxId: string,
          ): Promise<Email[]> => {
            if (emailCache.has(mailboxId)) {
              return emailCache.get(mailboxId)!;
            }

            const imapFolder = this.mapMailboxToImapFolder(
              mailboxId,
              token.provider,
            );
            try {
              // Use fetchEmailHeaders for performance
              const messages = await this.retryImapOperation(() =>
                this.imapService.fetchEmailHeaders(config, imapFolder),
              );

              const mappedEmails: Email[] = messages.map((msg) => {
                const fromName = msg.from.split("<")[0].trim();
                const fromEmail = msg.from.match(/<(.+)>/)?.[1] || msg.from;
                const flags = msg.flags || [];

                return {
                  id: msg.id,
                  mailboxId: mailboxId,
                  from: {
                    name: fromName,
                    email: fromEmail,
                    avatar: this.generateAvatar(fromName, fromEmail),
                  },
                  to: msg.to.map((t) => ({
                    name: t.split("<")[0].trim(),
                    email: t.match(/<(.+)>/)?.[1] || t,
                  })),
                  subject: msg.subject,
                  preview: "",
                  body: "",
                  timestamp: msg.date.toISOString(),
                  isRead: flags.includes("\\Seen"),
                  isStarred: flags.includes("\\Flagged"),
                  isImportant: false,
                  attachments: (msg.attachments || []).map((att, idx) => ({
                    id: `${msg.id}-att-${idx}`,
                    filename: att.filename,
                    mimeType: att.contentType,
                    size: att.size,
                    url: `/api/attachments/${msg.id}-att-${idx}`,
                  })),
                  labels: [],
                  messageId: msg.messageId,
                  inReplyTo: msg.inReplyTo,
                  references: msg.references,
                };
              });

              emailCache.set(mailboxId, mappedEmails);
              return mappedEmails;
            } catch (error) {
              this.logger.warn(
                `Failed to fetch emails for ${mailboxId}: ${error.message}`,
              );
              return [];
            }
          };

          // Calculate threaded counts for each mailbox
          for (const mailbox of hardcodedMailboxes) {
            try {
              // Fetch emails from this mailbox
              let allEmailsForThreading = await fetchAndMapEmails(mailbox.id);

              // For mailboxes that need cross-mailbox threading, fetch related emails
              const shouldFetchRelatedEmails = [
                "inbox",
                "sent",
                "important",
                "starred",
              ].includes(mailbox.id);

              if (
                shouldFetchRelatedEmails &&
                allEmailsForThreading.length > 0
              ) {
                try {
                  // Fetch from both inbox and sent for complete threading
                  const foldersToFetch: string[] = [];
                  if (mailbox.id !== "inbox") foldersToFetch.push("inbox");
                  if (mailbox.id !== "sent") foldersToFetch.push("sent");

                  if (foldersToFetch.length > 0) {
                    // Collect message IDs, references, and subjects from current mailbox
                    const currentMessageIds = new Set<string>();
                    const currentReferences = new Set<string>();
                    const currentSubjects = new Set<string>();

                    allEmailsForThreading.forEach((email) => {
                      if (email.messageId)
                        currentMessageIds.add(email.messageId);
                      if (email.inReplyTo)
                        currentReferences.add(email.inReplyTo);
                      if (email.references) {
                        email.references.forEach((ref) =>
                          currentReferences.add(ref),
                        );
                      }
                      currentSubjects.add(this.normalizeSubject(email.subject));
                    });

                    // Fetch and filter related emails
                    for (const fetchMailboxId of foldersToFetch) {
                      const relatedEmails =
                        await fetchAndMapEmails(fetchMailboxId);

                      const filteredRelated = relatedEmails.filter((msg) => {
                        const normalizedSubject = this.normalizeSubject(
                          msg.subject,
                        );

                        // Include if referenced by current mailbox via Message-ID
                        if (
                          msg.messageId &&
                          currentReferences.has(msg.messageId)
                        ) {
                          return true;
                        }
                        // Or if current mailbox emails reply to this message
                        if (
                          msg.messageId &&
                          allEmailsForThreading.some(
                            (e) => e.inReplyTo === msg.messageId,
                          )
                        ) {
                          return true;
                        }
                        // Or if this message replies to current mailbox email
                        if (
                          msg.inReplyTo &&
                          currentMessageIds.has(msg.inReplyTo)
                        ) {
                          return true;
                        }
                        // Fallback: match by normalized subject
                        if (currentSubjects.has(normalizedSubject)) {
                          return true;
                        }
                        return false;
                      });

                      allEmailsForThreading.push(...filteredRelated);
                    }
                  }
                } catch (error) {
                  this.logger.warn(
                    `Failed to fetch related emails for ${mailbox.id}: ${error.message}`,
                  );
                }
              }

              // Group into threads and count
              if (allEmailsForThreading.length > 0) {
                const threadedEmails = this.groupEmailsIntoThreads(
                  allEmailsForThreading,
                );

                // For archive, count all threads (archive contains all emails)
                // For other mailboxes with cross-threading, count threads where any email in the thread belongs to this mailbox
                let filteredThreads: Email[];

                if (mailbox.id === "archive") {
                  // Archive shows all threads MINUS those in Inbox
                  const inboxEmails = emailCache.get("inbox") || [];
                  const inboxMessageIds = new Set(
                    inboxEmails.map((e) => e.messageId).filter(Boolean),
                  );

                  filteredThreads = threadedEmails.filter((thread) => {
                    // Check if representative is in Inbox
                    if (
                      thread.messageId &&
                      inboxMessageIds.has(thread.messageId)
                    )
                      return false;

                    // Check if any email in thread is in Inbox
                    if (thread.threadEmails && thread.threadEmails.length > 0) {
                      const threadEmailIds = new Set(thread.threadEmails);
                      const emailsInThread = allEmailsForThreading.filter((e) =>
                        threadEmailIds.has(e.id),
                      );

                      return !emailsInThread.some(
                        (e) => e.messageId && inboxMessageIds.has(e.messageId),
                      );
                    }

                    return true;
                  });
                } else if (shouldFetchRelatedEmails) {
                  // For mailboxes with cross-threading (inbox, sent, important, starred),
                  // count threads where the representative email belongs to this mailbox
                  filteredThreads = threadedEmails.filter((thread) => {
                    // If the representative itself is in the mailbox, keep it
                    if (thread.mailboxId === mailbox.id) return true;

                    // If it's a thread, check if any of its emails are in the mailbox
                    if (thread.threadEmails && thread.threadEmails.length > 0) {
                      return allEmailsForThreading
                        .filter((e) => thread.threadEmails!.includes(e.id))
                        .some((e) => e.mailboxId === mailbox.id);
                    }
                    return false;
                  });
                } else {
                  // For other mailboxes, just use all threaded emails
                  filteredThreads = threadedEmails;
                }

                mailbox.totalCount = filteredThreads.length;
                mailbox.unreadCount = filteredThreads.filter(
                  (e) => !e.isRead,
                ).length;

                this.logger.log(
                  `${mailbox.name}: ${filteredThreads.length} threads (from ${allEmailsForThreading.length} total emails)`,
                );
              }
            } catch (error) {
              this.logger.warn(
                `Failed to calculate threaded count for ${mailbox.id}: ${error.message}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch mailbox counts from IMAP: ${error.message}`,
        );
      }
    }

    return hardcodedMailboxes;
  }

  /**
   * OPTIMIZED with caching: Get hardcoded mailboxes with fast IMAP counts
   * Uses cache with 30s TTL to avoid hitting IMAP on every request
   */
  async getCachedFastMailboxCounts(userId?: string): Promise<Mailbox[]> {
    const cacheKey = userId || 'anonymous';

    // Check cache first
    const cached = this.mailboxCountsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`Returning cached mailbox counts for ${cacheKey}`);
      return cached.data;
    }

    // Cache miss or expired - fetch fresh data
    this.logger.debug(`Cache miss for ${cacheKey}, fetching fresh counts`);
    const mailboxes = await this.getHardcodedMailboxesWithCounts(userId);

    // Update cache
    this.mailboxCountsCache.set(cacheKey, {
      data: mailboxes,
      timestamp: Date.now(),
    });

    return mailboxes;
  }

  /**
   * OPTIMIZED: Get hardcoded mailboxes with fast IMAP counts (no email fetching)
   * This method uses IMAP openBox to get counts without downloading emails
   * Much faster than getHardcodedMailboxesWithCounts() which fetches all emails
   */
  async getFastMailboxCounts(userId?: string): Promise<Mailbox[]> {
    this.logger.log(`getFastMailboxCounts called for userId: ${userId}`);

    // Define hardcoded mailboxes
    const hardcodedMailboxes: Mailbox[] = [
      { id: "inbox", name: "Inbox", type: MailboxType.INBOX, icon: "📥", unreadCount: 0, totalCount: 0, order: 1 },
      { id: "sent", name: "Sent", type: MailboxType.SENT, icon: "📤", unreadCount: 0, totalCount: 0, order: 2 },
      { id: "drafts", name: "Drafts", type: MailboxType.DRAFTS, icon: "📝", unreadCount: 0, totalCount: 0, order: 3 },
      { id: "starred", name: "Starred", type: MailboxType.STARRED, icon: "⭐", unreadCount: 0, totalCount: 0, order: 4 },
      { id: "important", name: "Important", type: MailboxType.CUSTOM, icon: "❗", unreadCount: 0, totalCount: 0, order: 5 },
      { id: "trash", name: "Trash", type: MailboxType.TRASH, icon: "🗑️", unreadCount: 0, totalCount: 0, order: 6 },
      { id: "spam", name: "Spam", type: MailboxType.CUSTOM, icon: "⚠️", unreadCount: 0, totalCount: 0, order: 7 },
      { id: "archive", name: "Archive", type: MailboxType.ARCHIVE, icon: "📦", unreadCount: 0, totalCount: 0, order: 8 },
    ];

    // If user is authenticated, get fast counts from IMAP
    if (!userId) {
      this.logger.log('No userId provided, returning mailboxes with zero counts');
      return hardcodedMailboxes;
    }

    if (userId) {
      try {
        const tokens = await this.oauth2TokenService.getUserTokens(userId);
        if (tokens && tokens.length > 0) {
          const token = tokens[0];
          const config = {
            userId,
            provider: token.provider,
            email: token.email,
          };

          // Map our mailbox IDs to IMAP folder names
          const mailboxIdToImapFolder = new Map<string, string>();
          for (const mailbox of hardcodedMailboxes) {
            const imapFolder = this.mapMailboxToImapFolder(mailbox.id, token.provider);
            mailboxIdToImapFolder.set(mailbox.id, imapFolder);
            this.logger.log(`Mapping: ${mailbox.id} -> ${imapFolder}`);
          }

          // Get all IMAP folder names
          const imapFolders = Array.from(mailboxIdToImapFolder.values());
          this.logger.log(`Fetching statuses for ${imapFolders.length} folders: ${imapFolders.join(', ')}`);

          // Fetch statuses in parallel (MUCH faster than sequential)
          const statusMap = await this.retryImapOperation(() =>
            this.imapService.getMultipleMailboxStatuses(config, imapFolders)
          );

          this.logger.log(`Received statusMap with ${statusMap.size} entries`);

          // Update mailbox counts
          for (const mailbox of hardcodedMailboxes) {
            const imapFolder = mailboxIdToImapFolder.get(mailbox.id);
            if (imapFolder && statusMap.has(imapFolder)) {
              const status = statusMap.get(imapFolder)!;
              mailbox.totalCount = status.total;
              mailbox.unreadCount = status.unseen;

              this.logger.log(`✓ ${mailbox.name}: ${status.total} total, ${status.unseen} unread`);
            } else {
              this.logger.warn(`✗ ${mailbox.name} (${imapFolder}): not found in statusMap`);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Failed to fetch fast mailbox counts from IMAP: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
        // Don't swallow the error silently - rethrow so controller can fallback
        throw error;
      }
    }

    return hardcodedMailboxes;
  }
  /**
   * List all available mailboxes/folders from IMAP server
   */
  async listAvailableMailboxes(userId: string): Promise<{
    success: boolean;
    message: string;
    mailboxes?: any[];
    provider?: string;
    email?: string;
  }> {
    try {
      const tokens = await this.oauth2TokenService.getUserTokens(userId);
      if (!tokens || tokens.length === 0) {
        return {
          success: false,
          message: "No OAuth2 tokens found",
        };
      }

      const token = tokens[0];
      const config = {
        userId,
        provider: token.provider,
        email: token.email,
      };

      const mailboxes = await this.imapService.listMailboxes(config);

      return {
        success: true,
        message: "Mailboxes retrieved successfully",
        mailboxes,
        provider: token.provider,
        email: token.email,
      };
    } catch (error) {
      this.logger.error(`Failed to list mailboxes: ${error.message}`);
      return {
        success: false,
        message: `Failed to list mailboxes: ${error.message}`,
      };
    }
  }

  /**
   * Test IMAP connection for the current user
   */
  async testImapConnection(userId: string): Promise<{
    success: boolean;
    message: string;
    email?: string;
    provider?: string;
    host?: string;
    port?: number;
    details?: string;
    testEmailCount?: number;
    testedAt?: string;
  }> {
    try {
      // Check if user has OAuth2 tokens
      const tokens = await this.oauth2TokenService.getUserTokens(userId);
      if (!tokens || tokens.length === 0) {
        return {
          success: false,
          message:
            "No OAuth2 tokens found. Please connect your email account first.",
        };
      }

      const token = tokens[0];
      const config = {
        userId,
        provider: token.provider,
        email: token.email,
      };

      // Try to fetch a few emails to verify the connection works
      let testEmailCount = 0;
      try {
        const testEmails = await this.imapService.fetchEmails(
          config,
          "INBOX",
          5,
        );
        testEmailCount = testEmails.length;
      } catch (fetchError) {
        this.logger.warn(`Failed to fetch test emails: ${fetchError.message}`);
      }

      // Disconnect
      await this.imapService.disconnect(config);

      return {
        success: true,
        message: "IMAP connection successful",
        email: token.email,
        provider: token.provider,
        host:
          token.provider === "GOOGLE"
            ? "imap.gmail.com"
            : "outlook.office365.com",
        port: 993,
        details: `Successfully connected to ${token.provider} IMAP server and fetched ${testEmailCount} test emails`,
        testEmailCount,
        testedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `IMAP connection test failed: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `IMAP connection failed: ${error.message}`,
        details: error.stack,
        testedAt: new Date().toISOString(),
      };
    }
  }
}
