import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { OAuth2TokenService } from "./oauth2-token.service";
import { MailProvider } from "@prisma/client";
import Imap = require("imap");
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { simpleParser, ParsedMail } from "mailparser";

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
  // Threading fields
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
}

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);
  private connections: Map<string, any> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth2TokenService: OAuth2TokenService,
  ) {}

  private getConnectionKey(
    userId: string,
    provider: MailProvider,
    email: string,
  ): string {
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

  private async getImapConfig(
    provider: MailProvider,
    email: string,
    accessToken: string,
  ): Promise<Imap.Config> {
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
        host: "imap.gmail.com",
        port: 993,
      } as Imap.Config;
    } else if (provider === MailProvider.MICROSOFT) {
      return {
        ...baseConfig,
        host: "outlook.office365.com",
        port: 993,
      } as Imap.Config;
    }

    throw new Error("Unsupported provider");
  }

  private async getSmtpConfig(
    provider: MailProvider,
    email: string,
    accessToken: string,
  ) {
    const auth = {
      type: "OAuth2",
      user: email,
      accessToken: accessToken,
    };

    if (provider === MailProvider.GOOGLE) {
      return {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth,
      };
    } else if (provider === MailProvider.MICROSOFT) {
      return {
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth,
      };
    }

    throw new Error("Unsupported provider");
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
      throw new Error("No OAuth2 token found");
    }

    // Log token info for debugging (without exposing the actual token)
    this.logger.debug(`Token found: expiresAt=${token.expiresAt}, scope=${token.scope?.substring(0, 50)}...`);

    // Check if token is expired and refresh if needed
    if (await this.oauth2TokenService.isTokenExpired(token)) {
      this.logger.log(`Token expired, refreshing for ${email}`);
      const newAccessToken = await this.oauth2TokenService.refreshToken(
        userId,
        provider,
        email,
      );
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
    const imapConfig = await this.getImapConfig(
      provider,
      email,
      token.accessToken,
    );

    this.logger.log(`Attempting IMAP connection for ${email} (${provider})`);
    this.logger.debug(`IMAP config: host=${imapConfig.host}, port=${imapConfig.port}, user=${imapConfig.user}`);

    // Create IMAP connection
    const imap = new Imap(imapConfig);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        imap.end();
        reject(new Error('IMAP connection timeout'));
      }, 30000); // 30 seconds timeout

      imap.once("ready", () => {
        clearTimeout(timeout);
        this.logger.log(`IMAP connection established for ${email}`);
        this.connections.set(key, imap);
        resolve(imap);
      });

      imap.once("error", (err) => {
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

  async fetchEmails(
    config: ImapConnectionConfig,
    mailbox: string = "INBOX",
    limit: number = 50,
  ): Promise<MailMessage[]> {
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
        const messagePromises: Promise<void>[] = [];

        const fetch = imap.seq.fetch(fetchRange, {
          bodies: "",
          struct: true,
        });

        fetch.on("message", (msg, seqno) => {
          let messageUid = seqno.toString();
          let emailBuffer = Buffer.alloc(0);

          // Get UID for unique identification
          msg.once("attributes", (attrs) => {
            if (attrs.uid) {
              messageUid = attrs.uid.toString();
            }
          });

          msg.on("body", (stream, info) => {
            stream.on("data", (chunk) => {
              emailBuffer = Buffer.concat([emailBuffer, chunk]);
            });
          });

          const messagePromise = new Promise<void>((resolveMsg, rejectMsg) => {
            msg.once("end", async () => {
              try {
                const parsed: ParsedMail = await simpleParser(emailBuffer);

                const message: MailMessage = {
                  id: messageUid,
                  from: parsed.from?.text || "",
                  to: Array.isArray(parsed.to)
                    ? parsed.to.map((addr) => addr.text)
                    : parsed.to?.text
                      ? [parsed.to.text]
                      : [],
                  subject: parsed.subject || "",
                  // Prefer HTML over text for richer formatting, fallback to text
                  body: parsed.html || parsed.text || "",
                  date: parsed.date || new Date(),
                  attachments:
                    parsed.attachments?.map((att, idx) => ({
                      filename: att.filename || `attachment-${idx}`,
                      contentType: att.contentType || "application/octet-stream",
                      size: att.size || 0,
                    })) || [],
                  // Threading fields
                  messageId: parsed.messageId || undefined,
                  inReplyTo: parsed.inReplyTo || undefined,
                  references: parsed.references
                    ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references])
                    : undefined,
                };

                messages.push(message);
                resolveMsg();
              } catch (parseError) {
                this.logger.error(`Failed to parse email ${messageUid}: ${parseError.message}`);
                rejectMsg(parseError);
              }
            });
          });

          messagePromises.push(messagePromise);
        });

        fetch.once("error", reject);
        fetch.once("end", async () => {
          try {
            await Promise.all(messagePromises);
            resolve(messages);
          } catch (error) {
            reject(error);
          }
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
      throw new Error("No OAuth2 token found");
    }

    // Check if token is expired and refresh if needed
    if (await this.oauth2TokenService.isTokenExpired(token)) {
      const newAccessToken = await this.oauth2TokenService.refreshToken(
        userId,
        provider,
        email,
      );
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
    const smtpConfig = await this.getSmtpConfig(
      provider,
      email,
      token.accessToken,
    );

    // Create transporter
    const transporter: Transporter = nodemailer.createTransport(
      smtpConfig as any,
    );

    // Send email
    await transporter.sendMail({
      from: email,
      to: Array.isArray(to) ? to.join(", ") : to,
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
    const imapSettings =
      provider === MailProvider.GOOGLE
        ? {
            host: "imap.gmail.com",
            port: 993,
            smtpHost: "smtp.gmail.com",
            smtpPort: 587,
          }
        : {
            host: "outlook.office365.com",
            port: 993,
            smtpHost: "smtp.office365.com",
            smtpPort: 587,
          };

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
      orderBy: { createdAt: "desc" },
    });
  }

  async getMessageCount(
    config: ImapConnectionConfig,
    mailbox: string = "INBOX",
  ): Promise<number> {
    const imap = await this.connect(config);

    return new Promise((resolve, reject) => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          this.logger.error(`Failed to open mailbox "${mailbox}": ${err.message}`);
          // If mailbox doesn't exist, return 0 instead of error
          if (err.message.includes('does not exist') || err.message.includes('Mailbox doesn\'t exist')) {
            resolve(0);
            return;
          }
          reject(err);
          return;
        }
        resolve(box.messages.total);
      });
    });
  }

  /**
   * List all available mailboxes/folders from IMAP server
   */
  async listMailboxes(config: ImapConnectionConfig): Promise<any[]> {
    const imap = await this.connect(config);

    return new Promise((resolve, reject) => {
      imap.getBoxes((err, boxes) => {
        if (err) {
          reject(err);
          return;
        }

        // Flatten the box structure and remove circular references
        const flattenBoxes = (boxes: any, prefix: string = ''): any[] => {
          const result: any[] = [];
          for (const [name, box] of Object.entries<any>(boxes)) {
            const fullName = prefix ? `${prefix}/${name}` : name;

            // Extract only serializable properties, avoid circular references
            result.push({
              name: fullName,
              delimiter: box.delimiter || '/',
              attributes: box.attribs || [],
              hasChildren: !!box.children,
            });

            // Recursively process children
            if (box.children) {
              result.push(...flattenBoxes(box.children, fullName));
            }
          }
          return result;
        };

        const allBoxes = flattenBoxes(boxes);
        this.logger.log(`Available mailboxes: ${allBoxes.map(b => b.name).join(', ')}`);
        resolve(allBoxes);
      });
    });
  }

  async fetchEmailById(
    config: ImapConnectionConfig,
    mailbox: string,
    messageUid: string,
  ): Promise<MailMessage> {
    const imap = await this.connect(config);

    return new Promise((resolve, reject) => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Use UID fetch instead of sequence fetch
        const fetch = imap.fetch(messageUid, {
          bodies: "",
          struct: true,
        });

        let emailBuffer = Buffer.alloc(0);
        let foundMessage = false;

        fetch.on("message", (msg, seqno) => {
          foundMessage = true;

          msg.on("body", (stream, info) => {
            stream.on("data", (chunk) => {
              emailBuffer = Buffer.concat([emailBuffer, chunk]);
            });
          });

          msg.once("end", async () => {
            try {
              const parsed: ParsedMail = await simpleParser(emailBuffer);

              const message: MailMessage = {
                id: messageUid, // Use the UID we searched for
                from: parsed.from?.text || "",
                to: Array.isArray(parsed.to)
                  ? parsed.to.map((addr) => addr.text)
                  : parsed.to?.text
                    ? [parsed.to.text]
                    : [],
                subject: parsed.subject || "",
                // Prefer HTML over text for richer formatting, fallback to text
                body: parsed.html || parsed.text || "",
                date: parsed.date || new Date(),
                attachments:
                  parsed.attachments?.map((att, idx) => ({
                    filename: att.filename || `attachment-${idx}`,
                    contentType: att.contentType || "application/octet-stream",
                    size: att.size || 0,
                  })) || [],
                // Threading fields
                messageId: parsed.messageId || undefined,
                inReplyTo: parsed.inReplyTo || undefined,
                references: parsed.references
                  ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references])
                  : undefined,
              };

              resolve(message);
            } catch (parseError) {
              reject(parseError);
            }
          });
        });

        fetch.once("error", (err) => {
          this.logger.error(`Error fetching email ${messageUid} from ${mailbox}: ${err.message}`);
          reject(err);
        });

        fetch.once("end", () => {
          if (!foundMessage) {
            reject(new Error(`Email with UID ${messageUid} not found in ${mailbox}`));
          }
        });
      });
    });
  }

  async fetchAttachment(
    config: ImapConnectionConfig,
    mailbox: string,
    messageUid: string,
    partNumber: string,
  ): Promise<{ stream: NodeJS.ReadableStream; metadata: any }> {
    const imap = await this.connect(config);

    return new Promise((resolve, reject) => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Use UID fetch instead of sequence fetch
        const fetch = imap.fetch(messageUid, {
          bodies: [partNumber],
          struct: true,
        });

        let attachmentBuffer = Buffer.alloc(0);
        let metadata: any = {};
        let encoding: string | undefined;

        fetch.on("message", (msg) => {
          msg.on("body", (stream, info) => {
            stream.on("data", (chunk) => {
              attachmentBuffer = Buffer.concat([attachmentBuffer, chunk]);
            });
          });

          msg.once("attributes", (attrs) => {
            // Get attachment metadata from structure
            if (attrs.struct) {
              const parts = this.flattenParts(attrs.struct);
              const part = parts.find((p) => p.partID === partNumber);
              if (part) {
                encoding = part.encoding;
                metadata = {
                  filename: part.disposition?.params?.filename ||
                           part.params?.name ||
                           "attachment",
                  mimeType: `${part.type}/${part.subtype}`.toLowerCase(),
                  size: part.size || 0,
                  encoding: encoding,
                };
              }
            }
          });

          msg.once("end", () => {
            try {
              // Decode the attachment based on encoding
              let decodedBuffer = attachmentBuffer;

              if (encoding) {
                this.logger.log(`Decoding attachment with encoding: ${encoding}`);

                if (encoding.toUpperCase() === 'BASE64') {
                  // Decode base64
                  const base64String = attachmentBuffer.toString('utf8').replace(/\r?\n/g, '');
                  decodedBuffer = Buffer.from(base64String, 'base64');
                } else if (encoding.toUpperCase() === 'QUOTED-PRINTABLE') {
                  // Quoted-printable is rarely used for attachments, usually for text
                  // For now, just log a warning and use raw buffer
                  this.logger.warn('Quoted-printable encoding detected for attachment, using raw buffer');
                  decodedBuffer = attachmentBuffer;
                } else if (encoding === '7BIT' || encoding === '8BIT' || encoding === 'BINARY') {
                  // No decoding needed
                  decodedBuffer = attachmentBuffer;
                } else {
                  this.logger.warn(`Unknown encoding: ${encoding}, using raw buffer`);
                }
              }

              // Update size with decoded size
              metadata.size = decodedBuffer.length;

              // Convert buffer to stream
              const Readable = require("stream").Readable;
              const readable = new Readable();
              readable.push(decodedBuffer);
              readable.push(null);

              this.logger.log(`Attachment ready: ${metadata.filename} (${metadata.size} bytes, ${metadata.mimeType})`);
              resolve({ stream: readable, metadata });
            } catch (decodeError) {
              this.logger.error(`Failed to decode attachment: ${decodeError.message}`);
              reject(decodeError);
            }
          });
        });

        fetch.once("error", reject);
      });
    });
  }

  // Helper method to flatten IMAP structure parts
  private flattenParts(
    struct: any[],
    parts: any[] = [],
    prefix: string = "1",
  ): any[] {
    if (!Array.isArray(struct)) {
      return parts;
    }

    for (let i = 0; i < struct.length; i++) {
      const part = struct[i];
      if (Array.isArray(part)) {
        this.flattenParts(part, parts, `${prefix}.${i + 1}`);
      } else if (part.partID) {
        parts.push(part);
      } else {
        // This is a part without partID, add it manually
        parts.push({
          ...part,
          partID: i === struct.length - 1 ? prefix : `${prefix}.${i + 1}`,
        });
      }
    }

    return parts;
  }
}
