export interface AttachmentDto {
    filename: string;
    mimeType: string;
    contentBase64?: string;
    url?: string;
}

export interface SendEmailDto {
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: AttachmentDto[];
}
export interface ReplyEmail {
    replyText?: string;

    replyHtml?: string;

    includeQuoted?: boolean;

    attachments?: AttachmentDto[];

    mailBox: string;
}
export interface ReplyEmailWithId {
    emailId: string;
    replyData: ReplyEmail;
}

export interface ComposeEmailResponse {
    emailId: string;
    sendAt: Date;
    mailboxId: string;
}
