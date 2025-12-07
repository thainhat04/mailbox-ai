import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailProviderRegistry } from './providers/provider.registry';
import {
  ListMessagesDto,
  SendEmailDto,
  ModifyEmailDto,
  MarkReadDto,
  MarkStarredDto,
  CreateLabelDto,
  UpdateLabelDto,
  EmailMessageResponseDto,
  LabelResponseDto,
  ListMessagesResponseDto,
} from './dto/provider-agnostic.dto';

/**
 * Email Service
 * Provider-agnostic email operations using the provider abstraction layer
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: MailProviderRegistry,
  ) { }

  // ----------------- Message Operations -----------------

  /**
   * List messages for a user's email account
   */
  async listMessages(
    userId: string,
    emailAccountId: string,
    dto: ListMessagesDto,
  ): Promise<ListMessagesResponseDto> {
    this.logger.debug(`Listing messages for account: ${emailAccountId}`);

    // Get provider for this account
    const provider = await this.providerRegistry.getProvider(emailAccountId);

    // Call provider's listMessages
    const result = await provider.listMessages({
      maxResults: dto.maxResults,
      pageToken: dto.pageToken,
      labelIds: dto.labelIds,
      query: dto.query,
      includeSpam: dto.includeSpam,
    });

    // Store messages in database (optional - for caching)
    // await this.syncMessagesToDatabase(emailAccountId, result.messages);

    return {
      messages: result.messages.map((msg) => this.mapToResponseDto(msg)),
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
    };
  }

  /**
   * Get a single message by ID
   */
  async getMessage(
    userId: string,
    emailAccountId: string,
    messageId: string,
  ): Promise<EmailMessageResponseDto> {
    this.logger.debug(`Getting message: ${messageId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    const message = await provider.getMessage(messageId);

    // Optionally sync to database
    // await this.syncMessageToDatabase(emailAccountId, message);

    return this.mapToResponseDto(message);
  }

  /**
   * Send a new email
   */
  async sendEmail(
    userId: string,
    emailAccountId: string,
    dto: SendEmailDto,
  ): Promise<EmailMessageResponseDto> {
    this.logger.debug(`Sending email from account: ${emailAccountId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);

    // Convert base64 attachments to Buffer
    const attachments = dto.attachments?.map((att) => ({
      filename: att.filename,
      mimeType: att.mimeType,
      content: Buffer.from(att.content, 'base64'),
    }));

    const message = await provider.sendEmail({
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      bodyText: dto.bodyText,
      bodyHtml: dto.bodyHtml,
      attachments,
      inReplyTo: dto.inReplyTo,
      references: dto.references,
    });

    return this.mapToResponseDto(message);
  }

  /**
   * Modify message labels
   */
  async modifyMessage(
    userId: string,
    emailAccountId: string,
    messageId: string,
    dto: ModifyEmailDto,
  ): Promise<EmailMessageResponseDto> {
    this.logger.debug(`Modifying message: ${messageId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    const message = await provider.modifyMessage(messageId, {
      addLabelIds: dto.addLabelIds,
      removeLabelIds: dto.removeLabelIds,
    });

    return this.mapToResponseDto(message);
  }

  /**
   * Mark message as read/unread
   */
  async markAsRead(
    userId: string,
    emailAccountId: string,
    messageId: string,
    dto: MarkReadDto,
  ): Promise<EmailMessageResponseDto> {
    this.logger.debug(`Marking message ${messageId} as ${dto.isRead ? 'read' : 'unread'}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);

    // Gmail uses UNREAD label, Outlook uses isRead property
    const message = await provider.modifyMessage(messageId, {
      addLabelIds: dto.isRead ? [] : ['UNREAD'],
      removeLabelIds: dto.isRead ? ['UNREAD'] : [],
    });

    return this.mapToResponseDto(message);
  }

  /**
   * Star/unstar message
   */
  async markAsStarred(
    userId: string,
    emailAccountId: string,
    messageId: string,
    dto: MarkStarredDto,
  ): Promise<EmailMessageResponseDto> {
    this.logger.debug(`Marking message ${messageId} as ${dto.isStarred ? 'starred' : 'unstarred'}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);

    // Gmail uses STARRED label
    const message = await provider.modifyMessage(messageId, {
      addLabelIds: dto.isStarred ? ['STARRED'] : [],
      removeLabelIds: dto.isStarred ? [] : ['STARRED'],
    });

    return this.mapToResponseDto(message);
  }

  /**
   * Move message to trash
   */
  async trashMessage(
    userId: string,
    emailAccountId: string,
    messageId: string,
  ): Promise<void> {
    this.logger.debug(`Trashing message: ${messageId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    await provider.trashMessage(messageId);
  }

  /**
   * Permanently delete message
   */
  async deleteMessage(
    userId: string,
    emailAccountId: string,
    messageId: string,
  ): Promise<void> {
    this.logger.debug(`Deleting message: ${messageId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    await provider.deleteMessage(messageId);
  }

  // ----------------- Thread Operations -----------------

  /**
   * Get thread with all messages
   */
  async getThread(
    userId: string,
    emailAccountId: string,
    threadId: string,
  ) {
    this.logger.debug(`Getting thread: ${threadId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    const thread = await provider.getThread(threadId);

    return {
      id: thread.id,
      messages: thread.messages.map((msg) => this.mapToResponseDto(msg)),
    };
  }

  /**
   * Trash entire thread
   */
  async trashThread(
    userId: string,
    emailAccountId: string,
    threadId: string,
  ): Promise<void> {
    this.logger.debug(`Trashing thread: ${threadId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    await provider.trashThread(threadId);
  }

  // ----------------- Label Operations -----------------

  /**
   * List all labels for an account
   */
  async listLabels(
    userId: string,
    emailAccountId: string,
  ): Promise<LabelResponseDto[]> {
    this.logger.debug(`Listing labels for account: ${emailAccountId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    const labels = await provider.listLabels();

    return labels.map((label) => ({
      id: label.id,
      name: label.name,
      type: label.type,
      color: label.color,
    }));
  }

  /**
   * Create a new label
   */
  async createLabel(
    userId: string,
    emailAccountId: string,
    dto: CreateLabelDto,
  ): Promise<LabelResponseDto> {
    this.logger.debug(`Creating label: ${dto.name}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    const label = await provider.createLabel(dto.name, dto.color);

    return {
      id: label.id,
      name: label.name,
      type: label.type,
      color: label.color,
    };
  }

  /**
   * Update label
   */
  async updateLabel(
    userId: string,
    emailAccountId: string,
    labelId: string,
    dto: UpdateLabelDto,
  ): Promise<LabelResponseDto> {
    this.logger.debug(`Updating label: ${labelId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);

    // If name is not provided, get current label to preserve its name
    let name = dto.name;
    if (!name) {
      const labels = await provider.listLabels();
      const currentLabel = labels.find((l) => l.id === labelId);
      if (!currentLabel) {
        throw new NotFoundException(`Label with id ${labelId} not found`);
      }
      name = currentLabel.name;
    }

    const label = await provider.updateLabel(
      labelId,
      name,
      dto.color,
    );

    return {
      id: label.id,
      name: label.name,
      type: label.type,
      color: label.color,
    };
  }

  /**
   * Delete label
   */
  async deleteLabel(
    userId: string,
    emailAccountId: string,
    labelId: string,
  ): Promise<void> {
    this.logger.debug(`Deleting label: ${labelId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    await provider.deleteLabel(labelId);
  }

  // ----------------- Attachment Operations -----------------

  /**
   * Get attachment content
   */
  async getAttachment(
    userId: string,
    emailAccountId: string,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    this.logger.debug(`Getting attachment: ${attachmentId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    return await provider.getAttachment(messageId, attachmentId);
  }

  // ----------------- Profile Operations -----------------

  /**
   * Get user profile from provider
   */
  async getProfile(userId: string, emailAccountId: string) {
    this.logger.debug(`Getting profile for account: ${emailAccountId}`);

    const provider = await this.providerRegistry.getProvider(emailAccountId);
    return await provider.getProfile();
  }

  // ----------------- Helper Methods -----------------

  /**
   * Map provider email message to response DTO
   */
  private mapToResponseDto(message: any): EmailMessageResponseDto {
    return {
      id: message.id,
      threadId: message.threadId,
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo,
      subject: message.subject,
      snippet: message.snippet,
      date: message.date,
      isRead: message.isRead,
      isStarred: message.isStarred,
      hasAttachments: message.hasAttachments,
      labels: message.labels,
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
    };
  }
}
