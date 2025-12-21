// Thông tin người gửi trong email
export interface EmailSender {
    name: string;
    email: string;
}
export interface KanbanColumn {
    id: string;
    name: string;
    key: string;
    color: string;
    icon: string;
    order: number;
    isSystemProtected: boolean;
    emailCount: number;
}
export type KanbanStatus = string;

// Item trong các cột Kanban
export interface KanbanItem {
    id: string;
    subject: string;
    from: string;
    snippet: string;
    summary?: string;
    date: string;
    isRead: boolean;
    hasAttachments?: boolean;
    kanbanColumnId: string;
    kanbanStatus: KanbanStatus;
    statusChangedAt: string;

    snoozedUntil?: string;
    previousKanbanStatus?: KanbanStatus;
    // Optional but useful
    messageId?: string;
    threadId?: string;
}

export interface KanbanBoardData {
    columns: KanbanColumn[];
    emails: Record<string, KanbanItem[]>;
}

export interface UpdateKanbanStatusRequest {
    id: string;
    newStatus: KanbanStatus;
}

export interface EmailSummaryData {
    emailId: string;
    summary: string;
    generatedAt: string;
    cached: boolean;
    keyPoints: string[];
}

export type FrozenTimeouts =
    | `1_HOUR`
    | `3_HOURS`
    | `1_DAY`
    | `3_DAYS`
    | `1_WEEK`
    | `CUSTOM`;

export interface SetFrozenRequest {
    emailId: string;
    duration: FrozenTimeouts;
    customDateTime?: string;
}

// Filter and Sort types
export type SortOption = "date_desc" | "date_asc" | "sender";

export interface KanbanFilters {
    unreadOnly: boolean;
    hasAttachmentsOnly: boolean;
    fromEmail: string;
}

export interface KanbanBoardParams {
    includeDoneAll?: boolean;
    unreadOnly?: boolean;
    hasAttachmentsOnly?: boolean;
    fromEmail?: string;
    sortBy?: SortOption;
}
