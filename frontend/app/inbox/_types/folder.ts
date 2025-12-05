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
