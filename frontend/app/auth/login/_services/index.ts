import type { SignIn, SignInResponse } from "../_types";
import type { SuccessResponse } from "@/types/success-response";
import { api } from "@/services/index";
import { HTTP_METHOD } from "@/constants/services";
import constant from "../_constants";

const loginApi = api.injectEndpoints({
    endpoints: (builder) => ({
        signIn: builder.mutation<SuccessResponse<SignInResponse>, SignIn>({
            query: (body) => ({
                url: constant.URL_LOGIN,
                method: HTTP_METHOD.POST,
                body,
            }),
        }),
    }),
    overrideExisting: false,
});

export const { useSignInMutation } = loginApi;
