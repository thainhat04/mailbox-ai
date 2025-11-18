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

  @ApiProperty({ example: "inbox" })
  @IsString()
  mailboxId: string;

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
}

export class EmailListQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  limit?: number;

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
