// Trạng thái Kanban hợp lệ
export type KanbanStatus = "INBOX" | "TODO" | "PROCESSING" | "DONE" | "FROZEN";

// Thông tin người gửi trong email
export interface EmailSender {
    name: string;
    email: string;
}

// Item trong các cột Kanban
export interface KanbanItem {
    id: string;
    subject: string;
    from: string;
    snippet: string;
    summary?: string;
    date: string;
    isRead: boolean;

    kanbanStatus: KanbanStatus;
    statusChangedAt: string;

    snoozedUntil?: string;
    previousKanbanStatus?: KanbanStatus;
    // Optional but useful
    messageId?: string;
    threadId?: string;
}

// Các cột của Kanban Board
export interface KanbanBoardData {
    inbox: KanbanItem[];
    todo: KanbanItem[];
    processing: KanbanItem[];
    done: KanbanItem[];
    frozen: KanbanItem[];
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
export type KanbanColumnKey = keyof KanbanBoardData;

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
