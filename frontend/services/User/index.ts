// src/modules/user/services/user.api.ts
import { api } from "@/services";
import type { User } from "@/store/slice/auth.slice";
import { SuccessResponse } from "@/types/success-response";
import constants, { HTTP_METHOD } from "@/constants/services";

export const userApi = api.injectEndpoints({
    endpoints: (build) => ({
        getUser: build.query<SuccessResponse<User>, void>({
            query: () => ({
                url: constants.URL_GET_PROFILE,
                method: HTTP_METHOD.GET,
            }),
        }),
    }),
});

export const { useGetUserQuery } = userApi;
