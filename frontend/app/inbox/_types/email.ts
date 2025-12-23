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
    cc: EmailAddress[];
    bcc: EmailAddress[];

    subject: string;
    body: string;
    preview: string;
    timestamp: string;

    isRead: boolean;
    isStarred: boolean;
    isImportant: boolean;

    // Backend trả về labelId là mảng string
    labelId: string[];

    // Có thể backend cũng trả labels giống hệt labelId
    labels: string[];

    // Attachments luôn là array
    attachments: Attachment[];

    // Threading
    inReplyTo: string | null;
    references: string[];

    // Metadata bổ sung
    messageId: string; // backend trả
    replyTo?: string; // không thấy trong mẫu → optional

    // Optional threading info
    threadCount?: number;
    threadEmails?: string[];
}

export interface EmailRequest {
    id: string;
}

export interface PreviewEmail {
    id: string;
    from: EmailAddress;
    subject: string;
    preview: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    isImportant: boolean;
    labelId: string[];
    threadCount?: number;
}
export interface SearchEmail extends PreviewEmail {
    relevanceScore: number;
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
export type ModeSearch = "fuzzy" | "semantic";
export interface SearchEmailRequest {
    mode: ModeSearch;
    q: string;
    page: number;
    limit: number;
}
export interface SearchEmailResponse {
    emails: SearchEmail[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
