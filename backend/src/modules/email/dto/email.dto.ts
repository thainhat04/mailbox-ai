import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class EmailAddressDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  name: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "https://ui-avatars.com/api/?name=John+Doe", required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class AttachmentDto {
  @ApiProperty({ example: "document.pdf" })
  @IsString()
  id: string;

  @ApiProperty({ example: "document.pdf" })
  @IsString()
  filename: string;

  @ApiProperty({ example: 1024000 })
  size: number;

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: "https://example.com/download/document.pdf" })
  @IsString()
  url: string;
}

export class EmailDto {
  @ApiProperty({ example: "e1" })
  @IsString()
  id: string;

  @ApiProperty({ type: EmailAddressDto })
  @ValidateNested()
  @Type(() => EmailAddressDto)
  from: EmailAddressDto;

  @ApiProperty({ type: [EmailAddressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  to: EmailAddressDto[];

  @ApiProperty({ type: [EmailAddressDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  cc?: EmailAddressDto[];

  @ApiProperty({ type: [EmailAddressDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  bcc?: EmailAddressDto[];

  @ApiProperty({ example: "Project Update - Q4 2024" })
  @IsString()
  subject: string;

  @ApiProperty({ example: "<p>Dear team...</p>" })
  @IsString()
  body: string;

  @ApiProperty({ example: "Dear team, here is the latest update..." })
  @IsString()
  preview: string;

  @ApiProperty({ example: "2024-11-18T10:30:00Z" })
  @IsString()
  timestamp: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isRead: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isStarred: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isImportant: boolean;

  @ApiProperty()
  @IsString()
  labelId?: string;

  @ApiProperty({ type: [AttachmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiProperty({ example: 3, required: false, description: "Number of emails in this thread" })
  @IsOptional()
  threadCount?: number;

  @ApiProperty({ type: [String], required: false, description: "IDs of emails in this thread" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  threadEmails?: string[];

  // Kanban workflow fields
  @ApiProperty({ example: "INBOX", required: false })
  @IsOptional()
  @IsString()
  kanbanStatus?: string;

  @ApiProperty({ example: "2024-11-20T15:30:00Z", required: false })
  @IsOptional()
  @IsString()
  statusChangedAt?: string;

  @ApiProperty({ example: "2024-11-20T16:30:00Z", required: false })
  @IsOptional()
  @IsString()
  snoozedUntil?: string;

  @ApiProperty({ example: "✨ AI Summary: This email discusses...", required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: "2024-11-20T15:30:00Z", required: false })
  @IsOptional()
  @IsString()
  summaryGeneratedAt?: string;
}

export class EmailListQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, default: "INBOX" })
  @IsOptional()
  @IsString()
  labelIds?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  starredOnly?: boolean;
}

export class EmailListResponseDto {
  @ApiProperty({ type: [EmailDto] })
  emails: EmailDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

