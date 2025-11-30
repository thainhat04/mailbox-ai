export interface MailDetail {
  messageId: string;
  subject: string;
  from: Array<{ name?: string; address: string }>;
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  date: Date;
  references?: string;
  inReplyTo?: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename?: string;
    contentType?: string;
    size: number;
    content: Buffer;
  }>;
}
