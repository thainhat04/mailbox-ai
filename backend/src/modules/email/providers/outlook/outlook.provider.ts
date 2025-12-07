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
import { OutlookGraphClient } from './outlook-graph.client';

/**
 * Outlook/Microsoft Provider Implementation
 * Uses Microsoft Graph API
 */
@Injectable()
export class OutlookProvider extends BaseMailProvider {
  private readonly logger = new Logger(OutlookProvider.name);
  private apiClient: OutlookGraphClient;

  constructor() {
    super(MailProvider.MICROSOFT);
  }

  async initialize(credentials: ProviderCredentials): Promise<void> {
    await super.initialize(credentials);
    this.apiClient = new OutlookGraphClient(this.credentials.accessToken);
    this.logger.log('Outlook provider initialized');
  }

  async refreshAccessToken(): Promise<ProviderCredentials> {
    this.logger.log('Refreshing Outlook access token');

    if (!this.credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            refresh_token: this.credentials.refreshToken,
            grant_type: 'refresh_token',
            scope:
              'https://outlook.office.com/Mail.ReadWrite https://outlook.office.com/Mail.Send offline_access',
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to refresh token: ${errorData.error || response.statusText}`,
        );
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

      this.logger.log('Outlook access token refreshed successfully');
      return newCredentials;
    } catch (error) {
      this.logger.error('Failed to refresh Outlook token', error);
      throw error;
    }
  }

  // ----------------- Message Operations -----------------

  async listMessages(
    request: ListMessagesRequest,
  ): Promise<ListMessagesResponse> {
    this.ensureInitialized();
    this.logger.debug(
      `Listing messages with request: ${JSON.stringify(request)}`,
    );

    // TODO: Implement Microsoft Graph API /me/messages
    // GET https://graph.microsoft.com/v1.0/me/messages
    throw new Error('listMessages not implemented');
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    this.ensureInitialized();
    this.logger.debug(`Getting message: ${messageId}`);

    const outlookMessage = await this.apiClient.getMessage(messageId);
    return this.parseOutlookMessage(outlookMessage);
  }

  async getMessageBody(messageId: string): Promise<{
    bodyText?: string;
    bodyHtml?: string;
  }> {
    this.ensureInitialized();
    this.logger.debug(`Getting message body: ${messageId}`);

    // TODO: Implement Microsoft Graph API /me/messages/{id}
    // Parse body content (HTML or Text)
    throw new Error('getMessageBody not implemented');
  }

  async sendEmail(request: SendEmailRequest): Promise<EmailMessage> {
    this.ensureInitialized();
    this.logger.debug(
      `Sending email to: ${request.to.map((t) => t.email).join(', ')}`,
    );

    // TODO: Implement Microsoft Graph API /me/sendMail
    // POST https://graph.microsoft.com/v1.0/me/sendMail
    throw new Error('sendEmail not implemented');
  }

  async modifyMessage(
    messageId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailMessage> {
    this.ensureInitialized();
    this.logger.debug(`Modifying message: ${messageId}`);

    // TODO: Implement Microsoft Graph API /me/messages/{id}
    // PATCH https://graph.microsoft.com/v1.0/me/messages/{id}
    // Use categories property for labels
    throw new Error('modifyMessage not implemented');
  }

  async trashMessage(messageId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Trashing message: ${messageId}`);

    // TODO: Implement Microsoft Graph API /me/messages/{id}/move
    // POST https://graph.microsoft.com/v1.0/me/messages/{id}/move
    // Move to deletedItems folder
    throw new Error('trashMessage not implemented');
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Deleting message: ${messageId}`);

    // TODO: Implement Microsoft Graph API /me/messages/{id}
    // DELETE https://graph.microsoft.com/v1.0/me/messages/{id}
    throw new Error('deleteMessage not implemented');
  }

  // ----------------- Thread Operations -----------------

  async getThread(threadId: string): Promise<EmailThread> {
    this.ensureInitialized();
    this.logger.debug(`Getting thread: ${threadId}`);

    // TODO: Implement Microsoft Graph API /me/messages with conversationId filter
    // GET https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '{threadId}'
    throw new Error('getThread not implemented');
  }

  async modifyThread(
    threadId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailThread> {
    this.ensureInitialized();
    this.logger.debug(`Modifying thread: ${threadId}`);

    // TODO: Implement batch update for all messages in conversation
    // Use $batch endpoint or individual PATCH requests
    throw new Error('modifyThread not implemented');
  }

  async trashThread(threadId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Trashing thread: ${threadId}`);

    // TODO: Implement batch move for all messages in conversation
    throw new Error('trashThread not implemented');
  }

  // ----------------- Label Operations -----------------

  async listLabels(): Promise<Label[]> {
    this.ensureInitialized();
    this.logger.debug('Listing labels (categories)');

    // TODO: Implement Microsoft Graph API /me/outlook/masterCategories
    // GET https://graph.microsoft.com/v1.0/me/outlook/masterCategories
    throw new Error('listLabels not implemented');
  }

  async createLabel(name: string, color?: string): Promise<Label> {
    this.ensureInitialized();
    this.logger.debug(`Creating label (category): ${name}`);

    // TODO: Implement Microsoft Graph API /me/outlook/masterCategories
    // POST https://graph.microsoft.com/v1.0/me/outlook/masterCategories
    throw new Error('createLabel not implemented');
  }

  async updateLabel(
    labelId: string,
    name: string,
    color?: string,
  ): Promise<Label> {
    this.ensureInitialized();
    this.logger.debug(`Updating label (category): ${labelId}`);

    // TODO: Implement Microsoft Graph API /me/outlook/masterCategories/{id}
    // PATCH https://graph.microsoft.com/v1.0/me/outlook/masterCategories/{id}
    throw new Error('updateLabel not implemented');
  }

  async deleteLabel(labelId: string): Promise<void> {
    this.ensureInitialized();
    this.logger.debug(`Deleting label (category): ${labelId}`);

    // TODO: Implement Microsoft Graph API /me/outlook/masterCategories/{id}
    // DELETE https://graph.microsoft.com/v1.0/me/outlook/masterCategories/{id}
    throw new Error('deleteLabel not implemented');
  }

  // ----------------- Attachment Operations -----------------

  async getAttachment(
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    this.ensureInitialized();
    this.logger.debug(
      `Getting attachment: ${attachmentId} from message: ${messageId}`,
    );

    // TODO: Implement Microsoft Graph API /me/messages/{messageId}/attachments/{id}
    // GET https://graph.microsoft.com/v1.0/me/messages/{messageId}/attachments/{id}
    throw new Error('getAttachment not implemented');
  }

  // ----------------- Sync Operations -----------------

  async setupWatch(request: WatchRequest): Promise<WatchResponse> {
    this.ensureInitialized();
    this.logger.debug('Setting up Outlook subscription (webhook)');

    // TODO: Implement Microsoft Graph API /subscriptions
    // POST https://graph.microsoft.com/v1.0/subscriptions
    throw new Error('setupWatch not implemented');
  }

  async stopWatch(): Promise<void> {
    this.ensureInitialized();
    this.logger.debug('Stopping Outlook subscription');

    // TODO: Implement Microsoft Graph API /subscriptions/{id}
    // DELETE https://graph.microsoft.com/v1.0/subscriptions/{id}
    throw new Error('stopWatch not implemented');
  }

  async syncChanges(syncState: SyncState): Promise<{
    messages: EmailMessage[];
    deletedMessageIds: string[];
    newSyncState: SyncState;
  }> {
    this.ensureInitialized();
    this.logger.debug(`Syncing changes with deltaLink: ${syncState.deltaLink}`);

    const messages: EmailMessage[] = [];
    const deletedMessageIds: string[] = [];

    try {
      // Use delta query (works for both initial and incremental sync)
      const deltaResponse = await this.apiClient.getDeltaMessages(
        syncState.deltaLink,
      );

      // Process delta changes
      if (deltaResponse.value && deltaResponse.value.length > 0) {
        for (const outlookMessage of deltaResponse.value) {
          // Check if message was deleted (has @removed property)
          if (outlookMessage['@removed']) {
            deletedMessageIds.push(outlookMessage.id);
          } else {
            // Message was added or updated - fetch full details
            try {
              const fullMessage = await this.getMessage(outlookMessage.id);
              messages.push(fullMessage);
            } catch (error) {
              this.logger.error(
                `Failed to fetch message ${outlookMessage.id}: ${error.message}`,
              );
            }
          }
        }
      }

      // Extract new deltaLink from response
      const newDeltaLink =
        deltaResponse['@odata.deltaLink'] ||
        deltaResponse['@odata.nextLink'] ||
        syncState.deltaLink;

      return {
        messages,
        deletedMessageIds,
        newSyncState: {
          deltaLink: newDeltaLink,
          lastSyncTime: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to sync Outlook messages', error);
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
    this.logger.debug('Getting Outlook profile');

    const profile = await this.apiClient.getProfile();
    return {
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      avatarUrl: undefined,
    };
  }

  // ----------------- Helper Methods -----------------

  /**
   * Parse Outlook message to EmailMessage interface
   */
  private parseOutlookMessage(outlookMessage: any): EmailMessage {
    const attachments = this.parseOutlookAttachments(
      outlookMessage.hasAttachments,
      outlookMessage.id,
    );

    return {
      id: outlookMessage.id,
      threadId: outlookMessage.conversationId,
      from: this.parseOutlookEmailAddress(outlookMessage.from),
      to: this.parseOutlookEmailAddresses(outlookMessage.toRecipients),
      cc: this.parseOutlookEmailAddresses(outlookMessage.ccRecipients),
      bcc: this.parseOutlookEmailAddresses(outlookMessage.bccRecipients),
      replyTo: outlookMessage.replyTo?.[0]?.emailAddress?.address,
      subject: outlookMessage.subject,
      snippet: outlookMessage.bodyPreview,
      bodyText:
        outlookMessage.body?.contentType === 'Text'
          ? outlookMessage.body?.content
          : undefined,
      bodyHtml:
        outlookMessage.body?.contentType === 'HTML'
          ? outlookMessage.body?.content
          : undefined,
      date: new Date(outlookMessage.receivedDateTime),
      isRead: outlookMessage.isRead || false,
      isStarred: outlookMessage.flag?.flagStatus === 'flagged',
      hasAttachments: outlookMessage.hasAttachments || false,
      labels: outlookMessage.categories || [],
      attachments,
      inReplyTo: outlookMessage.internetMessageHeaders?.find(
        (h: any) => h.name === 'In-Reply-To',
      )?.value,
      references:
        outlookMessage.internetMessageHeaders
          ?.find((h: any) => h.name === 'References')
          ?.value?.split(' ')
          .filter(Boolean) || [],
    };
  }

  /**
   * Parse Outlook email address
   */
  private parseOutlookEmailAddress(addressObj: any): EmailAddress {
    if (!addressObj || !addressObj.emailAddress) {
      return { email: '' };
    }

    return {
      email: addressObj.emailAddress.address,
      name: addressObj.emailAddress.name || undefined,
    };
  }

  /**
   * Parse Outlook email addresses array
   */
  private parseOutlookEmailAddresses(recipients: any[]): EmailAddress[] {
    if (!recipients || !Array.isArray(recipients)) {
      return [];
    }

    return recipients
      .map((r) => this.parseOutlookEmailAddress(r))
      .filter((addr) => addr.email);
  }

  /**
   * Parse Outlook attachments metadata
   */
  private parseOutlookAttachments(
    hasAttachments: boolean,
    messageId: string,
  ): EmailAttachment[] {
    // Note: For full attachment details, would need to call listAttachments API
    // For now, return empty array and populate during full message fetch
    return [];
  }
}
