const constant = {
    URL_MAILBOXES: "/labels",
    FILE_MAX_SIZE_MB: 15,
    URL_SEND_EMAIL: "/emails/send",
    URL_MODIFY_EMAIL: (id: string) => `/emails/${id}/modify`,
    URL_REPLY_EMAIL: (id: string) => `/emails/${id}/reply`,
    TIME_FREEZE_MS: 3000,
    nameFrozenColumn: "FROZEN",
    URL_KANBAN: "/kanban/board",
    URL_UPDATE_KANBAN_STATUS: (id: string) => `/${id}/kanban/status`,
    URL_FROZEN_EMAILS: (id: string) => `/${id}/freeze`,
    URL_UNFREEZE_EMAILS: (id: string) => `/${id}/unfreeze`,
    URL_SUMMARIZE_EMAIL: (id: string) => `/${id}/summary`,
};
export default constant;
