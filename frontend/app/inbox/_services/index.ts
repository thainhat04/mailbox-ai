import type { Folder, EmailResponse, EmailRequest, Email } from "../_types";
import type { SuccessResponse } from "@/types/success-response";
import { api } from "@/services/index";
import { HTTP_METHOD } from "@/constants/services";
import constant from "../_constants";

const inboxApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getMailBoxes: builder.query<SuccessResponse<Folder[]>, void>({
            query: () => ({
                url: constant.URL_MAILBOXES,
                method: HTTP_METHOD.GET,
            }),
        }),
        getMailInOneBox: builder.query<
            SuccessResponse<EmailResponse>,
            EmailRequest
        >({
            query: ({
                mailboxId,
                page = 1,
                limit = 10,
                unreadOnly,
                starredOnly,
            }) => ({
                url: `${constant.URL_MAILBOXES}/${mailboxId}/emails`,
                method: HTTP_METHOD.GET,
                params: {
                    page,
                    limit,
                    unreadOnly: unreadOnly,
                    starredOnly: starredOnly,
                },
            }),
            providesTags: (_, __, arg) => [
                { type: "Emails", id: arg.mailboxId },
            ],
        }),
        getEmailById: builder.query<
            SuccessResponse<Email>,
            { id: string; mailbox?: string }
        >({
            query: ({ id, mailbox }) => {
                const params = new URLSearchParams();
                if (mailbox) params.append("mailbox", mailbox);
                const queryString = params.toString();
                return {
                    url: `/api/emails/${id}${queryString ? `?${queryString}` : ""}`,
                    method: HTTP_METHOD.GET,
                };
            },
            providesTags: (_, __, { id }) => [{ type: "Emails", id }],
        }),
        markEmailRead: builder.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `/api/emails/${id}/read`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
            ],
        }),
        markEmailUnread: builder.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `/api/emails/${id}/unread`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
            ],
        }),
        toggleEmailStar: builder.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `/api/emails/${id}/star`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
            ],
        }),
        deleteEmail: builder.mutation<SuccessResponse<null>, string>({
            query: (id) => ({
                url: `/api/emails/${id}`,
                method: HTTP_METHOD.DELETE,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetMailBoxesQuery,
    useGetMailInOneBoxQuery,
    useGetEmailByIdQuery,
    useMarkEmailReadMutation,
    useMarkEmailUnreadMutation,
    useToggleEmailStarMutation,
    useDeleteEmailMutation,
} = inboxApi;
