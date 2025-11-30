import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { MailProvider } from '@prisma/client';

export interface OAuth2TokenData {
  userId: string;
  provider: MailProvider;
  email: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt: Date;
  scope?: string;
  idToken?: string;
}

@Injectable()
export class OAuth2TokenService {
  constructor(private readonly prisma: PrismaService) { }

  async saveToken(data: OAuth2TokenData) {
    return this.prisma.oAuth2Token.upsert({
      where: {
        userId_provider_email: {
          userId: data.userId,
          provider: data.provider,
          email: data.email,
        },
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType || 'Bearer',
        expiresAt: data.expiresAt,
        scope: data.scope,
        idToken: data.idToken,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        provider: data.provider,
        email: data.email,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType || 'Bearer',
        expiresAt: data.expiresAt,
        scope: data.scope,
        idToken: data.idToken,
      },
    });
  }

  async getToken(userId: string, provider: MailProvider, email: string) {
    return this.prisma.oAuth2Token.findUnique({
      where: {
        userId_provider_email: {
          userId,
          provider,
          email,
        },
      },
    });
  }

  async getUserTokens(userId: string) {
    return this.prisma.oAuth2Token.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isTokenExpired(token: { expiresAt: Date }): Promise<boolean> {
    return new Date() >= new Date(token.expiresAt);
  }

  async refreshToken(
    userId: string,
    provider: MailProvider,
    email: string,
  ): Promise<string> {
    const token = await this.getToken(userId, provider, email);
    if (!token || !token.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Refresh the token based on provider
    if (provider === MailProvider.GOOGLE) {
      return this.refreshGoogleToken(token.refreshToken);
    } else if (provider === MailProvider.MICROSOFT) {
      return this.refreshMicrosoftToken(token.refreshToken);
    }

    throw new Error('Unsupported provider');
  }

  private async refreshGoogleToken(refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google token');
    }

    const data = await response.json();
    return data.access_token;
  }

  private async refreshMicrosoftToken(refreshToken: string): Promise<string> {
    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send offline_access',
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to refresh Microsoft token');
    }

    const data = await response.json();
    return data.access_token;
  }

  async deleteToken(userId: string, provider: MailProvider, email: string) {
    return this.prisma.oAuth2Token.delete({
      where: {
        userId_provider_email: {
          userId,
          provider,
          email,
        },
      },
    });
  }
}
