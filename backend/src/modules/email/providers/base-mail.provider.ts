import {
  IMailProvider,
  ProviderCredentials,
  ListMessagesRequest,
  ListMessagesResponse,
  EmailMessage,
  SendEmailRequest,
  ModifyEmailRequest,
  EmailThread,
  Label,
  WatchRequest,
  WatchResponse,
  SyncState,
} from '../interfaces/mail-provider.interface';
import { MailProviderType } from '../types/mail-provider.types';

/**
 * Base abstract class for email providers
 * Implements common functionality and enforces interface
 */
export abstract class BaseMailProvider implements IMailProvider {
  protected credentials: ProviderCredentials;
  protected initialized = false;

  constructor(public readonly provider: MailProviderType) {}

  /**
   * Initialize provider with credentials
   */
  async initialize(credentials: ProviderCredentials): Promise<void> {
    this.credentials = credentials;
    await this.validateCredentials();
    this.initialized = true;
  }

  /**
   * Validate credentials are present and not expired
   */
  protected async validateCredentials(): Promise<void> {
    if (!this.credentials) {
      throw new Error('Credentials not initialized');
    }

    if (!this.credentials.accessToken) {
      throw new Error('Access token is required');
    }

    // Check if token is expired
    const now = new Date();
    if (this.credentials.expiresAt && this.credentials.expiresAt < now) {
      // Token expired, attempt refresh if available
      if (this.refreshAccessToken) {
        this.credentials = await this.refreshAccessToken();
      } else {
        throw new Error('Access token expired and no refresh method available');
      }
    }
  }

  /**
   * Ensure provider is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
  }

  /**
   * Parse email address string to EmailAddress object
   */
  protected parseEmailAddress(address: string): {
    email: string;
    name?: string;
  } {
    const match = address.match(/^(.+?)\s*<(.+?)>$|^(.+)$/);
    if (!match) {
      return { email: address };
    }

    if (match[2]) {
      // Format: "Name <email@example.com>"
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }

    // Format: "email@example.com"
    return { email: match[3].trim() };
  }

  /**
   * Format email address object to string
   */
  protected formatEmailAddress(address: {
    email: string;
    name?: string;
  }): string {
    if (address.name) {
      return `${address.name} <${address.email}>`;
    }
    return address.email;
  }

  // ----------------- Abstract Methods (must be implemented) -----------------

  abstract refreshAccessToken?(): Promise<ProviderCredentials>;

  abstract listMessages(
    request: ListMessagesRequest,
  ): Promise<ListMessagesResponse>;

  abstract getMessage(messageId: string): Promise<EmailMessage>;

  abstract getMessageBody(messageId: string): Promise<{
    bodyText?: string;
    bodyHtml?: string;
  }>;

  abstract sendEmail(request: SendEmailRequest): Promise<EmailMessage>;

  abstract modifyMessage(
    messageId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailMessage>;

  abstract trashMessage(messageId: string): Promise<void>;

  abstract deleteMessage(messageId: string): Promise<void>;

  abstract getThread(threadId: string): Promise<EmailThread>;

  abstract modifyThread(
    threadId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailThread>;

  abstract trashThread(threadId: string): Promise<void>;

  abstract listLabels(): Promise<Label[]>;

  abstract createLabel(name: string, color?: string): Promise<Label>;

  abstract updateLabel(
    labelId: string,
    name: string,
    color?: string,
  ): Promise<Label>;

  abstract deleteLabel(labelId: string): Promise<void>;

  abstract getAttachment(
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer>;

  abstract setupWatch?(request: WatchRequest): Promise<WatchResponse>;

  abstract stopWatch?(): Promise<void>;

  abstract syncChanges?(syncState: SyncState): Promise<{
    messages: EmailMessage[];
    deletedMessageIds: string[];
    newSyncState: SyncState;
  }>;

  abstract getProfile(): Promise<{
    email: string;
    name?: string;
    avatarUrl?: string;
  }>;
}
