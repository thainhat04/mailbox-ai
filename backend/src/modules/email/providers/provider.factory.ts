import { Injectable, Logger } from '@nestjs/common';
import { IMailProvider } from '../interfaces/mail-provider.interface';
import { GmailProvider } from './gmail/gmail.provider';
import { OutlookProvider } from './outlook/outlook.provider';

/**
 * Provider Factory
 * Creates and manages mail provider instances
 */
@Injectable()
export class MailProviderFactory {
  private readonly logger = new Logger(MailProviderFactory.name);
  private readonly providers = new Map<string, () => IMailProvider>();

  constructor() {
    this.registerProviders();
  }

  /**
   * Register all available providers
   */
  private registerProviders(): void {
    this.providers.set('google', () => new GmailProvider());
    this.providers.set('microsoft', () => new OutlookProvider());

    this.logger.log(
      `Registered ${this.providers.size} mail providers: ${Array.from(this.providers.keys()).join(', ')}`,
    );
  }

  /**
   * Create a provider instance
   */
  createProvider(provider: string): IMailProvider {
    const providerFactory = this.providers.get(provider.toLowerCase());

    if (!providerFactory) {
      throw new Error(`Unsupported mail provider: ${provider}`);
    }

    this.logger.debug(`Creating provider instance: ${provider}`);
    return providerFactory();
  }

  /**
   * Get list of supported providers
   */
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is supported
   */
  isProviderSupported(provider: string): boolean {
    return this.providers.has(provider.toLowerCase());
  }
}
