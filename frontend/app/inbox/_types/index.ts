export interface Folder {
    id: string;
    name: string;
    type: string;
    unreadCount?: number;
    totalCount?: number;
    icon?: string;
    color?: string;
    order?: number;
}

export interface FolderListProps {
    selected: string;
    onSelect: (folderId: string) => void;
}

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
    // Required fields
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
}

export interface EmailResponse {
    emails: Email[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface EmailRequest {
    mailboxId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    starredOnly?: boolean;
}
export interface EmailDetailProps {
    email: Email | null;
}
