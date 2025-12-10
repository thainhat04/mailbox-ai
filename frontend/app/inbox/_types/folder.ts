export interface Folder {
    id: string;
    name: string;
    type: "system" | "user";
    color: string | null;
    messageListVisibility: "show" | "hide";
    labelListVisibility: "show" | "labelShow" | "hide" | "labelHide";
    unreadCount: number;
}
