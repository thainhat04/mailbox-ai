import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AttachmentDto } from "./attachment.dto";

export class ReplyEmailDto {
  @ApiPropertyOptional({
    example: "Hello, this is a reply",
    description: "Nội dung trả lời dạng plain text",
  })
  @IsOptional()
  @IsString()
  replyText?: string;

  @ApiPropertyOptional({
    example: "<p>Hello, this is a reply</p>",
    description: "Nội dung trả lời dạng HTML",
  })
  @IsOptional()
  @IsString()
  replyHtml?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      "Nếu true, sẽ kèm theo nội dung mail gốc dưới dạng quoted block",
  })
  @IsOptional()
  @IsBoolean()
  includeQuoted?: boolean;

  @ApiPropertyOptional({
    type: [AttachmentDto],
    example: [
      {
        filename: "image.png",
        mimeType: "image/png",
        contentBase64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAn8B9pWjVb0AAAAASUVORK5CYII=",
      },
    ],
    description: "Danh sách file đính kèm kèm trả lời",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({
    example: "INBOX",
    description: "Hộp thư gửi từ (mặc định là INBOX)",
  })
  @IsOptional()
  @IsString()
  mailBox?: string;
}
