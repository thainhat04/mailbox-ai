import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsArray,
  ArrayMinSize,
} from "class-validator";
import { LabelDto } from "./label.dto";

// ============ RESPONSE DTOs ============

export class KanbanColumnDto {
  @ApiProperty({ example: "uuid-123" })
  id: string;

  @ApiProperty({ example: "To Do" })
  name: string;

  @ApiProperty({ example: "TODO", required: false, nullable: true })
  key: string | null;

  @ApiProperty({ example: "#F59E0B", required: false, nullable: true })
  color: string | null;

  @ApiProperty({ example: "📝", required: false, nullable: true })
  icon: string | null;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ example: "Label_832819", required: false, nullable: true })
  gmailLabelId: string | null;

  @ApiProperty({ example: "To Do", required: false, nullable: true })
  gmailLabelName: string | null;

  @ApiProperty({
    description: "Gmail label information",
    required: false,
    nullable: true,
    type: () => LabelDto,
  })
  label: LabelDto | null;

  @ApiProperty({ example: false })
  isSystemProtected: boolean;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  createdAt: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  updatedAt: string;
}

// ============ REQUEST DTOs ============

export class CreateKanbanColumnDto {
  @ApiProperty({
    description: "Column name",
    example: "Việc Gấp",
    maxLength: 40,
  })
  @IsString()
  @MaxLength(40, { message: "Column name must be at most 40 characters" })
  name: string;

  @ApiProperty({
    description: "Column color (hex format)",
    example: "#F59E0B",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "Color must be a valid hex color (e.g., #FF0000 or #F00)",
  })
  color?: string;

  @ApiProperty({
    description: "Column icon (emoji or lucide icon name)",
    example: "📝",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({
    description: "Gmail label name (optional, defaults to column name)",
    example: "Important",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gmailLabelName?: string;
}

export class UpdateKanbanColumnDto {
  @ApiProperty({
    description: "Column name",
    example: "Lưu Trữ",
    required: false,
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @ApiProperty({
    description: "Column color (hex format)",
    example: "#10B981",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "Color must be a valid hex color",
  })
  color?: string;

  @ApiProperty({
    description: "Column icon",
    example: "✅",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({
    description: "Gmail label name (optional)",
    example: "Done",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gmailLabelName?: string;
}

export class ReorderColumnsDto {
  @ApiProperty({
    description: "Array of column IDs in new order",
    example: ["uuid-1", "uuid-2", "uuid-3"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  columnIds: string[];
}
