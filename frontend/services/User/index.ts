// src/modules/user/services/user.api.ts
import { api } from "@/services";
import type { User } from "@/store/slice/auth.slice";
import { SuccessResponse } from "@/types/success-response";
import constants, { HTTP_METHOD } from "@/constants/services";
import { log } from "console";

export const userApi = api.injectEndpoints({
    endpoints: (build) => ({
        getUser: build.query<
            SuccessResponse<{ user: User; accessToken: string }>,
            void
        >({
            query: () => ({
                url: constants.URL_GET_PROFILE,
                method: HTTP_METHOD.GET,
                credentials: "include", // Gửi cookie cùng yêu cầu
            }),
        }),
        logout: build.mutation<SuccessResponse<null>, void>({
            query: () => ({
                url: constants.URL_LOGOUT,
                method: HTTP_METHOD.GET,
                credentials: "include",
            }),
        }),
    }),
});

export const { useGetUserQuery, useLogoutMutation } = userApi;
