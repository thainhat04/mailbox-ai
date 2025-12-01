export interface ModifyEmailFlags {
    read?: boolean;

    starred?: boolean;

    delete?: boolean;
}

export interface ModifyEmail {
    mailBox?: string;
    emailId: string;
    flags: ModifyEmailFlags;
}

export interface ModifyEmailResponse {
    success: boolean;
}
