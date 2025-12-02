import {
    type SendEmailDto,
    type ComposeEmailResponse,
    ReplyEmailWithId,
} from "../_types/compose";
import type { Folder, EmailResponse, EmailRequest, Email } from "../_types";
import type { SuccessResponse } from "@/types/success-response";
import { api } from "@/services/index";
import { HTTP_METHOD } from "@/constants/services";
import constant from "../_constants";
import { ModifyEmail, ModifyEmailResponse } from "../_types/modify";

const inboxApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getMailBoxes: builder.query<SuccessResponse<Folder[]>, void>({
            query: () => ({
                url: constant.URL_MAILBOXES,
                method: HTTP_METHOD.GET,
            }),
            providesTags: ["Mailboxes"],
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
        sendEmail: builder.mutation<
            SuccessResponse<ComposeEmailResponse>,
            SendEmailDto
        >({
            query: (body) => ({
                url: constant.URL_SEND_EMAIL,
                method: HTTP_METHOD.POST,
                body,
            }),
        }),
        replyEmail: builder.mutation<
            SuccessResponse<ComposeEmailResponse>,
            ReplyEmailWithId
        >({
            query: (body) => ({
                url: constant.URL_REPLY_EMAIL(body.emailId),
                method: HTTP_METHOD.POST,
                body: body.replyData,
            }),
        }),
        modifyEmail: builder.mutation<
            SuccessResponse<ModifyEmailResponse>,
            ModifyEmail
        >({
            query: (body) => ({
                url: constant.URL_MODIFY_EMAIL(body.emailId),
                method: HTTP_METHOD.PATCH,
                body: {
                    mailBox: body.mailBox,
                    flags: body.flags,
                },
            }),
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
                    url: `/emails/${id}${
                        queryString ? `?${queryString}` : ""
                    }`,
                    method: HTTP_METHOD.GET,
                };
            },
            providesTags: (_, __, { id }) => [{ type: "Emails", id }],
        }),
        markEmailRead: builder.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `/emails/${id}/read`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
                "Mailboxes", // Refresh folder unread counts
            ],
        }),
        markEmailUnread: builder.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `/emails/${id}/unread`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
                "Mailboxes", // Refresh folder unread counts
            ],
        }),
        toggleEmailStar: builder.mutation<SuccessResponse<Email>, string>({
            query: (id) => ({
                url: `/emails/${id}/star`,
                method: HTTP_METHOD.PATCH,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
                "Mailboxes", // Refresh folder counts (starred folder)
            ],
        }),
        deleteEmail: builder.mutation<SuccessResponse<null>, string>({
            query: (id) => ({
                url: `/emails/${id}`,
                method: HTTP_METHOD.DELETE,
            }),
            invalidatesTags: (_, __, id) => [
                { type: "Emails", id },
                { type: "Emails", id: "LIST" },
                "Mailboxes", // Refresh folder counts
            ],
        }),
        getThreadEmails: builder.query<
            SuccessResponse<Email[]>,
            { id: string; mailbox?: string }
        >({
            query: ({ id, mailbox }) => {
                const params = new URLSearchParams();
                if (mailbox) params.append("mailbox", mailbox);
                const queryString = params.toString();
                return {
                    url: `/emails/${id}/thread${
                        queryString ? `?${queryString}` : ""
                    }`,
                    method: HTTP_METHOD.GET,
                };
            },
            providesTags: (_, __, { id }) => [{ type: "Emails", id: `THREAD-${id}` }],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetMailBoxesQuery,
    useGetMailInOneBoxQuery,
    useSendEmailMutation,
    useReplyEmailMutation,
    useModifyEmailMutation,
    useGetEmailByIdQuery,
    useMarkEmailReadMutation,
    useMarkEmailUnreadMutation,
    useToggleEmailStarMutation,
    useDeleteEmailMutation,
    useGetThreadEmailsQuery,
} = inboxApi;
