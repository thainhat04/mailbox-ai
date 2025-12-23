import {
    type SendEmailDto,
    type ComposeEmailResponse,
    ReplyEmailWithId,
} from "../_types/compose";
import {
    type Folder,
    type PreviewEmailResponse,
    type PreviewEmailRequest,
    type Email,
    type EmailRequest,
    type PreviewEmail,
    type KanbanBoardData,
    type KanbanItem,
    type SetFrozenRequest,
    type SearchEmail,
    type SearchEmailResponse,
    type SearchEmailRequest,
    type UpdateKanbanStatusResponse,
} from "../_types";
import type { SuccessResponse } from "@/types/success-response";
import { api } from "@/services/index";
import { HTTP_METHOD } from "@/constants/services";
import constant from "../_constants";
import { ModifyEmail } from "../_types/modify";
import type { RootState } from "@/store";
import {
    CreateKanbanColumnRequest,
    EmailSummaryData,
    KanbanColumnDetails,
    UpdateKanbanStatusRequest,
} from "../_types/kanban";

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
                { type: "Emails", id: `${arg.mailboxId}-${arg.page}` },
                { type: "Emails", id: `LIST-${arg.mailboxId}` },
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
                const boxTrigger = result.data.labelId.map((labelId) => ({
                    type: "Emails" as const,
                    id: `${labelId}-1`,
                }));
                return [
                    { type: "Emails", id: "MAILBOXES_LIST" },
                    ...boxTrigger,
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
            invalidatesTags: (result, _, arg) => {
                if (!result) return [];
                const boxTrigger = result.data.labelId.map((labelId) => ({
                    type: "Emails" as const,
                    id: `${labelId}-1`,
                }));
                return [...boxTrigger, { type: "Emails", id: arg.emailId }];
            },
        }),
        modifyEmail: builder.mutation<
            SuccessResponse<PreviewEmail>,
            ModifyEmail
        >({
            query: (body) => ({
                url: constant.URL_MODIFY_EMAIL(body.emailId),
                method: HTTP_METHOD.PUT,
                body: {
                    labelId: "INBOX",
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

                const mailboxList = arg.mailBox;

                const targetEntries = allCachePreviewEntries.filter((entry) =>
                    mailboxList.includes(entry.mailboxId)
                );
                let _email: PreviewEmail | undefined = undefined;

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
                                        _email = { ...email };
                                        if (arg.flags.read !== undefined) {
                                            email.isRead = arg.flags.read;
                                        }
                                        if (arg.flags.starred !== undefined) {
                                            email.isStarred = arg.flags.starred;
                                            if (arg.flags.starred) {
                                                email.labelId = Array.from(
                                                    new Set([
                                                        ...email.labelId,
                                                        "STARRED",
                                                    ])
                                                );
                                            } else {
                                                email.labelId =
                                                    email.labelId.filter(
                                                        (id) => id !== "STARRED"
                                                    );
                                            }
                                        }
                                    }
                                }
                            }
                        )
                    );
                    patches.push(patch);
                }
                const mailboxPatch = dispatch(
                    inboxApi.util.updateQueryData(
                        "getMailBoxes",
                        undefined,
                        (draft) => {
                            if (arg.flags.delete) {
                                const mailBox = draft.data.filter((mb) =>
                                    mailboxList.includes(mb.id)
                                );
                                mailBox.forEach((mb) => {
                                    mb.unreadCount = Math.max(
                                        0,
                                        mb.unreadCount - 1
                                    );
                                });
                            } else if (arg.flags.read !== undefined) {
                                const mailBox = draft.data.filter((mb) =>
                                    mailboxList.includes(mb.id)
                                );
                                mailBox.forEach((mb) => {
                                    if (arg.flags.read) {
                                        mb.unreadCount = Math.max(
                                            0,
                                            mb.unreadCount - 1
                                        );
                                    } else {
                                        mb.unreadCount += 1;
                                    }
                                });
                            } else if (arg.flags.starred !== undefined) {
                                if (_email) {
                                    const mailBox = draft.data.find(
                                        (mb) => mb.id === "STARRED"
                                    );
                                    if (mailBox) {
                                        if (arg.flags.starred) {
                                            if (!_email.isRead) {
                                                mailBox.unreadCount += 1;
                                            }
                                        } else {
                                            if (!_email.isRead) {
                                                mailBox.unreadCount = Math.max(
                                                    0,
                                                    mailBox.unreadCount - 1
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    )
                );
                const mailDetailPatch = dispatch(
                    inboxApi.util.updateQueryData(
                        "getEmailById",
                        { id: arg.emailId },
                        (draft) => {
                            if (arg.flags.read !== undefined) {
                                draft.data.isRead = arg.flags.read;
                            }
                            if (arg.flags.starred !== undefined) {
                                draft.data.isStarred = arg.flags.starred;
                                if (arg.flags.starred) {
                                    draft.data.labelId = Array.from(
                                        new Set([
                                            ...draft.data.labelId,
                                            "STARRED",
                                        ])
                                    );
                                } else {
                                    draft.data.labelId =
                                        draft.data.labelId.filter(
                                            (id) => id !== "STARRED"
                                        );
                                }
                            }
                        }
                    )
                );

                patches.push(mailboxPatch);
                patches.push(mailDetailPatch);
                try {
                    await queryFulfilled;
                } catch {
                    patches.forEach((p) => p.undo());
                }
            },
            invalidatesTags: (result, _, arg) => {
                if (!result) return [];

                const hasDelete = arg.flags.delete !== undefined;
                const hasStarred = arg.flags.starred !== undefined;

                // Nếu update STARRED
                if (hasStarred) {
                    return [{ type: "Emails", id: "LIST-STARRED" }];
                }

                // Nếu DELETE hoặc STARRED thì KHÔNG invalidate theo emailId
                if (hasDelete || hasStarred) {
                    return [];
                }

                // Mặc định
                return [{ type: "Emails", id: arg.emailId }];
            },
        }),

        getEmailById: builder.query<SuccessResponse<Email>, EmailRequest>({
            query: (body) => ({
                url: `/emails/${body.id}`,
                method: HTTP_METHOD.GET,
            }),
            providesTags: (_, __, arg) => [{ type: "Emails", id: arg.id }],
        }),

        getAllKanBan: builder.query<
            SuccessResponse<KanbanBoardData>,
            {
                includeDoneAll?: boolean;
                unreadOnly?: boolean;
                hasAttachmentsOnly?: boolean;
                fromEmail?: string;
                sortBy?: string;
            } | void
        >({
            query: (params) => ({
                url: constant.URL_KANBAN,
                method: HTTP_METHOD.GET,
                params: {
                    includeDoneAll: params?.includeDoneAll ?? true,
                    unreadOnly: params?.unreadOnly,
                    hasAttachmentsOnly: params?.hasAttachmentsOnly,
                    fromEmail: params?.fromEmail,
                    sortBy: params?.sortBy,
                },
            }),
        }),
        updateKanBanStatus: builder.mutation<
            SuccessResponse<UpdateKanbanStatusResponse>,
            UpdateKanbanStatusRequest
        >({
            query: (body) => ({
                url: constant.URL_UPDATE_KANBAN_STATUS(body.id),
                method: HTTP_METHOD.PATCH,
                body: {
                    columnId: body.newStatus,
                },
            }),
            async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
                try {
                    const result = await queryFulfilled;
                    const data = result.data.data;

                    // Cập nhật lại mailboxes
                    dispatch(
                        inboxApi.util.updateQueryData(
                            "getMailBoxes",
                            undefined,
                            (draft) => {
                                // Nguồn
                                const sourceLabel = draft.data.find(
                                    (mb) => mb.id === data.sourceLabel.id
                                );
                                if (sourceLabel) {
                                    sourceLabel.unreadCount =
                                        data.sourceLabel.unreadCount;
                                }
                                // Đích
                                const destLabel = draft.data.find(
                                    (mb) => mb.id === data.destinationLabel.id
                                );
                                if (destLabel) {
                                    destLabel.unreadCount =
                                        data.destinationLabel.unreadCount;
                                }
                            }
                        )
                    );
                } catch (err) {}
            },
        }),
        summarizeEmail: builder.query<
            SuccessResponse<EmailSummaryData>,
            { emailId: string }
        >({
            query: (body) => ({
                url: constant.URL_SUMMARIZE_EMAIL(body.emailId),
                method: HTTP_METHOD.GET,
                params: {
                    forceRegenerate: false,
                },
            }),
        }),
        updateFrozenStatus: builder.mutation<
            SuccessResponse<KanbanItem>,
            SetFrozenRequest
        >({
            query: (body) => ({
                url: constant.URL_FROZEN_EMAILS(body.emailId),
                method: HTTP_METHOD.POST,
                body: {
                    duration: body.duration,
                    customDateTime: body.customDateTime,
                },
            }),
        }),
        searchEmails: builder.query<
            SuccessResponse<SearchEmailResponse>,
            SearchEmailRequest
        >({
            query: (body) => {
                const params: any = {
                    page: body.page || 1,
                    limit: body.limit || 20,
                };

                if (body.mode === "fuzzy") {
                    params.q = body.q;
                } else if (body.mode === "semantic") {
                    params.query = body.q;
                }
                return {
                    url: constant.URL_SEARCH(body.mode),
                    method: HTTP_METHOD.GET,
                    params: params,
                };
            },
            providesTags: (_, __, arg) => [
                {
                    type: "Emails",
                    id: `PUZZLE-${arg.q}-${arg.page}`,
                },
            ],
        }),

        getAllColumnDetails: builder.query<
            SuccessResponse<KanbanColumnDetails[]>,
            void
        >({
            query: () => ({
                url: constant.URL_CREATE_KANBAN_COLUMN,
                method: HTTP_METHOD.GET,
            }),
            providesTags: [
                { type: "KanbanColumns", id: "KANBAN_COLUMNS_LIST" },
            ],
        }),
        createKanbanColumn: builder.mutation<
            SuccessResponse<KanbanColumnDetails>,
            CreateKanbanColumnRequest
        >({
            query: (body) => ({
                url: constant.URL_CREATE_KANBAN_COLUMN,
                method: HTTP_METHOD.POST,
                body,
            }),
            async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
                try {
                    const result = await queryFulfilled;
                    dispatch(
                        inboxApi.util.updateQueryData(
                            "getMailBoxes",
                            undefined,
                            (draft) => {
                                draft.data.push(result.data.data.label);
                            }
                        )
                    );
                } catch (error) {}
            },
            invalidatesTags: [
                { type: "KanbanColumns", id: "KANBAN_COLUMNS_LIST" },
            ],
        }),
        updateKanBanColumn: builder.mutation<
            SuccessResponse<KanbanColumnDetails>,
            { id: string; body: CreateKanbanColumnRequest }
        >({
            query: ({ id, body }) => ({
                url: `${constant.URL_CREATE_KANBAN_COLUMN}/${id}`,
                method: HTTP_METHOD.PUT,
                body,
            }),
            async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
                try {
                    // Lấy kết quả của getAllColumnDetails từ cache
                    const cachedResult =
                        inboxApi.endpoints.getAllColumnDetails.select(
                            undefined
                        )(getState() as RootState);

                    let oldName = "";
                    if (cachedResult?.data?.data) {
                        const column = cachedResult.data.data.find(
                            (c) => c.id === arg.id
                        );
                        if (column) {
                            oldName = column.gmailLabelName;
                        }
                    }

                    await queryFulfilled;

                    // Update mailboxes if name changed
                    if (oldName && oldName !== arg.body.gmailLabelName) {
                        dispatch(
                            inboxApi.util.updateQueryData(
                                "getMailBoxes",
                                undefined,
                                (draft) => {
                                    const mailbox = draft.data.find(
                                        (mb) => mb.name === oldName
                                    );
                                    if (mailbox) {
                                        mailbox.name = arg.body.gmailLabelName;
                                    }
                                }
                            )
                        );
                    }
                } catch (error) {}
            },
            invalidatesTags: [
                { type: "KanbanColumns", id: "KANBAN_COLUMNS_LIST" },
            ],
        }),
        deleteKanBanColumn: builder.mutation<
            SuccessResponse<null>,
            { id: string }
        >({
            query: ({ id }) => ({
                url: `${constant.URL_CREATE_KANBAN_COLUMN}/${id}`,
                method: HTTP_METHOD.DELETE,
            }),
            invalidatesTags: [
                { type: "KanbanColumns", id: "KANBAN_COLUMNS_LIST" },
                { type: "Emails", id: "MAILBOXES_LIST" },
            ],
        }),
    }),
    overrideExisting: true,
});

export const {
    useGetMailBoxesQuery,
    useGetMailInOneBoxQuery,
    useSendEmailMutation,
    useReplyEmailMutation,
    useModifyEmailMutation,
    useGetEmailByIdQuery,
    useGetAllKanBanQuery,
    useUpdateKanBanStatusMutation,
    useSummarizeEmailQuery,
    useUpdateFrozenStatusMutation,
    useSearchEmailsQuery,
    useCreateKanbanColumnMutation,
    useUpdateKanBanColumnMutation,
    useDeleteKanBanColumnMutation,
    useGetAllColumnDetailsQuery,
} = inboxApi;
