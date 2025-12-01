import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { OAuth2TokenService } from "./oauth2-token.service";
import { MailProvider } from "@prisma/client";
import Imap = require("imap");
import * as nodemailer from "nodemailer";
import { SendEmailDto } from "../dto/send-email.dto";
import { Attachment } from "nodemailer/lib/mailer";
import { NotFoundException } from "@nestjs/common";
import { AttachmentDto } from "../dto/attachment.dto";
import { ReplyEmailDto } from "../dto/reply-emai.dto";
import { simpleParser } from "mailparser";
import { MailDetail } from "../dto/mail-detail.dto";
import { SendEmailResponse } from "../dto/send-email-response";
import fs from "fs";
import fsPromises from "fs/promises";
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

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
    const base64Token = Buffer.from(authString).toString("base64");
    this.logger.debug(
      `Formatted XOAUTH2 token (length: ${base64Token.length})`,
    );
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
      authTimeout: 5000, // 5 seconds auth timeout
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
    this.logger.debug(
      `Token found: expiresAt=${token.expiresAt}, scope=${token.scope?.substring(0, 50)}...`,
    );

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
      const requiredScopes =
        provider === MailProvider.GOOGLE
          ? ["https://mail.google.com/", "gmail.modify"]
          : ["IMAP.AccessAsUser.All"];

      const hasRequiredScope = requiredScopes.some((scope) =>
        token.scope?.toLowerCase().includes(scope.toLowerCase()),
      );

      if (!hasRequiredScope) {
        this.logger.warn(
          `Token may not have required IMAP scopes. Current scope: ${token.scope}`,
        );
      }
    }

    // Get IMAP configuration
    const imapConfig = await this.getImapConfig(
      provider,
      email,
      token.accessToken,
    );
    console.log("IMAP Config:", imapConfig);

    this.logger.log(`Attempting IMAP connection for ${email} (${provider})`);
    this.logger.debug(
      `IMAP config: host=${imapConfig.host}, port=${imapConfig.port}, user=${imapConfig.user}`,
    );

    // Create IMAP connection
    const imap = new Imap(imapConfig);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        imap.end();
        reject(new Error("IMAP connection timeout"));
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
        if (err.message.includes("SASL")) {
          this.logger.error(
            "SASL authentication error - check OAuth2 token format and scopes",
          );
        }
        reject(err);
      });

      imap.once("end", () => {
        clearTimeout(timeout);
        this.logger.log(`IMAP connection ended for ${email}`);
      });

      try {
        imap.connect();
      } catch (connectError) {
        clearTimeout(timeout);
        this.logger.error(
          `Failed to initiate IMAP connection: ${connectError}`,
        );
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
    mailbox: string = "INBOX", //"[Gmail]/Sent Mail",
    limit: number = 50,
  ): Promise<MailMessage[]> {
    const imap = await this.connect(config);

    const messages: MailMessage[] = [];

    try {
      return await new Promise<MailMessage[]>((resolve, reject) => {
        imap.openBox(mailbox, true, (err, box) => {
          if (err) return reject(err);

          const fetchCount = Math.min(limit, box.messages.total);
          if (fetchCount === 0) return resolve([]);

          const fetchRange = `${Math.max(1, box.messages.total - fetchCount + 1)}:${box.messages.total}`;

          const fetch = imap.seq.fetch(fetchRange, {
            bodies: ["HEADER", "TEXT"],
            struct: true,
          });

          fetch.on("message", (msg, seqno) => {
            const message: Partial<MailMessage> = {};

            msg.once("attributes", (attrs) => {
              message.id = attrs.uid;
            });

            msg.on("body", (stream, info) => {
              let buffer = "";
              stream.on("data", (chunk) => (buffer += chunk.toString("utf8")));
              stream.once("end", () => {
                if (info.which === "HEADER") {
                  const header = Imap.parseHeader(buffer);
                  message.from = header.from?.[0] || "";
                  message.to = header.to || [];
                  message.subject = header.subject?.[0] || "";
                  message.date = new Date(header.date?.[0] || Date.now());
                } else if (info.which === "TEXT") {
                  message.body = buffer;
                }
              });
            });

            msg.once("end", () => {
              if (message.from && message.subject)
                messages.push(message as MailMessage);
            });
          });

          fetch.once("error", reject);
          fetch.once("end", () => resolve(messages));
        });
      });
    } finally {
      await this.disconnect(config); // đảm bảo IMAP được đóng
    }
  }

  async sendEmail(
    config: ImapConnectionConfig,
    dto: SendEmailDto,
  ): Promise<SendEmailResponse> {
    const { userId, provider, email } = config;

    // OAuth2 token
    let token = await this.oauth2TokenService.getToken(userId, provider, email);
    if (!token) {
      throw new NotFoundException("No OAuth2 token found");
    }

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

    // SMTP transporter
    const smtpConfig = await this.getSmtpConfig(
      provider,
      email,
      token.accessToken,
    );
    try {
      const transporter = nodemailer.createTransport(smtpConfig as any);

      // Map attachments
      const attachments = await this.mapAttachments(dto.attachments);

      const mailOptions = {
        from: email,
        to: dto.to,
        cc: dto.cc,
        bcc: dto.bcc,
        subject: dto.subject,
        text: dto.text || "",
        html: dto.html,
        attachments,
      };

      // Send mail via SMTP
      const info = await transporter.sendMail(mailOptions);
      // // Append to Sent via IMAP
      // const imap = await this.connect(config);
      // try {
      //   const raw = await this.buildRawMessage(
      //     mailOptions,
      //     email,
      //     info.messageId,
      //   );
      //   await this.appendRawToSent(imap, raw, provider);
      return {
        emailId: info.messageId || "",
        sendAt: new Date(),
        //   };
        // } finally {
        //   await this.disconnect(config);
      };
    } catch (err) {
      console.log("Error sending email:", err);
      throw err;
    }
  }

  async replyEmail(
    config: ImapConnectionConfig,
    original: any,
    dto: ReplyEmailDto, // bạn có thể thay bằng ReplyEmailDto
  ): Promise<SendEmailResponse> {
    const { userId, provider, email } = config;
    console.log("Original email in replyEmail:", original);
    // 1) GET TOKEN
    let token = await this.oauth2TokenService.getToken(userId, provider, email);
    if (!token) {
      throw new NotFoundException("No OAuth2 token found");
    }

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

    // 2) SMTP TRANSPORT
    const smtpConfig = await this.getSmtpConfig(
      provider,
      email,
      token.accessToken,
    );
    const transporter = nodemailer.createTransport(smtpConfig as any);

    // 3) BUILD REPLY HEADERS + BODY
    const replyTo = this.resolveReplyRecipients(original);
    const { subject, headers } = this.buildReplyHeaders(original);
    const htmlBody = this.buildReplyHtml(original, dto);

    const attachments = await this.mapAttachments(dto.attachments);

    const mailOptions = {
      from: email,
      to: replyTo,
      subject,
      text: dto.replyText,
      html: htmlBody,
      attachments,
      headers,
    };

    // 4) SEND EMAIL
    const info = await transporter.sendMail(mailOptions);

    // 5) APPEND TO SENT
    // const imap = await this.connect(config);

    // try {
    //   const raw = await this.buildRawMessage(
    //     mailOptions,
    //     email,
    //     info.messageId,
    //   );
    //   await this.appendRawToSent(imap, raw, provider);
    return {
      emailId: info.messageId || "",
      sendAt: new Date(),
    };
    // } finally {
    //   await this.disconnect(config);
    // }
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

  private async mapAttachments(
    attachments?: AttachmentDto[],
  ): Promise<Attachment[]> {
    if (!attachments?.length) return [];

    // map từng attachment sang Promise<Attachment | null>
    const promises = attachments.map(async (att) => {
      try {
        // --- Base64 ---
        if (att.contentBase64) {
          const size = Math.floor((att.contentBase64.length * 3) / 4);
          if (size > MAX_SIZE_BYTES) {
            console.warn(`Attachment too large, skipped: ${att.filename}`);
            return null;
          }
          return {
            filename: att.filename,
            content: Buffer.from(att.contentBase64, "base64"),
            contentType: att.mimeType || undefined,
          } as Attachment;
        }

        // --- Local file ---
        if (att.url && att.url.startsWith("file://")) {
          const path = att.url.replace(/^file:\/\//, "");
          await fsPromises.access(path, fs.constants.R_OK);
          const stats = await fsPromises.stat(path);
          if (stats.size > MAX_SIZE_BYTES) {
            console.warn(`Attachment too large, skipped: ${att.filename}`);
            return null;
          }
          return {
            filename: att.filename,
            content: fs.createReadStream(path),
          } as Attachment;
        }

        // --- HTTP/HTTPS URL ---
        if (att.url && /^https?:\/\//.test(att.url)) {
          const res = await fetch(att.url, { method: "HEAD" });
          const contentLength = res.headers.get("content-length");
          if (
            !res.ok ||
            (contentLength && parseInt(contentLength) > MAX_SIZE_BYTES)
          ) {
            console.warn(
              `Attachment too large or not reachable, skipped: ${att.url}`,
            );
            return null;
          }
          return {
            filename: att.filename,
            path: att.url,
          } as Attachment;
        }

        return null;
      } catch (err) {
        console.warn(
          `Attachment processing failed, skipped: ${att.filename || att.url}`,
        );
        return null;
      }
    });

    // Chạy song song và lọc null
    const results = await Promise.all(promises);
    return results.filter((a): a is Attachment => !!a);
  }

  private async buildRawMessage(
    mailOptions: any,
    from: string,
    messageId?: string,
  ): Promise<Buffer> {
    const composer = new (require("nodemailer/lib/mail-composer"))({
      ...mailOptions,
      from,
      messageId,
    });

    return new Promise((resolve, reject) => {
      composer.compile().build((err, raw) => {
        if (err) return reject(err);
        resolve(raw);
      });
    });
  }
  private async appendRawToSent(
    imap: Imap,
    rawMessage: Buffer,
    provider: MailProvider,
  ): Promise<void> {
    const sentFolder =
      provider === MailProvider.GOOGLE ? "[Gmail]/Sent Mail" : "Sent Items"; // Outlook

    return new Promise((resolve, reject) => {
      imap.openBox(sentFolder, false, (err) => {
        if (err) return reject(err);

        imap.append(
          rawMessage,
          { mailbox: sentFolder, flags: ["\\Seen"] },
          (err2) => {
            if (err2) return reject(err2);
            resolve();
          },
        );
      });
    });
  }
  private buildReplyHeaders(original: any) {
    const originalSubject = original?.subject || "";
    const messageId = original?.messageId;

    const subject = originalSubject.startsWith("Re:")
      ? originalSubject
      : `Re: ${originalSubject}`;

    const references = original?.references
      ? `${original.references} ${messageId}`.trim()
      : messageId;

    return {
      subject,
      headers: {
        "In-Reply-To": messageId,
        References: references,
      },
    };
  }

  private buildReplyHtml(original: any, dto: any): string {
    let html =
      dto.replyHtml || (dto.replyText ? `<div>${dto.replyText}</div>` : "");

    if (!dto.includeQuoted) return html;

    const quoted = original.html
      ? original.html
      : original.text
        ? `<pre>${require("escape-html")(original.text)}</pre>`
        : "";

    return html + `<hr/><blockquote>${quoted}</blockquote>`;
  }

  private resolveReplyRecipients(original: any): string | undefined {
    return original?.from?.length
      ? original.from.map((f) => f.address).join(", ")
      : undefined;
  }
  async getMailDetail(
    config: ImapConnectionConfig,
    uid: number,
    mailbox: string = "INBOX",
  ): Promise<MailDetail> {
    const imap = await this.connect(config);

    return new Promise<MailDetail>((resolve, reject) => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) return reject(err);

        let resolved = false;

        const fetch = imap.fetch(uid, { bodies: "", struct: true });

        fetch.on("message", (msg) => {
          msg.on("body", (stream) => {
            simpleParser(stream, (err, parsed) => {
              if (err) return reject(err);

              resolved = true;
              resolve({
                messageId: parsed.messageId,
                subject: parsed.subject || "",
                from: parsed.from?.value || [],
                to: parsed.to?.value || [],
                cc: parsed.cc?.value || [],
                date: parsed.date || new Date(),
                references: parsed.references?.join(" "),
                inReplyTo: parsed.inReplyTo || undefined,
                text: parsed.text || undefined,
                html: parsed.html || undefined,
              });
            });
          });
        });

        fetch.once("error", reject);

        fetch.once("end", () => {
          if (!resolved) {
            reject(
              new NotFoundException(
                `Mail with UID ${uid} not found in mailbox ${mailbox}`,
              ),
            );
          }
        });
      });
    });
  }
  async modifyEmailFlags(
    config: ImapConnectionConfig,
    uid: number,
    options: { read?: boolean; starred?: boolean; delete?: boolean },
    mailbox: string = "INBOX",
  ) {
    const imap = await this.connect(config);

    try {
      // Mở mailbox
      await new Promise<void>((resolve, reject) => {
        imap.openBox(mailbox, false, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // MARK READ / UNREAD
      if (options.read !== undefined) {
        await new Promise<void>((resolve, reject) => {
          if (options.read) {
            imap.addFlags(uid, "\\Seen", (err) => {
              if (err) return reject(err);
              resolve();
            });
          } else {
            imap.delFlags(uid, "\\Seen", (err) => {
              if (err) return reject(err);
              resolve();
            });
          }
        });
      }

      // STAR / UNSTAR
      if (options.starred !== undefined) {
        await new Promise<void>((resolve, reject) => {
          if (options.starred) {
            imap.addFlags(uid, "\\Flagged", (err) => {
              if (err) return reject(err);
              resolve();
            });
          } else {
            imap.delFlags(uid, "\\Flagged", (err) => {
              if (err) return reject(err);
              resolve();
            });
          }
        });
      }

      // MOVE TO TRASH
      if (options.delete) {
        const trashMailbox =
          process.env.TRASH_MAILBOX ||
          (config.provider === MailProvider.GOOGLE
            ? "[Gmail]/Trash"
            : "Deleted Items");

        await new Promise<void>((resolve, reject) => {
          imap.move(uid, trashMailbox, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      return { success: true };
    } catch (err: any) {
      this.logger.error(`Modify flags failed for uid ${uid}`, err);
      return { success: false, error: err.message };
    } finally {
      await this.disconnect(config).catch(() => {});
    }
  }
}
