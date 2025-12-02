import { api } from "@/services";
import { SuccessResponse } from "@/types/success-response";
import constants, { HTTP_METHOD } from "@/constants/services";
import type {
    Email,
    EmailListQuery,
    EmailListResponse,
    Mailbox,
    ImapTestResponse,
} from "@/types/email";

export const emailApi = api.injectEndpoints({
    endpoints: (build) => ({
        // Get emails with pagination
        getEmails: build.query<
            SuccessResponse<EmailListResponse>,
            EmailListQuery | void
        >({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params?.page) queryParams.append("page", params.page.toString());
                if (params?.limit) queryParams.append("limit", params.limit.toString());
                if (params?.mailbox) queryParams.append("mailbox", params.mailbox);
                if (params?.unreadOnly) queryParams.append("unreadOnly", "true");
                if (params?.starredOnly) queryParams.append("starredOnly", "true");

                const queryString = queryParams.toString();
                return {
                    url: `${constants.URL_GET_EMAILS}${queryString ? `?${queryString}` : ""}`,
                    method: HTTP_METHOD.GET,
                };
            },
            providesTags: (result) =>
                result?.data?.emails
                    ? [
                          ...result.data.emails.map(({ id }) => ({
                              type: "Emails" as const,
                              id,
                          })),
                          { type: "Emails" as const, id: "LIST" },
                      ]
                    : [{ type: "Emails" as const, id: "LIST" }],
        }),

        // Get email by ID
        getEmailById: build.query<
            SuccessResponse<Email>,
            { id: string; mailbox?: string }
        >({
            query: ({ id, mailbox }) => {
                const queryParams = new URLSearchParams();
                if (mailbox) queryParams.append("mailbox", mailbox);
                const queryString = queryParams.toString();

                return {
                    url: `${constants.URL_GET_EMAIL_BY_ID}/${id}${queryString ? `?${queryString}` : ""}`,
                    method: HTTP_METHOD.GET,
                };
            },
            providesTags: (result, error, { id }) => [
                { type: "Emails" as const, id },
            ],
        }),

        // Mark email as read
        markAsRead: build.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `${constants.URL_MARK_EMAIL_READ}/${id}/read`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (result, error, id) => [
                { type: "Emails" as const, id },
                { type: "Emails" as const, id: "LIST" },
            ],
        }),

        // Mark email as unread
        markAsUnread: build.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `${constants.URL_MARK_EMAIL_UNREAD}/${id}/unread`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (result, error, id) => [
                { type: "Emails" as const, id },
                { type: "Emails" as const, id: "LIST" },
            ],
        }),

        // Toggle star status
        toggleStar: build.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `${constants.URL_TOGGLE_STAR}/${id}/star`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (result, error, id) => [
                { type: "Emails" as const, id },
                { type: "Emails" as const, id: "LIST" },
            ],
        }),

        // Delete email
        deleteEmail: build.mutation<SuccessResponse<null>, string>({
            query: (id) => ({
                url: `${constants.URL_DELETE_EMAIL}/${id}`,
                method: HTTP_METHOD.DELETE,
            }),
            invalidatesTags: (result, error, id) => [
                { type: "Emails" as const, id },
                { type: "Emails" as const, id: "LIST" },
            ],
        }),

        // Search emails
        searchEmails: build.query<SuccessResponse<Email[]>, string>({
            query: (query) => ({
                url: `${constants.URL_SEARCH_EMAILS}?q=${encodeURIComponent(query)}`,
                method: HTTP_METHOD.GET,
            }),
            providesTags: [{ type: "Emails" as const, id: "SEARCH" }],
        }),

        // Get all mailboxes
        getAllMailboxes: build.query<SuccessResponse<Mailbox[]>, void>({
            query: () => ({
                url: constants.URL_GET_MAILBOXES,
                method: HTTP_METHOD.GET,
            }),
        }),

        // Get mailbox by ID
        getMailboxById: build.query<SuccessResponse<Mailbox>, string>({
            query: (id) => ({
                url: `${constants.URL_GET_MAILBOX_BY_ID}/${id}`,
                method: HTTP_METHOD.GET,
            }),
        }),

        // Get emails in a mailbox
        getMailboxEmails: build.query<
            SuccessResponse<EmailListResponse>,
            { id: string; query?: EmailListQuery }
        >({
            query: ({ id, query: params }) => {
                const queryParams = new URLSearchParams();
                if (params?.page) queryParams.append("page", params.page.toString());
                if (params?.limit) queryParams.append("limit", params.limit.toString());
                if (params?.unreadOnly) queryParams.append("unreadOnly", "true");
                if (params?.starredOnly) queryParams.append("starredOnly", "true");

                const queryString = queryParams.toString();
                return {
                    url: `${constants.URL_GET_MAILBOX_EMAILS}/${id}/emails${queryString ? `?${queryString}` : ""}`,
                    method: HTTP_METHOD.GET,
                };
            },
            providesTags: (result, error, { id }) => [
                { type: "Emails" as const, id: `MAILBOX_${id}` },
            ],
        }),

        // Test IMAP connection
        testImapConnection: build.query<
            SuccessResponse<ImapTestResponse>,
            void
        >({
            query: () => ({
                url: constants.URL_TEST_IMAP,
                method: HTTP_METHOD.GET,
            }),
        }),

        // List IMAP mailboxes
        listImapMailboxes: build.query<SuccessResponse<Mailbox[]>, void>({
            query: () => ({
                url: constants.URL_LIST_IMAP_MAILBOXES,
                method: HTTP_METHOD.GET,
            }),
        }),
    }),
});

export const {
    useGetEmailsQuery,
    useGetEmailByIdQuery,
    useMarkAsReadMutation,
    useMarkAsUnreadMutation,
    useToggleStarMutation,
    useDeleteEmailMutation,
    useSearchEmailsQuery,
    useGetAllMailboxesQuery,
    useGetMailboxByIdQuery,
    useGetMailboxEmailsQuery,
    useTestImapConnectionQuery,
    useListImapMailboxesQuery,
} = emailApi;
