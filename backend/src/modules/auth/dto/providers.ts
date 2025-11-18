import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUrl, IsOptional } from "class-validator";

export enum OAuthProvider {
  GOOGLE = "google",
  MICROSOFT = "microsoft",
}

export class OAuthSignInDto {
  @ApiProperty({
    description: "Provider sign in domain",
    example: "https://example.com",
  })
  @IsString({ message: "Domain must be a string" })
  @IsNotEmpty({ message: "Domain is required" })
  @IsUrl({}, { message: "Domain must be a valid URL" })
  domain: string;
}

export class OAuthSignInResponseDto {
  @ApiProperty({
    description: "Provider sign in response",
    example: "https://example.com",
  })
  response: string;
}

export class OAuthCallbackDto {
  @ApiProperty({
    description: "Authorization code from OAuth provider",
    example:
      "4/0Ab32j90A0jYpYKV1ZXutBXesUOHLX3gI1gnE6otfzdOyDODrafdng_XUchCZ9GLkRFZqkw",
  })
  @IsString({ message: "Code must be a string" })
  @IsNotEmpty({ message: "Code is required" })
  code: string;

  @ApiProperty({
    description: "State parameter for CSRF protection",
    example:
      "E2WQuWuLHjypaEuScKnOusTQAnprXuzBEkwKrCQGH8Q%3D%7Chttps%3A%2F%2Fexample.com",
  })
  @IsString({ message: "State must be a string" })
  @IsNotEmpty({ message: "State is required" })
  state: string;

  @ApiProperty({
    description: "OAuth scopes granted (optional, provider may include)",
    example: "email profile openid",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Scope must be a string" })
  scope?: string;

  @ApiProperty({
    description: "Auth user index (optional, Google may include)",
    example: "1",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Authuser must be a string" })
  authuser?: string;

  @ApiProperty({
    description: "Prompt parameter (optional, provider may include)",
    example: "consent",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Prompt must be a string" })
  prompt?: string;
}
