import { Injectable, Logger } from '@nestjs/common';
import { ImapService, ImapConnectionConfig, MailMessage } from '../email/services/imap.service';
import { OAuth2TokenService, OAuth2TokenData } from '../email/services/oauth2-token.service';
import { MailProvider } from '@prisma/client';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly imapService: ImapService,
    private readonly oauth2TokenService: OAuth2TokenService,
  ) { }

  async saveOAuth2Token(tokenData: OAuth2TokenData) {
    await this.oauth2TokenService.saveToken(tokenData);
    await this.imapService.saveImapConfig(
      tokenData.userId,
      tokenData.provider,
      tokenData.email,
    );
  }

  async getUserMailAccounts(userId: string) {
    const tokens = await this.oauth2TokenService.getUserTokens(userId);
    const configs = await this.imapService.getImapConfigs(userId);

    return tokens.map((token) => {
      const config = configs.find(
        (c) => c.provider === token.provider && c.email === token.email,
      );
      return {
        email: token.email,
        provider: token.provider,
        isExpired: token.expiresAt < new Date(),
        lastSync: config?.lastSyncAt,
        syncEnabled: config?.syncEnabled,
      };
    });
  }

  async fetchEmails(
    userId: string,
    provider: MailProvider,
    email: string,
    mailbox: string = 'INBOX',
    limit: number = 50,
  ): Promise<MailMessage[]> {
    const config: ImapConnectionConfig = { userId, provider, email };
    return this.imapService.fetchEmails(config, mailbox, limit);
  }

  async sendEmail(
    userId: string,
    provider: MailProvider,
    fromEmail: string,
    to: string | string[],
    subject: string,
    body: string,
    html?: string,
  ): Promise<void> {
    const config: ImapConnectionConfig = { userId, provider, email: fromEmail };
    await this.imapService.sendEmail(config, to, subject, body, html);
  }

  async disconnectMailAccount(
    userId: string,
    provider: MailProvider,
    email: string,
  ): Promise<void> {
    const config: ImapConnectionConfig = { userId, provider, email };
    await this.imapService.disconnect(config);
    await this.oauth2TokenService.deleteToken(userId, provider, email);
  }
}
