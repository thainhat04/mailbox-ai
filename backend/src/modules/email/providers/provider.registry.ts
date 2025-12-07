import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IMailProvider,
  ProviderCredentials,
} from '../interfaces/mail-provider.interface';
import { MailProviderFactory } from './provider.factory';
import { MailProviderType } from '../types/mail-provider.types';

/**
 * Provider Registry
 * Manages provider instances with credentials from database
 * Handles initialization, caching, and token refresh
 */
@Injectable()
export class MailProviderRegistry {
  private readonly logger = new Logger(MailProviderRegistry.name);
  private readonly providerCache = new Map<string, IMailProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: MailProviderFactory,
  ) { }

  /**
   * Get or create an initialized provider for an email account
   */
  async getProvider(emailAccountId: string): Promise<IMailProvider> {
    // Check cache first
    const cached = this.providerCache.get(emailAccountId);
    if (cached) {
      this.logger.debug(`Using cached provider for account: ${emailAccountId}`);
      return cached;
    }

    // Fetch email account with OAuth credentials
    const emailAccount = await this.prisma.emailAccount.findUnique({
      where: { id: emailAccountId },
      include: {
        account: true,
      },
    });

    if (!emailAccount) {
      throw new NotFoundException(
        `Email account not found: ${emailAccountId}`,
      );
    }

    if (!emailAccount.account) {
      throw new Error(
        `Email account ${emailAccountId} has no linked OAuth account`,
      );
    }

    // Validate account has required tokens
    if (!emailAccount.account.access_token) {
      throw new Error(
        `Account for ${emailAccountId} has no access token`,
      );
    }

    if (!emailAccount.account.expires_at) {
      throw new Error(
        `Account for ${emailAccountId} has no expiration date`,
      );
    }

    // Create credentials from account
    const credentials: ProviderCredentials = {
      accessToken: emailAccount.account.access_token,
      refreshToken: emailAccount.account.refresh_token || undefined,
      expiresAt: emailAccount.account.expires_at,
    };

    // Create and initialize provider
    const provider = this.providerFactory.createProvider(
      emailAccount.account.provider as MailProviderType,
    );
    await provider.initialize(credentials);

    // Cache the provider
    this.providerCache.set(emailAccountId, provider);
    this.logger.log(
      `Initialized provider for account: ${emailAccountId} (${emailAccount.account.provider})`,
    );

    return provider;
  }

  /**
   * Get provider by email address
   */
  async getProviderByEmail(email: string): Promise<IMailProvider> {
    const emailAccount = await this.prisma.emailAccount.findUnique({
      where: { email },
    });

    if (!emailAccount) {
      throw new NotFoundException(`Email account not found: ${email}`);
    }

    return this.getProvider(emailAccount.id);
  }

  /**
   * Get provider for a user's primary email account
   */
  async getProviderForUser(
    userId: string,
    provider?: MailProviderType,
  ): Promise<IMailProvider> {
    const emailAccount = await this.prisma.emailAccount.findFirst({
      where: {
        userId,
        account: provider ? { provider } : undefined,
      },
      include: {
        account: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!emailAccount) {
      throw new NotFoundException(
        `No email account found for user: ${userId}`,
      );
    }

    return this.getProvider(emailAccount.id);
  }

  /**
   * Clear cached provider (useful after token refresh)
   */
  clearCache(emailAccountId: string): void {
    this.providerCache.delete(emailAccountId);
    this.logger.debug(`Cleared cache for account: ${emailAccountId}`);
  }

  /**
   * Clear all cached providers
   */
  clearAllCache(): void {
    this.providerCache.clear();
    this.logger.log('Cleared all provider cache');
  }

  /**
   * Refresh token and update database
   */
  async refreshToken(emailAccountId: string): Promise<void> {
    const provider = await this.getProvider(emailAccountId);

    if (!provider.refreshAccessToken) {
      throw new Error('Provider does not support token refresh');
    }

    this.logger.log(`Refreshing token for account: ${emailAccountId}`);

    // Refresh the token
    const newCredentials = await provider.refreshAccessToken();

    // Update database
    const emailAccount = await this.prisma.emailAccount.findUnique({
      where: { id: emailAccountId },
      include: {
        account: true,
      },
    });

    if (emailAccount?.account?.id) {
      await this.prisma.account.update({
        where: { id: emailAccount.account.id },
        data: {
          access_token: newCredentials.accessToken,
          refresh_token: newCredentials.refreshToken,
          expires_at: newCredentials.expiresAt,
          updatedAt: new Date(),
        },
      });
    }

    // Clear cache to force re-initialization
    this.clearCache(emailAccountId);

    this.logger.log(`Token refreshed for account: ${emailAccountId}`);
  }

  /**
   * Get all providers for a user
   */
  async getProvidersForUser(userId: string): Promise<
    Array<{
      emailAccountId: string;
      provider: IMailProvider;
      email: string;
      providerType: MailProviderType;
    }>
  > {
    const emailAccounts = await this.prisma.emailAccount.findMany({
      where: {
        userId,
      },
      include: {
        account: true,
      },
    });

    const providers = await Promise.all(
      emailAccounts
        .filter((account) => account.account !== null)
        .map(async (account) => ({
          emailAccountId: account.id,
          provider: await this.getProvider(account.id),
          email: account.email,
          providerType: account.account!.provider as MailProviderType,
        })),
    );

    return providers;
  }
}
