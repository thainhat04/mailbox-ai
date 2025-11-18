import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsEnum, IsOptional } from "class-validator";

export enum MailboxType {
  INBOX = "inbox",
  STARRED = "starred",
  SENT = "sent",
  DRAFTS = "drafts",
  ARCHIVE = "archive",
  TRASH = "trash",
  CUSTOM = "custom",
}

export class MailboxDto {
  @ApiProperty({ example: "inbox" })
  @IsString()
  id: string;

  @ApiProperty({ example: "Inbox" })
  @IsString()
  name: string;

  @ApiProperty({ enum: MailboxType, example: MailboxType.INBOX })
  @IsEnum(MailboxType)
  type: MailboxType;

  @ApiProperty({ example: 12 })
  @IsNumber()
  unreadCount: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  totalCount: number;

  @ApiProperty({ example: "inbox", required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: "#1976d2", required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  order: number;
}
