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
            providesTags: [{ type: "Emails", id: "MAILBOXES_LIST" }],
        }),
        getMailInOneBox: builder.query<
            SuccessResponse<EmailResponse>,
            EmailRequest
        >({
            query: ({
                mailboxId,
                page = 1,
                limit = 50,
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
                method: HTTP_METHOD.POST,
                body: {
                    mailBox: body.mailBox,
                    flags: body.flags,
                },
            }),
            invalidatesTags: () => {
                // Only invalidate mailboxes list to update unread counts
                // Don't invalidate email list to avoid full page refresh
                return [{ type: "Emails", id: "MAILBOXES_LIST" }];
            },
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                if (!arg.mailBox) return;

                // Optimistic update: patch all cached pages
                const patches: Array<{ undo: () => void }> = [];

                // Update all pages in cache (we don't know which page the email is on)
                for (let page = 1; page <= 10; page++) {
                    const patchResult = dispatch(
                        inboxApi.util.updateQueryData(
                            'getMailInOneBox',
                            { mailboxId: arg.mailBox, page, limit: 50 },
                            (draft) => {
                                if (arg.flags.delete) {
                                    // Remove email from list if deleting
                                    draft.data.emails = draft.data.emails.filter((e) => e.id !== arg.emailId);
                                } else {
                                    // Update email flags
                                    const email = draft.data.emails.find((e) => e.id === arg.emailId);
                                    if (email) {
                                        if (arg.flags.read !== undefined) {
                                            email.isRead = arg.flags.read;
                                        }
                                        if (arg.flags.starred !== undefined) {
                                            email.isStarred = arg.flags.starred;
                                        }
                                    }
                                }
                            }
                        )
                    );
                    patches.push(patchResult);
                }

                try {
                    await queryFulfilled;
                } catch {
                    // Revert all optimistic updates on error
                    patches.forEach(patch => patch.undo());
                }
            },
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
                    url: `/api/emails/${id}${
                        queryString ? `?${queryString}` : ""
                    }`,
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
                method: HTTP_METHOD.POST,
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
    useSendEmailMutation,
    useReplyEmailMutation,
    useModifyEmailMutation,
    useGetEmailByIdQuery,
    useMarkEmailReadMutation,
    useMarkEmailUnreadMutation,
    useToggleEmailStarMutation,
    useDeleteEmailMutation,
} = inboxApi;
