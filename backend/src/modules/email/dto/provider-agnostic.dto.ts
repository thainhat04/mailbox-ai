import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEmail, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// -------------------------------------------------------------
// EMAIL ADDRESS DTO
// -------------------------------------------------------------

export class EmailAddressDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;
}

// -------------------------------------------------------------
// LIST MESSAGES DTO
// -------------------------------------------------------------

export class ListMessagesDto {
  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsNumber()
  @IsOptional()
  maxResults?: number = 50;

  @ApiPropertyOptional({ example: 'nextPageToken' })
  @IsString()
  @IsOptional()
  pageToken?: string;

  @ApiPropertyOptional({ example: ['INBOX', 'UNREAD'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labelIds?: string[];

  @ApiPropertyOptional({ example: 'subject:invoice' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  includeSpam?: boolean = false;
}

// -------------------------------------------------------------
// SEND EMAIL DTO
// -------------------------------------------------------------

export class AttachmentDto {
  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Base64 encoded content' })
  @IsString()
  content: string;
}

export class SendEmailDto {
  @ApiProperty({ type: [EmailAddressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  to: EmailAddressDto[];

  @ApiPropertyOptional({ type: [EmailAddressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  @IsOptional()
  cc?: EmailAddressDto[];

  @ApiPropertyOptional({ type: [EmailAddressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  @IsOptional()
  bcc?: EmailAddressDto[];

  @ApiProperty({ example: 'Meeting Tomorrow' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ example: 'Plain text body' })
  @IsString()
  @IsOptional()
  bodyText?: string;

  @ApiPropertyOptional({ example: '<p>HTML body</p>' })
  @IsString()
  @IsOptional()
  bodyHtml?: string;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ example: '<message-id@example.com>' })
  @IsString()
  @IsOptional()
  inReplyTo?: string;

  @ApiPropertyOptional({ example: ['<ref1@example.com>', '<ref2@example.com>'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  references?: string[];
}

// -------------------------------------------------------------
// MODIFY EMAIL DTO
// -------------------------------------------------------------

export class ModifyEmailDto {
  @ApiPropertyOptional({ example: ['INBOX', 'IMPORTANT'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addLabelIds?: string[];

  @ApiPropertyOptional({ example: ['UNREAD'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removeLabelIds?: string[];
}

// -------------------------------------------------------------
// MARK READ/UNREAD DTO
// -------------------------------------------------------------

export class MarkReadDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isRead: boolean;
}

// -------------------------------------------------------------
// STAR/UNSTAR DTO
// -------------------------------------------------------------

export class MarkStarredDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isStarred: boolean;
}

// -------------------------------------------------------------
// CREATE LABEL DTO
// -------------------------------------------------------------

export class CreateLabelDto {
  @ApiProperty({ example: 'Work' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsString()
  @IsOptional()
  color?: string;
}

// -------------------------------------------------------------
// UPDATE LABEL DTO
// -------------------------------------------------------------

export class UpdateLabelDto {
  @ApiPropertyOptional({ example: 'Personal' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '#00FF00' })
  @IsString()
  @IsOptional()
  color?: string;
}

// -------------------------------------------------------------
// RESPONSE DTOs
// -------------------------------------------------------------

export class EmailMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  threadId: string;

  @ApiProperty({ type: EmailAddressDto })
  from: EmailAddressDto;

  @ApiProperty({ type: [EmailAddressDto] })
  to: EmailAddressDto[];

  @ApiPropertyOptional({ type: [EmailAddressDto] })
  cc?: EmailAddressDto[];

  @ApiPropertyOptional({ type: [EmailAddressDto] })
  bcc?: EmailAddressDto[];

  @ApiPropertyOptional()
  replyTo?: string;

  @ApiProperty()
  subject: string;

  @ApiPropertyOptional()
  snippet?: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  isStarred: boolean;

  @ApiProperty()
  hasAttachments: boolean;

  @ApiProperty({ type: [String] })
  labels: string[];

  @ApiPropertyOptional()
  bodyText?: string;

  @ApiPropertyOptional()
  bodyHtml?: string;
}

export class EmailThreadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: [EmailMessageResponseDto] })
  messages: EmailMessageResponseDto[];
}

export class LabelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['system', 'user'] })
  type: 'system' | 'user';

  @ApiPropertyOptional()
  color?: string;
}

export class ListMessagesResponseDto {
  @ApiProperty({ type: [EmailMessageResponseDto] })
  messages: EmailMessageResponseDto[];

  @ApiPropertyOptional()
  nextPageToken?: string;

  @ApiPropertyOptional()
  resultSizeEstimate?: number;
}

// -------------------------------------------------------------
// SYNC STATE DTO
// -------------------------------------------------------------

export class SyncStateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  historyId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deltaLink?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pageToken?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  syncToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  lastSyncTime?: Date;
}
