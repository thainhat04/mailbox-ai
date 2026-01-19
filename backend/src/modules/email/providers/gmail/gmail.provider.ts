import { Injectable, Logger } from "@nestjs/common";
import { MailProvider } from "../../types/mail-provider.types";
import { BaseMailProvider } from "../base-mail.provider";
import {
  ProviderCredentials,
  ListMessagesRequest,
  ListMessagesResponse,
  EmailMessage,
  EmailAddress,
  EmailAttachment,
  SendEmailRequest,
  ModifyEmailRequest,
  EmailThread,
  Label,
  WatchRequest,
  WatchResponse,
  SyncState,
} from "../../interfaces/mail-provider.interface";
import { GmailApiClient } from "./gmail-api.client";
import {
  OAuthReauthRequiredException,
  isPermanentOAuthError,
} from "../../../../common/exceptions";

/**
 * Gmail Provider Implementation
 * Uses Gmail API v1
 */
@Injectable()
export class GmailProvider extends BaseMailProvider {
  private readonly logger = new Logger(GmailProvider.name);
  private apiClient: GmailApiClient;

  constructor() {
    super(MailProvider.GOOGLE);
  }

  async initialize(credentials: ProviderCredentials): Promise<void> {
    // Call parent initialize which validates/refreshes credentials
    await super.initialize(credentials);

    // Now create API client with the validated/refreshed access token
    this.apiClient = new GmailApiClient(this.credentials.accessToken);

    this.logger.log("Gmail provider initialized");
  }

  async refreshAccessToken(): Promise<ProviderCredentials> {
    this.logger.log("Refreshing Gmail access token");

    if (!this.credentials.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: this.credentials.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = `Failed to refresh token: ${errorData.error || response.statusText}`;

        // Check if this is a permanent OAuth error requiring re-authentication
        if (isPermanentOAuthError(errorMessage)) {
          this.logger.error(
            `Permanent OAuth error detected: ${errorData.error}. User needs to re-authenticate.`,
          );
          throw new OAuthReauthRequiredException(
            "unknown", // Account ID will be set by the caller
            "google",
            `Your Google account access has been revoked. Please reconnect your account.`,
          );
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Calculate new expiration time
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      const newCredentials: ProviderCredentials = {
        accessToken: data.access_token,
        refreshToken: this.credentials.refreshToken, // Keep the same refresh token
        expiresAt,
      };

      // Update provider credentials
      this.credentials = newCredentials;

      // Update API client if it exists (it won't exist during initialization)
      if (this.apiClient) {
        this.apiClient.updateAccessToken(data.access_token);
      }

      this.logger.log("Gmail access token refreshed successfully");
      return newCredentials;
    } catch (error) {
      this.logger.error("Failed to refresh Gmail token", error);
      throw error;
    }
  }

  // ----------------- Message Operations -----------------

  async listMessages(
    request: ListMessagesRequest,
  ): Promise<ListMessagesResponse> {
    await this.ensureValidToken();
    this.logger.debug(
      `Listing messages with request: ${JSON.stringify(request)}`,
    );

    const params: any = {
      maxResults: request.maxResults || 50,
      pageToken: request.pageToken,
      labelIds: request.labelIds,
      q: request.query,
      includeSpamTrash: request.includeSpam,
    };

    const response = await this.apiClient.listMessages(params);

    return {
      messages: response.messages || [],
      nextPageToken: response.nextPageToken,
      resultSizeEstimate: response.resultSizeEstimate || 0,
    };
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    await this.ensureValidToken();
    this.logger.debug(`Getting message: ${messageId}`);

    const gmailMessage = await this.apiClient.getMessage(messageId, "full");
    return this.parseGmailMessage(gmailMessage);
  }

  async getMessageBody(messageId: string): Promise<{
    bodyText?: string;
    bodyHtml?: string;
  }> {
    await this.ensureValidToken();
    this.logger.debug(`Getting message body: ${messageId}`);

    const gmailMessage = await this.apiClient.getMessage(messageId, "full");
    return this.extractBody(gmailMessage.payload);
  }

  async sendEmail(request: SendEmailRequest): Promise<EmailMessage> {
    await this.ensureValidToken();
    this.logger.debug(
      `Sending email to: ${request.to.map((t) => t.email).join(", ")}`,
    );

    let message: string;

    // Check if we have attachments - use MIME multipart
    if (request.attachments && request.attachments.length > 0) {
      message = this.createMultipartMessage(request);
    } else {
      // Simple message without attachments
      message = this.createSimpleMessage(request);
    }

    // Encode to base64url
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await this.apiClient.sendMessage({
      raw: encodedMessage,
      threadId: request.threadId,
    });

    // Fetch the sent message details
    return this.getMessage(response.id);
  }

  /**
   * Create a simple email message without attachments
   */
  private createSimpleMessage(request: SendEmailRequest): string {
    const messageParts: string[] = [];

    // Headers
    messageParts.push(
      `To: ${request.to.map((addr) => this.formatEmailAddress(addr)).join(", ")}`,
    );

    if (request.cc && request.cc.length > 0) {
      messageParts.push(
        `Cc: ${request.cc.map((addr) => this.formatEmailAddress(addr)).join(", ")}`,
      );
    }

    if (request.bcc && request.bcc.length > 0) {
      messageParts.push(
        `Bcc: ${request.bcc.map((addr) => this.formatEmailAddress(addr)).join(", ")}`,
      );
    }

    messageParts.push(
      `Subject: ${this.encodeHeaderValue(request.subject || "(no subject)")}`,
    );

    if (request.inReplyTo) {
      messageParts.push(`In-Reply-To: ${request.inReplyTo}`);
    }

    if (request.references && request.references.length > 0) {
      messageParts.push(`References: ${request.references.join(" ")}`);
    }

    messageParts.push("MIME-Version: 1.0");
    messageParts.push("Content-Type: text/html; charset=UTF-8");
    messageParts.push(""); // Empty line between headers and body
    messageParts.push(request.bodyHtml || request.bodyText || "");

    return messageParts.join("\r\n");
  }

  /**
   * Create a multipart email message with attachments
   */
  private createMultipartMessage(request: SendEmailRequest): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const messageParts: string[] = [];

    // Headers
    messageParts.push(
      `To: ${request.to.map((addr) => this.formatEmailAddress(addr)).join(", ")}`,
    );

    if (request.cc && request.cc.length > 0) {
      messageParts.push(
        `Cc: ${request.cc.map((addr) => this.formatEmailAddress(addr)).join(", ")}`,
      );
    }

    if (request.bcc && request.bcc.length > 0) {
      messageParts.push(
        `Bcc: ${request.bcc.map((addr) => this.formatEmailAddress(addr)).join(", ")}`,
      );
    }

    messageParts.push(
      `Subject: ${this.encodeHeaderValue(request.subject || "(no subject)")}`,
    );

    if (request.inReplyTo) {
      messageParts.push(`In-Reply-To: ${request.inReplyTo}`);
    }

    if (request.references && request.references.length > 0) {
      messageParts.push(`References: ${request.references.join(" ")}`);
    }

    messageParts.push("MIME-Version: 1.0");
    messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    messageParts.push(""); // Empty line between headers and body

    // Body part (HTML or Text)
    messageParts.push(`--${boundary}`);
    if (request.bodyHtml) {
      messageParts.push("Content-Type: text/html; charset=UTF-8");
      messageParts.push("Content-Transfer-Encoding: quoted-printable");
      messageParts.push("");
      messageParts.push(request.bodyHtml);
    } else {
      messageParts.push("Content-Type: text/plain; charset=UTF-8");
      messageParts.push("Content-Transfer-Encoding: quoted-printable");
      messageParts.push("");
      messageParts.push(request.bodyText || "");
    }
    messageParts.push("");

    // Attachment parts
    for (const attachment of request.attachments!) {
      messageParts.push(`--${boundary}`);
      messageParts.push(
        `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      );
      messageParts.push("Content-Transfer-Encoding: base64");
      messageParts.push(
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
      );
      messageParts.push("");

      // Convert Buffer to base64 and split into 76-character lines (RFC 2045)
      const base64Content = attachment.content.toString("base64");
      const lines = base64Content.match(/.{1,76}/g) || [];
      messageParts.push(lines.join("\r\n"));
      messageParts.push("");
    }

    // Closing boundary
    messageParts.push(`--${boundary}--`);

    return messageParts.join("\r\n");
  }

  async modifyMessage(
    messageId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailMessage> {
    await this.ensureValidToken();
    this.logger.debug(`Modifying message: ${messageId}`);

    await this.apiClient.modifyMessage(messageId, {
      addLabelIds: request.addLabelIds,
      removeLabelIds: request.removeLabelIds,
    });

    // Return updated message
    return this.getMessage(messageId);
  }

  async modifyLabels(
    messageId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailMessage> {
    return this.modifyMessage(messageId, request);
  }

  async trashMessage(messageId: string): Promise<void> {
    await this.ensureValidToken();
    this.logger.debug(`Trashing message: ${messageId}`);

    await this.apiClient.trashMessage(messageId);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.ensureValidToken();
    this.logger.debug(`Deleting message: ${messageId}`);

    await this.apiClient.deleteMessage(messageId);
  }

  // ----------------- Thread Operations -----------------

  async getThread(threadId: string): Promise<EmailThread> {
    await this.ensureValidToken();
    this.logger.debug(`Getting thread: ${threadId}`);

    // TODO: Implement Gmail API threads.get
    // GET https://gmail.googleapis.com/gmail/v1/users/me/threads/{id}
    throw new Error("getThread not implemented");
  }

  async modifyThread(
    threadId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailThread> {
    await this.ensureValidToken();
    this.logger.debug(`Modifying thread: ${threadId}`);

    // TODO: Implement Gmail API threads.modify
    // POST https://gmail.googleapis.com/gmail/v1/users/me/threads/{id}/modify
    throw new Error("modifyThread not implemented");
  }

  async trashThread(threadId: string): Promise<void> {
    await this.ensureValidToken();
    this.logger.debug(`Trashing thread: ${threadId}`);

    // TODO: Implement Gmail API threads.trash
    // POST https://gmail.googleapis.com/gmail/v1/users/me/threads/{id}/trash
    throw new Error("trashThread not implemented");
  }

  // ----------------- Label Operations -----------------

  async listLabels(): Promise<Label[]> {
    await this.ensureValidToken();
    this.logger.debug("Listing labels");

    const response = await this.apiClient.listLabels();

    return (response.labels || []).map((label: any) => ({
      id: label.id,
      name: label.name,
      type: this.getLabelType(label.type),
      labelListVisibility: label.labelListVisibility,
      messageListVisibility: label.messageListVisibility,
    }));
  }

  /**
   * Get single label with realtime stats from Gmail
   */
  async getLabel(
    labelId: string,
  ): Promise<Label & { messagesTotal?: number; messagesUnread?: number }> {
    await this.ensureValidToken();
    this.logger.debug(`Getting label: ${labelId}`);

    const response = await this.apiClient.getLabel(labelId);

    return {
      id: response.id,
      name: response.name,
      type: this.getLabelType(response.type),
      color: response.color?.backgroundColor,
      labelListVisibility: response.labelListVisibility,
      messageListVisibility: response.messageListVisibility,
      messagesTotal: response.messagesTotal,
      messagesUnread: response.messagesUnread,
    };
  }

  async createLabel(name: string, _color?: string): Promise<Label> {
    await this.ensureValidToken();
    this.logger.debug(`Creating label: ${name}`);

    const requestData: any = {
      name,
      messageListVisibility: "show",
      labelListVisibility: "labelShow",
    };

    // Note: Gmail only allows predefined color palette, not custom hex colors
    // Ignoring color parameter and using Gmail's default colors

    const response = await this.apiClient.createLabel(requestData);

    return {
      id: response.id,
      name: response.name,
      type: this.getLabelType(response.type),
      color: response.color?.backgroundColor,
      labelListVisibility: response.labelListVisibility,
      messageListVisibility: response.messageListVisibility,
    };
  }

  async updateLabel(
    labelId: string,
    name: string,
    _color?: string,
  ): Promise<Label> {
    await this.ensureValidToken();
    this.logger.debug(`Updating label: ${labelId}`);

    const requestData: any = {
      name,
    };

    // Note: Gmail only allows predefined color palette, not custom hex colors
    // Ignoring color parameter

    const response = await this.apiClient.updateLabel(labelId, requestData);

    return {
      id: response.id,
      name: response.name,
      type: this.getLabelType(response.type),
      color: response.color?.backgroundColor,
      labelListVisibility: response.labelListVisibility,
      messageListVisibility: response.messageListVisibility,
    };
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.ensureValidToken();
    this.logger.debug(`Deleting label: ${labelId}`);

    await this.apiClient.deleteLabel(labelId);
  }

  // ----------------- Attachment Operations -----------------

  async getAttachment(
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    await this.ensureValidToken();
    this.logger.debug(
      `Getting attachment: ${attachmentId} from message: ${messageId}`,
    );

    const response = await this.apiClient.getAttachment(
      messageId,
      attachmentId,
    );

    // Decode base64url data
    const base64 = response.data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  }

  // ----------------- Sync Operations -----------------

  async setupWatch(request: WatchRequest): Promise<WatchResponse> {
    await this.ensureValidToken();
    this.logger.debug("Setting up Gmail watch");

    // TODO: Implement Gmail API users.watch
    // POST https://gmail.googleapis.com/gmail/v1/users/me/watch
    throw new Error("setupWatch not implemented");
  }

  async stopWatch(): Promise<void> {
    await this.ensureValidToken();
    this.logger.debug("Stopping Gmail watch");

    // TODO: Implement Gmail API users.stop
    // POST https://gmail.googleapis.com/gmail/v1/users/me/stop
    throw new Error("stopWatch not implemented");
  }

  async syncChanges(syncState: SyncState): Promise<{
    messages: EmailMessage[];
    deletedMessageIds: string[];
    newSyncState: SyncState;
  }> {
    await this.ensureValidToken();
    this.logger.debug(`Syncing changes from historyId: ${syncState.historyId}`);

    const messages: EmailMessage[] = [];
    const deletedMessageIds: string[] = [];

    // Check if this is initial sync or incremental sync
    if (!syncState.historyId) {
      // Initial sync - fetch messages from last 30 days
      this.logger.log("Performing initial sync (last 30 days)");

      const response = await this.apiClient.listMessages({
        maxResults: 100,
        q: "newer_than:30d",
      });

      // Fetch full message details for each message
      if (response.messages && response.messages.length > 0) {
        for (const msg of response.messages) {
          try {
            const fullMessage = await this.getMessage(msg.id);
            messages.push(fullMessage);
          } catch (error) {
            this.logger.error(
              `Failed to fetch message ${msg.id}: ${error.message}`,
            );
          }
        }
      }

      // Get profile to obtain current historyId
      const profile = await this.apiClient.getProfile();

      return {
        messages,
        deletedMessageIds,
        newSyncState: {
          historyId: profile.historyId,
          lastSyncTime: new Date(),
        },
      };
    }

    // Incremental sync using history API
    this.logger.log(
      `Performing incremental sync from historyId: ${syncState.historyId}`,
    );

    try {
      const historyResponse = await this.apiClient.listHistory({
        startHistoryId: syncState.historyId,
        maxResults: 100,
      });

      if (historyResponse.history) {
        const messageIdsToFetch = new Set<string>();

        for (const historyRecord of historyResponse.history) {
          // Process messagesAdded
          if (historyRecord.messagesAdded) {
            for (const added of historyRecord.messagesAdded) {
              messageIdsToFetch.add(added.message.id);
            }
          }

          // Process messagesDeleted
          if (historyRecord.messagesDeleted) {
            for (const deleted of historyRecord.messagesDeleted) {
              deletedMessageIds.push(deleted.message.id);
            }
          }

          // Process labelsAdded/labelsRemoved - need to refetch message
          if (historyRecord.labelsAdded) {
            for (const labeled of historyRecord.labelsAdded) {
              messageIdsToFetch.add(labeled.message.id);
            }
          }

          if (historyRecord.labelsRemoved) {
            for (const unlabeled of historyRecord.labelsRemoved) {
              messageIdsToFetch.add(unlabeled.message.id);
            }
          }
        }

        // Fetch full details for all affected messages
        for (const messageId of messageIdsToFetch) {
          try {
            const fullMessage = await this.getMessage(messageId);
            messages.push(fullMessage);
          } catch (error) {
            this.logger.error(
              `Failed to fetch message ${messageId}: ${error.message}`,
            );
          }
        }
      }

      return {
        messages,
        deletedMessageIds,
        newSyncState: {
          historyId: historyResponse.historyId || syncState.historyId,
          lastSyncTime: new Date(),
        },
      };
    } catch (error) {
      // If history.list fails (e.g., historyId too old), fall back to full sync
      if (
        error.response?.status === 404 ||
        error.message?.includes("historyId")
      ) {
        this.logger.warn("History ID expired, performing full sync");
        return this.syncChanges({ historyId: undefined });
      }
      throw error;
    }
  }

  // ----------------- Profile Operations -----------------

  async getProfile(): Promise<{
    email: string;
    name?: string;
    avatarUrl?: string;
  }> {
    await this.ensureValidToken();
    this.logger.debug("Getting Gmail profile");

    const profile = await this.apiClient.getProfile();
    return {
      email: profile.emailAddress,
      name: undefined,
      avatarUrl: undefined,
    };
  }

  // ----------------- Helper Methods -----------------

  /**
   * Encode header value using RFC 2047 (UTF-8 Base64) if it contains non-ASCII characters
   */
  private encodeHeaderValue(value: string): string {
    // Check if value contains any non-ASCII characters
    if (!/[^\x00-\x7F]/.test(value)) {
      return value;
    }

    const encoded = Buffer.from(value, "utf-8").toString("base64");
    return `=?UTF-8?B?${encoded}?=`;
  }

  /**
   * Parse Gmail message to EmailMessage interface
   */
  protected parseGmailMessage(gmailMessage: any): EmailMessage {
    const headers = this.parseHeaders(gmailMessage.payload?.headers || []);
    const { bodyText, bodyHtml } = this.extractBody(gmailMessage.payload);
    const attachments = this.extractAttachments(gmailMessage.payload);

    return {
      id: gmailMessage.id,
      internetMessageId: headers["message-id"],
      threadId: gmailMessage.threadId,
      from: this.parseGmailEmailAddress(headers.from),
      to: this.parseEmailAddresses(headers.to),
      cc: this.parseEmailAddresses(headers.cc),
      bcc: this.parseEmailAddresses(headers.bcc),
      replyTo: headers.replyTo,
      subject: headers.subject,
      snippet: gmailMessage.snippet,
      bodyText,
      bodyHtml,
      date: headers.date
        ? new Date(headers.date)
        : new Date(parseInt(gmailMessage.internalDate)),
      isRead: !gmailMessage.labelIds?.includes("UNREAD"),
      isStarred: gmailMessage.labelIds?.includes("STARRED") || false,
      hasAttachments: attachments.length > 0,
      labels: gmailMessage.labelIds || [],
      attachments,
      inReplyTo: headers.inReplyTo,
      references: headers.references
        ? headers.references.split(" ").filter(Boolean)
        : [],
    };
  }

  /**
   * Parse email headers into structured format
   */
  protected parseHeaders(headers: any[]): Record<string, string> {
    const result: Record<string, string> = {};

    for (const header of headers) {
      const name = header.name.toLowerCase();
      result[name] = header.value;
    }

    return result;
  }

  /**
   * Parse single email address string (Gmail-specific override)
   */
  protected parseGmailEmailAddress(addressString?: string): EmailAddress {
    if (!addressString) {
      return { email: "" };
    }

    // Handle format: "Name <email@example.com>" or just "email@example.com"
    const match = addressString.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim() || undefined,
        email: match[2].trim(),
      };
    }

    return { email: addressString.trim() };
  }

  /**
   * Parse comma-separated email addresses
   */
  protected parseEmailAddresses(addressString?: string): EmailAddress[] {
    if (!addressString) {
      return [];
    }

    // Simple split by comma - in production, use a proper email parser
    return addressString
      .split(",")
      .map((addr) => this.parseGmailEmailAddress(addr.trim()))
      .filter((addr) => addr.email);
  }

  /**
   * Extract body text and HTML from MIME parts
   */
  protected extractBody(payload: any): {
    bodyText?: string;
    bodyHtml?: string;
  } {
    if (!payload) {
      return {};
    }

    let bodyText: string | undefined;
    let bodyHtml: string | undefined;

    const findBodyParts = (part: any) => {
      if (part.mimeType === "text/plain" && part.body?.data) {
        bodyText = this.decodeBase64Url(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        bodyHtml = this.decodeBase64Url(part.body.data);
      }

      // Recursively search in parts
      if (part.parts) {
        for (const subPart of part.parts) {
          findBodyParts(subPart);
        }
      }
    };

    findBodyParts(payload);

    return { bodyText, bodyHtml };
  }

  /**
   * Extract attachments metadata from MIME parts
   */
  protected extractAttachments(payload: any): EmailAttachment[] {
    if (!payload) {
      return [];
    }

    const attachments: EmailAttachment[] = [];

    const findAttachments = (part: any) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          contentId: part.headers?.find((h: any) => h.name === "Content-ID")
            ?.value,
          isInline:
            part.headers?.some(
              (h: any) =>
                h.name === "Content-Disposition" && h.value.includes("inline"),
            ) || false,
        });
      }

      // Recursively search in parts
      if (part.parts) {
        for (const subPart of part.parts) {
          findAttachments(subPart);
        }
      }
    };

    findAttachments(payload);

    return attachments;
  }

  /**
   * Convert Gmail label type to generic type
   */
  protected getLabelType(gmailType: string): "system" | "user" {
    return gmailType === "system" ? "system" : "user";
  }

  /**
   * Decode base64url encoded string
   */
  protected decodeBase64Url(data: string): string {
    try {
      // Convert base64url to base64
      const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
      // Decode base64 to UTF-8 string
      return Buffer.from(base64, "base64").toString("utf-8");
    } catch (error) {
      this.logger.error("Failed to decode base64url data", error);
      return "";
    }
  }

  /**
   * Format EmailAddress to RFC 2822 format
   */
  protected formatEmailAddress(address: EmailAddress): string {
    if (address.name) {
      return `${address.name} <${address.email}>`;
    }
    return address.email;
  }
}
