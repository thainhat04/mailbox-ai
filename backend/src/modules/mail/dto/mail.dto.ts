import { IsEmail, IsEnum, IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MailProvider } from '@prisma/client';

export class SaveOAuth2TokenDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: MailProvider, example: MailProvider.GOOGLE })
  @IsEnum(MailProvider)
  provider: MailProvider;

  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ya29.a0...' })
  @IsString()
  accessToken: string;

  @ApiProperty({ example: '1//0g...' })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiProperty({ example: 'Bearer' })
  @IsString()
  @IsOptional()
  tokenType?: string;

  @ApiProperty({ example: '2024-12-30T12:00:00Z' })
  @IsString()
  expiresAt: string;

  @ApiProperty({ example: 'openid email profile https://mail.google.com/' })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiProperty({ example: 'eyJhbGciOiJSUzI1...' })
  @IsString()
  @IsOptional()
  idToken?: string;
}

export class FetchEmailsDto {
  @ApiProperty({ enum: MailProvider, example: MailProvider.GOOGLE })
  @IsEnum(MailProvider)
  provider: MailProvider;

  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'INBOX', required: false })
  @IsString()
  @IsOptional()
  mailbox?: string;

  @ApiProperty({ example: 50, required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class SendEmailDto {
  @ApiProperty({ enum: MailProvider, example: MailProvider.GOOGLE })
  @IsEnum(MailProvider)
  provider: MailProvider;

  @ApiProperty({ example: 'sender@gmail.com' })
  @IsEmail()
  fromEmail: string;

  @ApiProperty({ example: ['recipient@example.com'], type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiProperty({ example: 'Hello from IMAP connector' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'This is the email body' })
  @IsString()
  body: string;

  @ApiProperty({ example: '<p>This is the <b>email body</b></p>', required: false })
  @IsString()
  @IsOptional()
  html?: string;
}

export class MailAccountDto {
  @ApiProperty({ example: 'user@gmail.com' })
  email: string;

  @ApiProperty({ enum: MailProvider, example: MailProvider.GOOGLE })
  provider: MailProvider;

  @ApiProperty({ example: false })
  isExpired: boolean;

  @ApiProperty({ example: '2024-11-30T12:00:00Z', required: false })
  lastSync?: Date | null;

  @ApiProperty({ example: true })
  syncEnabled: boolean;
}
