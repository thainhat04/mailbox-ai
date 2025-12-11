import { IsEnum, IsOptional, IsDateString } from 'class-validator';
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