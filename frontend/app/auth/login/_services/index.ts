import type { SignIn, SignInResponse, OAuthResponse } from "../_types";
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
        oAuthSignIn: builder.mutation<
            SuccessResponse<OAuthResponse>,
            { urlOAuth: string }
        >({
            query: ({ urlOAuth }) => ({
                url: `${urlOAuth}`,
                method: HTTP_METHOD.GET,
            }),
        }),
    }),
    overrideExisting: false,
});

export const { useSignInMutation, useOAuthSignInMutation } = loginApi;
