import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { MailProvider, MailProviderType } from '../types/mail-provider.types';

export interface OAuth2TokenData {
  userId: string;
  provider: MailProviderType;
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
    // Get or create EmailAccount
    let emailAccount = await this.prisma.emailAccount.findUnique({
      where: { email: data.email },
    });

    if (!emailAccount) {
      emailAccount = await this.prisma.emailAccount.create({
        data: {
          email: data.email,
          userId: data.userId,
        },
      });
    }

    // Upsert Account (OAuth credentials)
    return this.prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: data.provider,
          providerAccountId: data.email, // Use email as providerAccountId if not provided
        },
      },
      update: {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_at: data.expiresAt,
        token_type: data.tokenType || 'Bearer',
        scope: data.scope,
        id_token: data.idToken,
        emailAccountId: emailAccount.id,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        provider: data.provider,
        providerAccountId: data.email,
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_at: data.expiresAt,
        token_type: data.tokenType || 'Bearer',
        scope: data.scope,
        id_token: data.idToken,
        emailAccountId: emailAccount.id,
      },
    });
  }

  async getToken(userId: string, provider: MailProviderType, email: string) {
    const emailAccount = await this.prisma.emailAccount.findUnique({
      where: { email },
      include: { account: true },
    });

    if (!emailAccount?.account) {
      return null;
    }

    // Map Account to OAuth2Token-like structure for compatibility
    return {
      userId: emailAccount.account.userId,
      provider: emailAccount.account.provider,
      email: emailAccount.email,
      accessToken: emailAccount.account.access_token,
      refreshToken: emailAccount.account.refresh_token,
      tokenType: emailAccount.account.token_type || 'Bearer',
      expiresAt: emailAccount.account.expires_at || new Date(),
      scope: emailAccount.account.scope,
      idToken: emailAccount.account.id_token,
    };
  }

  async getUserTokens(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      include: { emailAccount: true },
      orderBy: { createdAt: 'desc' },
    });

    // Map Account to OAuth2Token-like structure for compatibility
    return accounts.map((account) => ({
      userId: account.userId,
      provider: account.provider as MailProviderType,
      email: account.emailAccount?.email || '',
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      tokenType: account.token_type || 'Bearer',
      expiresAt: account.expires_at || new Date(),
      scope: account.scope,
      idToken: account.id_token,
    }));
  }

  async isTokenExpired(token: { expiresAt: Date }): Promise<boolean> {
    return new Date() >= new Date(token.expiresAt);
  }

  async refreshToken(
    userId: string,
    provider: MailProviderType,
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
          scope: 'https://outlook.office.com/Mail.ReadWrite https://outlook.office.com/Mail.Send offline_access',
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to refresh Microsoft token');
    }

    const data = await response.json();
    return data.access_token;
  }

  async deleteToken(userId: string, provider: MailProviderType, email: string) {
    const emailAccount = await this.prisma.emailAccount.findUnique({
      where: { email },
      include: { account: true },
    });

    if (emailAccount?.account) {
      return this.prisma.account.delete({
        where: { id: emailAccount.account.id },
      });
    }

    return null;
  }
}
