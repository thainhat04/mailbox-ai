import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export enum SuggestionType {
  SENDER = "sender",
  SUBJECT_KEYWORD = "subject_keyword",
}

export class SuggestionItemDto {
  @ApiProperty({
    description: "Type of suggestion",
    enum: SuggestionType,
    example: SuggestionType.SENDER,
  })
  type: SuggestionType;

  @ApiProperty({
    description: "Suggestion text/value",
    example: "john.doe@example.com",
  })
  value: string;

  @ApiProperty({
    description: "Display label for the suggestion",
    example: "John Doe",
  })
  label: string;
}

export class SuggestionQueryDto {
  @ApiProperty({
    description: "Search query for suggestions",
    example: "john",
    required: true,
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: "Maximum number of suggestions to return",
    example: 5,
    required: false,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}

export class SuggestionResponseDto {
  @ApiProperty({
    description: "List of suggestions",
    type: [SuggestionItemDto],
  })
  suggestions: SuggestionItemDto[];

  @ApiProperty({
    description: "Query that was searched",
    example: "john",
  })
  query: string;
}
