import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AttachmentDto } from "./attachment.dto";

export class SendEmailDto {
  @ApiProperty({
    example: "nhatmonsterhack@gmail.com",
    description: "Địa chỉ email nhận",
  })
  @IsEmail()
  to: string;

  @ApiPropertyOptional({
    example: ["fansofmm93@gmail.com", "nguyenminhtoan131104@gmail.com"],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({
    example: [],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiProperty({
    example: "Sample email with attachment",
  })
  @IsString()
  subject: string;

  @ApiPropertyOptional({
    example: "This email contains a real base64 attachment.",
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    example: "<p>This email contains a real base64 attachment.</p>",
  })
  @IsOptional()
  @IsString()
  html?: string;

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
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
