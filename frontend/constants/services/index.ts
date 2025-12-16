const SERVICES = {
    STATUS_NOT_CLIENT_ERROR: 0,
    DEFAULT_ERROR_MESSAGE: "DEFAULT_ERROR_MESSAGE",
    STATUS_INTERNAL_ERROR: 500,
    STATUS_UNAUTHORIZED: 401,
    accessToken: "accessToken",
    refreshToken: "refreshToken",
    URL_GET_PROFILE: "/auth/me",
    URL_REFRESH_TOKEN: "/auth/refresh",
    URL_LOGIN: "/auth/login",
    UNAUTHORIZED_ERROR_MESSAGE: "UNAUTHORIZED_ERROR_MESSAGE",
    NETWORK_ERROR_MESSAGE: "NETWORK_ERROR_MESSAGE",
    TIMEOUT_ERROR_MESSAGE: "TIMEOUT_ERROR_MESSAGE",
    RETRY_DELAY_MS: 2000,
    MAX_RETRY_ATTEMPTS: 30,
    // Email endpoints
    URL_GET_EMAILS: "/api/emails",
    URL_GET_EMAIL_BY_ID: "/api/emails",
    URL_MARK_EMAIL_READ: "/api/emails",
    URL_MARK_EMAIL_UNREAD: "/api/emails",
    URL_TOGGLE_STAR: "/api/emails",
    URL_DELETE_EMAIL: "/api/emails",
    URL_SEARCH_EMAILS: "/api/emails/search",
    URL_GET_MAILBOXES: "/api/mailboxes",
    URL_GET_MAILBOX_BY_ID: "/api/mailboxes",
    URL_GET_MAILBOX_EMAILS: "/api/mailboxes",
    URL_TEST_IMAP: "/api/imap/test",
    URL_LIST_IMAP_MAILBOXES: "/api/imap/mailboxes",
    URL_GET_ATTACHMENT: "/api/attachments",
};

export enum HTTP_METHOD {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
}

export default SERVICES;
