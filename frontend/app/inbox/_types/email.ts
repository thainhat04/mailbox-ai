interface EmailAddress {
    name: string;
    email: string; // Có thể thêm validation email format
}

interface Attachment {
    id: string;
    filename: string;
    size: number; // in bytes
    mimeType: string;
    url: string;
}

export interface Email {
    id: string;
    from: EmailAddress;
    to: EmailAddress[];
    subject: string;
    body: string;
    preview: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    isImportant: boolean;
    mailboxId: string;

    // Optional fields
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    attachments?: Attachment[];
    labels?: string[];
    replyTo?: string;
    inReplyTo?: string; // for threading
    references?: string[]; // for threading

    // Thread metadata
    threadCount?: number;
    threadEmails?: string[];
}

export interface EmailRequest {
    mailboxId: string;
    id: string;
}

export interface PreviewEmail {
    id: string;
    mailboxId: string;
    from: EmailAddress;
    isRead: boolean;
    timestamp: string;
    isStarred: boolean;
    subject: string;
    preview: string;
    threadCount?: number;
}

export interface PreviewEmailRequest {
    mailboxId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    starredOnly?: boolean;
}

export interface PreviewEmailResponse {
    emails: PreviewEmail[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
