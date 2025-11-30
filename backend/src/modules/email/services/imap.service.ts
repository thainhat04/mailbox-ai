import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { OAuth2TokenService } from './oauth2-token.service';
import { MailProvider } from '@prisma/client';
import Imap = require('imap');
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface ImapConnectionConfig {
  userId: string;
  provider: MailProvider;
  email: string;
}

export interface MailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);
  private connections: Map<string, any> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth2TokenService: OAuth2TokenService,
  ) { }

  private getConnectionKey(userId: string, provider: MailProvider, email: string): string {
    return `${userId}:${provider}:${email}`;
  }

  /**
   * Format OAuth2 token for XOAUTH2 IMAP authentication
   * The imap library expects base64-encoded XOAUTH2 format:
   * Format: user=<email>\x01auth=Bearer <token>\x01\x01
   * Then base64 encode it
   * 
   * Reference: https://developers.google.com/gmail/imap/xoauth2-protocol
   */
  private formatXoauth2Token(email: string, accessToken: string): string {
    // XOAUTH2 format: user=<email>\x01auth=Bearer <token>\x01\x01
    const authString = `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`;
    const base64Token = Buffer.from(authString).toString('base64');
    this.logger.debug(`Formatted XOAUTH2 token (length: ${base64Token.length})`);
    return base64Token;
  }

  private async getImapConfig(provider: MailProvider, email: string, accessToken: string): Promise<Imap.Config> {
    // Format the OAuth2 token for XOAUTH2 authentication
    // Some imap library versions expect base64-encoded XOAUTH2 format
    const xoauth2Token = this.formatXoauth2Token(email, accessToken);

    this.logger.debug(`Creating IMAP config for ${email} (${provider})`);

    const baseConfig: Partial<Imap.Config> = {
      user: email,
      xoauth2: xoauth2Token,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000, // 10 seconds connection timeout
      authTimeout: 5000,  // 5 seconds auth timeout
    };

    if (provider === MailProvider.GOOGLE) {
      return {
        ...baseConfig,
        host: 'imap.gmail.com',
        port: 993,
      } as Imap.Config;
    } else if (provider === MailProvider.MICROSOFT) {
      return {
        ...baseConfig,
        host: 'outlook.office365.com',
        port: 993,
      } as Imap.Config;
    }

    throw new Error('Unsupported provider');
  }

  private async getSmtpConfig(provider: MailProvider, email: string, accessToken: string) {
    const auth = {
      type: 'OAuth2',
      user: email,
      accessToken: accessToken,
    };

    if (provider === MailProvider.GOOGLE) {
      return {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth,
      };
    } else if (provider === MailProvider.MICROSOFT) {
      return {
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth,
      };
    }

    throw new Error('Unsupported provider');
  }

  async connect(config: ImapConnectionConfig): Promise<Imap> {
    const { userId, provider, email } = config;
    const key = this.getConnectionKey(userId, provider, email);

    // Check if connection already exists
    if (this.connections.has(key)) {
      return this.connections.get(key)!;
    }

    // Get OAuth2 token
    let token = await this.oauth2TokenService.getToken(userId, provider, email);
    if (!token) {
      throw new Error('No OAuth2 token found');
    }

    // Log token info for debugging (without exposing the actual token)
    this.logger.debug(`Token found: expiresAt=${token.expiresAt}, scope=${token.scope?.substring(0, 50)}...`);

    // Check if token is expired and refresh if needed
    if (await this.oauth2TokenService.isTokenExpired(token)) {
      this.logger.log(`Token expired, refreshing for ${email}`);
      const newAccessToken = await this.oauth2TokenService.refreshToken(userId, provider, email);
      token = await this.oauth2TokenService.saveToken({
        userId,
        provider,
        email,
        accessToken: newAccessToken,
        refreshToken: token.refreshToken ?? undefined,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        scope: token.scope ?? undefined,
      });
      this.logger.log(`Token refreshed successfully for ${email}`);
    }

    // Validate token has required scopes for IMAP
    if (token.scope) {
      const requiredScopes = provider === MailProvider.GOOGLE
        ? ['https://mail.google.com/', 'gmail.modify']
        : ['IMAP.AccessAsUser.All'];

      const hasRequiredScope = requiredScopes.some(scope =>
        token.scope?.toLowerCase().includes(scope.toLowerCase())
      );

      if (!hasRequiredScope) {
        this.logger.warn(`Token may not have required IMAP scopes. Current scope: ${token.scope}`);
      }
    }

    // Get IMAP configuration
    const imapConfig = await this.getImapConfig(provider, email, token.accessToken);

    this.logger.log(`Attempting IMAP connection for ${email} (${provider})`);
    this.logger.debug(`IMAP config: host=${imapConfig.host}, port=${imapConfig.port}, user=${imapConfig.user}`);

    // Create IMAP connection
    const imap = new Imap(imapConfig);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        imap.end();
        reject(new Error('IMAP connection timeout'));
      }, 30000); // 30 seconds timeout

      imap.once('ready', () => {
        clearTimeout(timeout);
        this.logger.log(`IMAP connection established for ${email}`);
        this.connections.set(key, imap);
        resolve(imap);
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        this.logger.error(`IMAP connection error for ${email}:`, err);
        this.logger.error(`Error details: ${err.message}`);
        if (err.message.includes('SASL')) {
          this.logger.error('SASL authentication error - check OAuth2 token format and scopes');
        }
        reject(err);
      });

      imap.once('end', () => {
        clearTimeout(timeout);
        this.logger.log(`IMAP connection ended for ${email}`);
      });

      try {
        imap.connect();
      } catch (connectError) {
        clearTimeout(timeout);
        this.logger.error(`Failed to initiate IMAP connection: ${connectError}`);
        reject(connectError);
      }
    });
  }

  async disconnect(config: ImapConnectionConfig): Promise<void> {
    const { userId, provider, email } = config;
    const key = this.getConnectionKey(userId, provider, email);

    const imap = this.connections.get(key);
    if (imap) {
      imap.end();
      this.connections.delete(key);
      this.logger.log(`IMAP connection closed for ${email}`);
    }
  }

  async fetchEmails(config: ImapConnectionConfig, mailbox: string = 'INBOX', limit: number = 50): Promise<MailMessage[]> {
    const imap = await this.connect(config);

    return new Promise((resolve, reject) => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const fetchCount = Math.min(limit, box.messages.total);
        if (fetchCount === 0) {
          resolve([]);
          return;
        }

        const fetchRange = `${Math.max(1, box.messages.total - fetchCount + 1)}:${box.messages.total}`;
        const messages: MailMessage[] = [];

        const fetch = imap.seq.fetch(fetchRange, {
          bodies: ['HEADER', 'TEXT'],
          struct: true,
        });

        fetch.on('message', (msg, seqno) => {
          const message: Partial<MailMessage> = { id: seqno.toString() };

          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', () => {
              if (info.which === 'HEADER') {
                const header = Imap.parseHeader(buffer);
                message.from = header.from?.[0] || '';
                message.to = header.to || [];
                message.subject = header.subject?.[0] || '';
                message.date = new Date(header.date?.[0] || Date.now());
              } else if (info.which === 'TEXT') {
                message.body = buffer;
              }
            });
          });

          msg.once('end', () => {
            if (message.from && message.subject) {
              messages.push(message as MailMessage);
            }
          });
        });

        fetch.once('error', reject);
        fetch.once('end', () => {
          resolve(messages);
        });
      });
    });
  }

  async sendEmail(
    config: ImapConnectionConfig,
    to: string | string[],
    subject: string,
    body: string,
    html?: string,
  ): Promise<void> {
    const { userId, provider, email } = config;

    // Get OAuth2 token
    let token = await this.oauth2TokenService.getToken(userId, provider, email);
    if (!token) {
      throw new Error('No OAuth2 token found');
    }

    // Check if token is expired and refresh if needed
    if (await this.oauth2TokenService.isTokenExpired(token)) {
      const newAccessToken = await this.oauth2TokenService.refreshToken(userId, provider, email);
      token = await this.oauth2TokenService.saveToken({
        userId,
        provider,
        email,
        accessToken: newAccessToken,
        refreshToken: token.refreshToken ?? undefined,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scope: token.scope ?? undefined,
      });
    }

    // Get SMTP configuration
    const smtpConfig = await this.getSmtpConfig(provider, email, token.accessToken);

    // Create transporter
    const transporter: Transporter = nodemailer.createTransport(smtpConfig as any);

    // Send email
    await transporter.sendMail({
      from: email,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: body,
      html: html || body,
    });

    this.logger.log(`Email sent from ${email} to ${to}`);
  }

  async saveImapConfig(
    userId: string,
    provider: MailProvider,
    email: string,
  ): Promise<void> {
    const imapSettings = provider === MailProvider.GOOGLE
      ? { host: 'imap.gmail.com', port: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 }
      : { host: 'outlook.office365.com', port: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 };

    await this.prisma.imapConfig.upsert({
      where: {
        userId_provider_email: {
          userId,
          provider,
          email,
        },
      },
      update: {
        imapHost: imapSettings.host,
        imapPort: imapSettings.port,
        smtpHost: imapSettings.smtpHost,
        smtpPort: imapSettings.smtpPort,
        updatedAt: new Date(),
      },
      create: {
        userId,
        provider,
        email,
        imapHost: imapSettings.host,
        imapPort: imapSettings.port,
        smtpHost: imapSettings.smtpHost,
        smtpPort: imapSettings.smtpPort,
      },
    });
  }

  async getImapConfigs(userId: string) {
    return this.prisma.imapConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
