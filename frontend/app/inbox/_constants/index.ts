const constant = {
    URL_MAILBOXES: "/mailboxes",
    FILE_MAX_SIZE_MB: 15,
    URL_SEND_EMAIL: "/emails/send",
    URL_MODIFY_EMAIL: (id: string) => `/emails/${id}/modify`,
    URL_REPLY_EMAIL: (id: string) => `/emails/${id}/reply`,
};
export default constant;
