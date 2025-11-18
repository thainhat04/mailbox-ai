import type { Folder, EmailResponse, EmailRequest } from "../_types";
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
    }),
    overrideExisting: false,
});

export const { useGetMailBoxesQuery, useGetMailInOneBoxQuery } = inboxApi;
