import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { ErrorCode } from "../constants";
import { IsEnum, IsOptional, IsString, IsBoolean } from "class-validator";

export class ErrorDto {
  @ApiProperty({
    description: "Indicates the request failed",
    example: false,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: "Error message",
    example: "An error occurred",
  })
  message: string;

  @ApiProperty({
    description: "Error code",
    example: "INTERNAL_SERVER_ERROR",
  })
  errorCode: ErrorCode;

  @ApiPropertyOptional({
    description: "HTTP status code",
    example: 500,
  })
  statusCode?: number;

  @ApiPropertyOptional({
    description: "Detailed error information",
  })
  details?: any;

  @ApiPropertyOptional({
    description: "Timestamp when error occurred",
    example: "2024-01-01T00:00:00.000Z",
  })
  timestamp?: string;

  @ApiPropertyOptional({
    description: "Request path that caused the error",
    example: "/api/users",
  })
  path?: string;

  constructor(
    message: string,
    errorCode: ErrorCode,
    statusCode?: number,
    details?: any,
    path?: string,
  ) {
    this.success = false;
    this.message = message;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.path = path;
  }
}
