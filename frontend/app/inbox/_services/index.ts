import type { Folder, EmailResponse, EmailRequest } from "../_types";
import {
    type SendEmailDto,
    type ComposeEmailResponse,
    ReplyEmailWithId,
} from "../_types/compose";
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
    }),
    overrideExisting: false,
});

export const {
    useGetMailBoxesQuery,
    useGetMailInOneBoxQuery,
    useSendEmailMutation,
    useReplyEmailMutation,
    useModifyEmailMutation,
} = inboxApi;
