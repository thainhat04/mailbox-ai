export interface EmailAddress {
    name: string;
    email: string;
}

export interface Attachment {
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    url: string;
}

export interface Email {
    id: string;
    from: EmailAddress;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    body: string;
    preview: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    isImportant: boolean;
    mailboxId: string;
    attachments?: Attachment[];
    labels?: string[];
}

export interface EmailListQuery {
    page?: number;
    limit?: number;
    mailbox?: string;
    unreadOnly?: boolean;
    starredOnly?: boolean;
}

export interface EmailListResponse {
    emails: Email[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface Mailbox {
    name: string;
    delimiter: string;
    attributes: string[];
    hasChildren: boolean;
}

export interface ImapTestResponse {
    success: boolean;
    message: string;
    email?: string;
    provider?: string;
    host?: string;
    port?: number;
    details?: string;
    testEmailCount?: number;
    testedAt?: string;
}
