import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { PaginationMeta } from "./pagination.dto";

export class ResponseDto<T> {
  @ApiProperty({
    description: "Indicates if the request was successful",
  })
  success: boolean;

  @ApiPropertyOptional({
    description: "Response message",
  })
  message?: string;

  @ApiPropertyOptional({
    description: "Response data",
  })
  data?: T;

  @ApiPropertyOptional({
    description: "Pagination metadata",
  })
  meta?: PaginationMeta;

  @ApiPropertyOptional({
    description: "Response code",
  })
  code?: string;

  constructor(
    success: boolean,
    message?: string,
    data?: T,
    meta?: PaginationMeta,
    code?: string,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.code = code;
  }

  static success<T>(
    data?: T,
    message?: string,
    meta?: PaginationMeta,
    code?: string,
  ): ResponseDto<T> {
    return new ResponseDto(true, message, data, meta, code);
  }

  static error(message?: string, code?: string): ResponseDto<null> {
    return new ResponseDto(false, message, null, undefined, code);
  }
}
