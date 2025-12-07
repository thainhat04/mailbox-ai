import { Injectable, Logger } from '@nestjs/common';
import { MailProvider } from '../../types/mail-provider.types';
import { BaseMailProvider } from '../base-mail.provider';
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
} from '../../interfaces/mail-provider.interface';
import { GmailApiClient } from './gmail-api.client';

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
    await super.initialize(credentials);
    this.apiClient = new GmailApiClient(this.credentials.accessToken);
    this.logger.log('Gmail provider initialized');
  }

  async refreshAccessToken(): Promise<ProviderCredentials> {
    this.logger.log('Refreshing Gmail access token');

    if (!this.credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: this.credentials.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to refresh token: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      // Calculate new expiration time
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      const newCredentials: ProviderCredentials = {
        accessToken: data.access_token,
        refreshToken: this.credentials.refreshToken, // Keep the same refresh token
        expiresAt,
      };

      // Update provider credentials and API client
      this.credentials = newCredentials;
      this.apiClient.updateAccessToken(data.access_token);

      this.logger.log('Gmail access token refreshed successfully');
      return newCredentials;
    } catch (error) {
      this.logger.error('Failed to refresh Gmail token', error);
      throw error;
    }
  }

  // ----------------- Message Operations -----------------

  async listMessages(
    request: ListMessagesRequest,
  ): Promise<ListMessagesResponse> {
    this.ensureInitialized();
    this.logger.debug(`Listing messages with request: ${JSON.stringify(request)}`);

    // TODO: Implement Gmail API messages.list
    // GET https://gmail.googleapis.com/gmail/v1/users/me/messages
    throw new Error('listMessages not implemented');
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    this.ensureInitialized();
    this.logger.debug(`Getting message: ${messageId}`);

    const gmailMessage = await this.apiClient.getMessage(messageId, 'full');
    return this.parseGmailMessage(gmailMessage);
  }

  async getMessageBody(messageId: string): Promise<{
    bodyText?: string;
    bodyHtml?: string;
  }> {
    this.ensureInitialized();
    this.logger.debug(`Getting message body: ${messageId}`);

    // TODO: Implement Gmail API messages.get with format=full
    // Parse MIME parts to extract text/html bodies
    throw new Error('getMessageBody not implemented');
  }

  async sendEmail(request: SendEmailRequest): Promise<EmailMessage> {
    this.ensureInitialized();
    this.logger.debug(`Sending email to: ${request.to.map(t => t.email).join(', ')}`);

    // TODO: Implement Gmail API messages.send
    // POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
    // Create RFC 2822 formatted message
    throw new Error('sendEmail not implemented');
  }

  async modifyMessage(
    messageId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailMessage> {
    this.ensureInitialized();
    this.logger.debug(`Modifying message: ${messageId}`);

    // TODO: Implement Gmail API messages.modify
    // POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/modify
    throw new Error('modifyMessage not implemented');
  }

  async trashMessage(messageId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Trashing message: ${messageId}`);

    // TODO: Implement Gmail API messages.trash
    // POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/trash
    throw new Error('trashMessage not implemented');
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Deleting message: ${messageId}`);

    // TODO: Implement Gmail API messages.delete
    // DELETE https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}
    throw new Error('deleteMessage not implemented');
  }

  // ----------------- Thread Operations -----------------

  async getThread(threadId: string): Promise<EmailThread> {
    this.ensureInitialized();
    this.logger.debug(`Getting thread: ${threadId}`);

    // TODO: Implement Gmail API threads.get
    // GET https://gmail.googleapis.com/gmail/v1/users/me/threads/{id}
    throw new Error('getThread not implemented');
  }

  async modifyThread(
    threadId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailThread> {
    this.ensureInitialized();
    this.logger.debug(`Modifying thread: ${threadId}`);

    // TODO: Implement Gmail API threads.modify
    // POST https://gmail.googleapis.com/gmail/v1/users/me/threads/{id}/modify
    throw new Error('modifyThread not implemented');
  }

  async trashThread(threadId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Trashing thread: ${threadId}`);

    // TODO: Implement Gmail API threads.trash
    // POST https://gmail.googleapis.com/gmail/v1/users/me/threads/{id}/trash
    throw new Error('trashThread not implemented');
  }

  // ----------------- Label Operations -----------------

  async listLabels(): Promise<Label[]> {
    this.ensureInitialized();
    this.logger.debug('Listing labels');

    // TODO: Implement Gmail API labels.list
    // GET https://gmail.googleapis.com/gmail/v1/users/me/labels
    throw new Error('listLabels not implemented');
  }

  async createLabel(name: string, color?: string): Promise<Label> {
    this.ensureInitialized();
    this.logger.debug(`Creating label: ${name}`);

    // TODO: Implement Gmail API labels.create
    // POST https://gmail.googleapis.com/gmail/v1/users/me/labels
    throw new Error('createLabel not implemented');
  }

  async updateLabel(
    labelId: string,
    name: string,
    color?: string,
  ): Promise<Label> {
    this.ensureInitialized();
    this.logger.debug(`Updating label: ${labelId}`);

    // TODO: Implement Gmail API labels.update
    // PUT https://gmail.googleapis.com/gmail/v1/users/me/labels/{id}
    throw new Error('updateLabel not implemented');
  }

  async deleteLabel(labelId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Deleting label: ${labelId}`);

    // TODO: Implement Gmail API labels.delete
    // DELETE https://gmail.googleapis.com/gmail/v1/users/me/labels/{id}
    throw new Error('deleteLabel not implemented');
  }

  // ----------------- Attachment Operations -----------------

  async getAttachment(
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    this.ensureInitialized();
    this.logger.debug(`Getting attachment: ${attachmentId} from message: ${messageId}`);

    // TODO: Implement Gmail API messages.attachments.get
    // GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{messageId}/attachments/{id}
    throw new Error('getAttachment not implemented');
  }

  // ----------------- Sync Operations -----------------

  async setupWatch(request: WatchRequest): Promise<WatchResponse> {
    this.ensureInitialized();
    this.logger.debug('Setting up Gmail watch');

    // TODO: Implement Gmail API users.watch
    // POST https://gmail.googleapis.com/gmail/v1/users/me/watch
    throw new Error('setupWatch not implemented');
  }

  async stopWatch(): Promise<void> {
    this.ensureInitialized();
    this.logger.debug('Stopping Gmail watch');

    // TODO: Implement Gmail API users.stop
    // POST https://gmail.googleapis.com/gmail/v1/users/me/stop
    throw new Error('stopWatch not implemented');
  }

  async syncChanges(syncState: SyncState): Promise<{
    messages: EmailMessage[];
    deletedMessageIds: string[];
    newSyncState: SyncState;
  }> {
    this.ensureInitialized();
    this.logger.debug(`Syncing changes from historyId: ${syncState.historyId}`);

    const messages: EmailMessage[] = [];
    const deletedMessageIds: string[] = [];

    // Check if this is initial sync or incremental sync
    if (!syncState.historyId) {
      // Initial sync - fetch messages from last 30 days
      this.logger.log('Performing initial sync (last 30 days)');

      const response = await this.apiClient.listMessages({
        maxResults: 100,
        q: 'newer_than:30d',
      });

      // Fetch full message details for each message
      if (response.messages && response.messages.length > 0) {
        for (const msg of response.messages) {
          try {
            const fullMessage = await this.getMessage(msg.id);
            messages.push(fullMessage);
          } catch (error) {
            this.logger.error(`Failed to fetch message ${msg.id}: ${error.message}`);
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
    this.logger.log(`Performing incremental sync from historyId: ${syncState.historyId}`);

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
            this.logger.error(`Failed to fetch message ${messageId}: ${error.message}`);
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
      if (error.response?.status === 404 || error.message?.includes('historyId')) {
        this.logger.warn('History ID expired, performing full sync');
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
    this.ensureInitialized();
    this.logger.debug('Getting Gmail profile');

    const profile = await this.apiClient.getProfile();
    return {
      email: profile.emailAddress,
      name: undefined,
      avatarUrl: undefined,
    };
  }

  // ----------------- Helper Methods -----------------

  /**
   * Parse Gmail message to EmailMessage interface
   */
  protected parseGmailMessage(gmailMessage: any): EmailMessage {
    const headers = this.parseHeaders(gmailMessage.payload?.headers || []);
    const { bodyText, bodyHtml } = this.extractBody(gmailMessage.payload);
    const attachments = this.extractAttachments(gmailMessage.payload);

    return {
      id: gmailMessage.id,
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
      date: headers.date ? new Date(headers.date) : new Date(parseInt(gmailMessage.internalDate)),
      isRead: !gmailMessage.labelIds?.includes('UNREAD'),
      isStarred: gmailMessage.labelIds?.includes('STARRED') || false,
      hasAttachments: attachments.length > 0,
      labels: gmailMessage.labelIds || [],
      attachments,
      inReplyTo: headers.inReplyTo,
      references: headers.references ? headers.references.split(' ').filter(Boolean) : [],
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
      return { email: '' };
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
      .split(',')
      .map(addr => this.parseGmailEmailAddress(addr.trim()))
      .filter(addr => addr.email);
  }

  /**
   * Extract body text and HTML from MIME parts
   */
  protected extractBody(payload: any): { bodyText?: string; bodyHtml?: string } {
    if (!payload) {
      return {};
    }

    let bodyText: string | undefined;
    let bodyHtml: string | undefined;

    const findBodyParts = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = this.decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
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
          contentId: part.headers?.find((h: any) => h.name === 'Content-ID')?.value,
          isInline: part.headers?.some((h: any) =>
            h.name === 'Content-Disposition' && h.value.includes('inline')
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
   * Decode base64url encoded string
   */
  protected decodeBase64Url(data: string): string {
    try {
      // Convert base64url to base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      // Decode base64 to UTF-8 string
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error) {
      this.logger.error('Failed to decode base64url data', error);
      return '';
    }
  }
}
