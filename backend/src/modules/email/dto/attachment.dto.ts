import { IsOptional, IsString, Matches, IsBase64 } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AttachmentDto {
  /**
   * filename (example: invoice.pdf)
   */
  @ApiProperty({
    example: "image.png",
    description: "Tên file đính kèm",
  })
  @IsString({ message: "Filename must be a string." })
  @Matches(/^[^\\/:*?"<>|]+$/, {
    message: "Filename contains invalid characters.",
  })
  filename: string;

  /**
   * mime type (example: application/pdf)
   */
  @ApiProperty({
    example: "image/png",
    description: "Kiểu MIME của file",
  })
  @IsString({ message: "MimeType must be a string." })
  @Matches(/^[a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+$/, {
    message: "MimeType format is invalid.",
  })
  mimeType: string;

  /**
   * content encoded as base64. Optional
   */
  @ApiPropertyOptional({
    example:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAn8B9pWjVb0AAAAASUVORK5CYII=",
    description: "Nội dung file dạng base64",
  })
  @IsOptional()
  @IsBase64()
  contentBase64?: string;

  /**
   * optional: temporary URL or path (if frontend uploads to server first)
   */
  @ApiPropertyOptional({
    example: "https://your-server.com/temp/upload/file123.png",
    description: "URL tạm nếu frontend upload trước",
  })
  @IsOptional()
  @IsString({ message: "URL must be a string." })
  url?: string;
}
