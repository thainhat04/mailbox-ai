const constant = {
    URL_MAILBOXES: "/labels",
    FILE_MAX_SIZE_MB: 15,
    URL_SEND_EMAIL: "/emails/send",
    URL_MODIFY_EMAIL: (id: string) => `/emails/${id}/modify`,
    URL_REPLY_EMAIL: (id: string) => `/emails/${id}/reply`,
    TIME_FREEZE_MS: 3000,
    FROZEN_COLUMN_KEY: "FROZEN",
    KANBAN_INBOX_KEY: "INBOX",
    URL_KANBAN: "/kanban/board",
    URL_UPDATE_KANBAN_STATUS: (id: string) => `/${id}/kanban/column`,
    URL_FROZEN_EMAILS: (id: string) => `/${id}/freeze`,
    URL_UNFREEZE_EMAILS: (id: string) => `/${id}/unfreeze`,
    URL_SUMMARIZE_EMAIL: (id: string) => `/${id}/summary`,
    URL_PUZZLE_SEARCH: "/emails/fuzzy-search",
    URL_CREATE_KANBAN_COLUMN: "/kanban/columns",
};
export default constant;
