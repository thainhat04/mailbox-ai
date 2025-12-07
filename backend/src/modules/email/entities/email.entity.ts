export interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
}

export interface Email {
  id: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  to: Array<{
    name: string;
    email: string;
  }>;
  cc?: Array<{
    name: string;
    email: string;
  }>;
  bcc?: Array<{
    name: string;
    email: string;
  }>;
  subject: string;
  body: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  labelId?: string;
  attachments?: Attachment[];
  labels?: string[];
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  // Thread metadata
  threadCount?: number;
  threadEmails?: string[];
}
