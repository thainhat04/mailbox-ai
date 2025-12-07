import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";

export class LabelDto {
  @ApiProperty({ example: "INBOX", description: "Label ID from provider" })
  @IsString()
  id: string;

  @ApiProperty({ example: "Inbox", description: "Display name" })
  @IsString()
  name: string;

  @ApiProperty({ example: "system", description: "Label type: system or user" })
  @IsString()
  type: "system" | "user";

  @ApiProperty({ example: 12, description: "Number of unread emails" })
  @IsNumber()
  unreadCount: number;

  @ApiProperty({ example: 150, description: "Total number of emails" })
  @IsNumber()
  totalCount: number;

  @ApiProperty({ example: "#1976d2", required: false, description: "Label color" })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: "show", required: false, description: "Message list visibility" })
  @IsOptional()
  @IsString()
  messageListVisibility?: string;

  @ApiProperty({ example: "labelShow", required: false, description: "Label list visibility" })
  @IsOptional()
  @IsString()
  labelListVisibility?: string;
}