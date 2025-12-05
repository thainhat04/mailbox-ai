import {
    type SendEmailDto,
    type ComposeEmailResponse,
    ReplyEmailWithId,
} from "../_types/compose";
import type {
    Folder,
    PreviewEmailResponse,
    PreviewEmailRequest,
    Email,
    EmailRequest,
} from "../_types";
import type { SuccessResponse } from "@/types/success-response";
import { api } from "@/services/index";
import { HTTP_METHOD } from "@/constants/services";
import constant from "../_constants";
import { ModifyEmail, ModifyEmailResponse } from "../_types/modify";
import type { RootState } from "@/store";

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
            SuccessResponse<PreviewEmailResponse>,
            PreviewEmailRequest
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
                { type: "Emails", mailboxId: arg.mailboxId },
                { type: "Emails", mailboxId: arg.mailboxId, page: arg.page },
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
            invalidatesTags: (result, _, __) => {
                if (!result) return [];
                return [
                    {
                        type: "Emails",
                        mailboxId: result.data.mailboxId,
                        page: 1,
                    },
                    { type: "Emails", id: "MAILBOXES_LIST" },
                ];
            },
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
            invalidatesTags: (result, _, __) => {
                if (!result) return [];
                return [
                    {
                        type: "Emails",
                        mailboxId: result.data.mailboxId,
                        page: 1,
                    },
                    { type: "Emails", id: "MAILBOXES_LIST" },
                ];
            },
        }),
        modifyEmail: builder.mutation<
            SuccessResponse<ModifyEmailResponse>,
            ModifyEmail
        >({
            query: (body) => ({
                url: constant.URL_MODIFY_EMAIL(body.emailId),
                method: "POST",
                body: {
                    mailBox: body.mailBox,
                    flags: body.flags,
                },
            }),
            async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
                if (!arg.mailBox) return;

                const patches: Array<{ undo: () => void }> = [];

                const allCachePreviewEntries =
                    inboxApi.util.selectCachedArgsForQuery(
                        getState() as RootState,
                        "getMailInOneBox"
                    );
                const allCacheEmailEntries =
                    inboxApi.util.selectCachedArgsForQuery(
                        getState() as RootState,
                        "getEmailById"
                    );

                const targetEntries = allCachePreviewEntries.filter(
                    (entry) => entry.mailboxId === arg.mailBox
                );

                const targetEmailEntries = allCacheEmailEntries.filter(
                    (entry) => entry.id === arg.emailId
                );

                for (const entry of targetEntries) {
                    const patch = dispatch(
                        inboxApi.util.updateQueryData(
                            "getMailInOneBox",
                            entry,
                            (draft) => {
                                if (arg.flags.delete) {
                                    draft.data.emails =
                                        draft.data.emails.filter(
                                            (e) => e.id !== arg.emailId
                                        );
                                } else {
                                    const email = draft.data.emails.find(
                                        (e) => e.id === arg.emailId
                                    );
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
                    patches.push(patch);
                }
                for (const entry of targetEmailEntries) {
                    const patch = dispatch(
                        inboxApi.util.updateQueryData(
                            "getEmailById",
                            entry,
                            (draft) => {
                                if (arg.flags.delete) {
                                    // No action on single email cache for delete
                                } else {
                                    if (arg.flags.read !== undefined) {
                                        draft.data.isRead = arg.flags.read;
                                    }
                                    if (arg.flags.starred !== undefined) {
                                        draft.data.isStarred =
                                            arg.flags.starred;
                                    }
                                }
                            }
                        )
                    );
                    patches.push(patch);
                }

                try {
                    await queryFulfilled;
                } catch {
                    patches.forEach((p) => p.undo());
                }
            },
            invalidatesTags: (result, _, __) => {
                if (!result) return [];
                return [{ type: "Emails", id: "MAILBOXES_LIST" }];
            },
        }),

        getEmailById: builder.query<SuccessResponse<Email>, EmailRequest>({
            query: (body) => ({
                url: `${constant.URL_MAILBOXES}/${body.mailboxId}/emails/${body.id}`,
                method: HTTP_METHOD.GET,
            }),
            providesTags: (_, __, arg) => [
                { type: "Emails", id: arg.id, mailbox: arg.mailboxId },
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
} = inboxApi;
