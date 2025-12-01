import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ModifyEmailFlagsDto {
  @ApiPropertyOptional({
    example: true,
    description: "Đánh dấu email là đã đọc hoặc chưa đọc",
  })
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: "Đánh dấu sao email",
  })
  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: "Xoá email (chỉ đặt flag \\Deleted, không xoá ngay)",
  })
  @IsOptional()
  @IsBoolean()
  delete?: boolean;
}

export class ModifyEmailDto {
  @ApiPropertyOptional({
    example: "INBOX",
    description: "Tên mailbox muốn chỉnh sửa (mặc định là INBOX)",
  })
  @IsOptional()
  @IsString()
  mailBox?: string;

  @ApiProperty({
    description: "Các flag muốn thay đổi",
    example: {
      read: true,
      starred: false,
      delete: false,
    },
  })
  @ValidateNested()
  @Type(() => ModifyEmailFlagsDto)
  flags: ModifyEmailFlagsDto;
}
