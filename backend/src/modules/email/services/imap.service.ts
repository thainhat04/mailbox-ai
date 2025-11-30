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

  private async getImapConfig(
    provider: MailProvider,
    email: string,
    accessToken: string,
  ): Promise<Imap.Config> {
    const baseConfig: Partial<Imap.Config> = {
      user: email,
      xoauth2: accessToken,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
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
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        scope: token.scope ?? undefined,
      });
    }

    // Get IMAP configuration
    const imapConfig = await this.getImapConfig(
      provider,
      email,
      token.accessToken,
    );
    console.log("IMAP Config:", imapConfig);

    // Create IMAP connection
    const imap = new Imap(imapConfig);

    return new Promise((resolve, reject) => {
      imap.once("ready", () => {
        this.logger.log(`IMAP connection established for ${email}`);
        this.connections.set(key, imap);
        resolve(imap);
      });

      imap.once("error", (err) => {
        this.logger.error(`IMAP connection error for ${email}:`, err);
        reject(err);
      });

      imap.connect();
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
            const message: Partial<MailMessage> = { id: seqno.toString() };

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
      const attachments = this.mapAttachments(dto.attachments);

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

    const attachments = this.mapAttachments(dto.attachments);

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
    const imap = await this.connect(config);

    try {
      const raw = await this.buildRawMessage(
        mailOptions,
        email,
        info.messageId,
      );
      await this.appendRawToSent(imap, raw, provider);
      return {
        emailId: info.messageId || "",
        sendAt: new Date(),
      };
    } finally {
      await this.disconnect(config);
    }
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

  private mapAttachments(attachments?: AttachmentDto[]): Attachment[] {
    if (!attachments?.length) return [];

    const mapped: Attachment[] = [];

    for (const att of attachments) {
      if (att.contentBase64) {
        mapped.push({
          filename: att.filename,
          content: Buffer.from(att.contentBase64, "base64"),
          contentType: att.mimeType || undefined,
        });
      } else if (att.url) {
        mapped.push({
          filename: att.filename,
          path: att.url,
        });
      }
    }

    return mapped;
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

    return new Promise((resolve, reject) => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) return reject(err);

        const fetch = imap.fetch(uid, { bodies: "", struct: true });

        fetch.on("message", (msg) => {
          msg.on("body", (stream) => {
            simpleParser(stream, (err, parsed) => {
              if (err) return reject(err);

              const detail: MailDetail = {
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
              };

              resolve(detail);
            });
          });
        });

        fetch.once("error", reject);
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
