import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailDto } from './email.dto';

// Update Kanban Status DTO
export class UpdateKanbanStatusDto {
  @ApiProperty({
    description: 'Email kanban status',
    enum: ['INBOX', 'TODO', 'PROCESSING', 'DONE', 'FROZEN'],
    example: 'TODO'
  })
  @IsEnum(['INBOX', 'TODO', 'PROCESSING', 'DONE', 'FROZEN'])
  status: string;
}

// Snooze Email DTO
export class SnoozeEmailDto {
  @ApiProperty({
    description: 'Snooze duration',
    enum: ['1_HOUR', '3_HOURS', '1_DAY', '3_DAYS', '1_WEEK', 'CUSTOM'],
    example: '1_DAY'
  })
  @IsEnum(['1_HOUR', '3_HOURS', '1_DAY', '3_DAYS', '1_WEEK', 'CUSTOM'])
  duration: string;

  @ApiProperty({
    description: 'Custom date-time for CUSTOM duration',
    example: '2025-12-10T10:00:00Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  customDateTime?: string; // For CUSTOM duration
}

// Kanban Board Response DTO
export class KanbanBoardDto {
  inbox: EmailDto[];
  todo: EmailDto[];
  processing: EmailDto[];
  done: EmailDto[];
  frozen: EmailDto[];
}

// Summary Response DTO
export class EmailSummaryDto {
  summary: string;
  generatedAt: Date;
}

// Kanban Filter Options
export class KanbanFilterDto {
  @ApiProperty({
    description: 'Show only unread emails',
    required: false,
    example: false
  })
  @IsOptional()
  unreadOnly?: boolean;

  @ApiProperty({
    description: 'Show only emails with attachments',
    required: false,
    example: false
  })
  @IsOptional()
  hasAttachmentsOnly?: boolean;

  @ApiProperty({
    description: 'Filter by sender email',
    required: false,
    example: 'sender@example.com'
  })
  @IsOptional()
  @IsString()
  fromEmail?: string;
}

// Kanban Sort Options
export enum SortBy {
  DATE_DESC = 'date_desc', // Newest first
  DATE_ASC = 'date_asc', // Oldest first
  SENDER = 'sender', // By sender name alphabetically
}

export class KanbanSortDto {
  @ApiProperty({
    description: 'Sort criteria',
    enum: SortBy,
    required: false,
    example: SortBy.DATE_DESC
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;
}