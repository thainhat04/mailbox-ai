import { MailProviderType } from '../types/mail-provider.types';

// -------------------------------------------------------------
// CORE TYPES & INTERFACES
// -------------------------------------------------------------

export interface ProviderCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  isInline: boolean;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: string;
  subject?: string;
  snippet?: string;
  bodyText?: string;
  bodyHtml?: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
  attachments?: EmailAttachment[];
  inReplyTo?: string;
  references?: string[];
}

export interface EmailThread {
  id: string;
  messages: EmailMessage[];
}

export interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: string;
  labelListVisibility?: string;
  messageListVisibility?: string;
}

export interface SyncState {
  historyId?: string;
  deltaLink?: string;
  pageToken?: string;
  syncToken?: string;
  lastSyncTime?: Date;
}

// -------------------------------------------------------------
// REQUEST TYPES
// -------------------------------------------------------------

export interface ListMessagesRequest {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  query?: string;
  includeSpam?: boolean;
}

export interface ListMessagesResponse {
  messages: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface SendEmailRequest {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    mimeType: string;
  }[];
  inReplyTo?: string;
  references?: string[];
}

export interface ModifyEmailRequest {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface WatchRequest {
  topicName?: string;
  labelIds?: string[];
}

export interface WatchResponse {
  historyId: string;
  expiration: Date;
}

// -------------------------------------------------------------
// MAIL PROVIDER INTERFACE
// -------------------------------------------------------------

export interface IMailProvider {
  /**
   * Provider identifier
   */
  readonly provider: MailProviderType;

  /**
   * Initialize the provider with credentials
   */
  initialize(credentials: ProviderCredentials): Promise<void>;

  /**
   * Set callback for when credentials are updated (e.g., after refresh)
   */
  setCredentialsUpdateCallback?(callback: (credentials: ProviderCredentials) => Promise<void>): void;

  /**
   * Refresh access token if needed
   */
  refreshAccessToken?(): Promise<ProviderCredentials>;

  // ----------------- Message Operations -----------------

  /**
   * List messages with pagination and filtering
   */
  listMessages(request: ListMessagesRequest): Promise<ListMessagesResponse>;

  /**
   * Get a single message by ID
   */
  getMessage(messageId: string): Promise<EmailMessage>;

  /**
   * Get message body (HTML/Text)
   */
  getMessageBody(messageId: string): Promise<{
    bodyText?: string;
    bodyHtml?: string;
  }>;

  /**
   * Send a new email
   */
  sendEmail(request: SendEmailRequest): Promise<EmailMessage>;

  /**
   * Modify message labels/categories
   */
  modifyMessage(
    messageId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailMessage>;

  /**
   * Move message to trash
   */
  trashMessage(messageId: string): Promise<void>;

  /**
   * Permanently delete a message
   */
  deleteMessage(messageId: string): Promise<void>;

  // ----------------- Thread Operations -----------------

  /**
   * Get thread with all messages
   */
  getThread(threadId: string): Promise<EmailThread>;

  /**
   * Modify thread labels
   */
  modifyThread(
    threadId: string,
    request: ModifyEmailRequest,
  ): Promise<EmailThread>;

  /**
   * Move thread to trash
   */
  trashThread(threadId: string): Promise<void>;

  // ----------------- Label Operations -----------------

  /**
   * List all labels/categories
   */
  listLabels(): Promise<Label[]>;

  /**
   * Create a new label/category
   */
  createLabel(name: string, color?: string): Promise<Label>;

  /**
   * Update label/category
   */
  updateLabel(labelId: string, name: string, color?: string): Promise<Label>;

  /**
   * Delete label/category
   */
  deleteLabel(labelId: string): Promise<void>;

  // ----------------- Attachment Operations -----------------

  /**
   * Get attachment content
   */
  getAttachment(messageId: string, attachmentId: string): Promise<Buffer>;

  // ----------------- Sync Operations -----------------

  /**
   * Set up push notifications (Gmail watch, Outlook webhook)
   */
  setupWatch?(request: WatchRequest): Promise<WatchResponse>;

  /**
   * Stop push notifications
   */
  stopWatch?(): Promise<void>;

  /**
   * Sync changes since last sync (incremental sync)
   */
  syncChanges?(syncState: SyncState): Promise<{
    messages: EmailMessage[];
    deletedMessageIds: string[];
    newSyncState: SyncState;
  }>;

  // ----------------- Profile Operations -----------------

  /**
   * Get user profile information
   */
  getProfile(): Promise<{
    email: string;
    name?: string;
    avatarUrl?: string;
  }>;
}
