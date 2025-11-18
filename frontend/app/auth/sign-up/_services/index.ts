import type { SignUp, SignUpResponse } from "../_types";
import type { SuccessResponse } from "@/types/success-response";
import { api } from "@/services/index";
import { HTTP_METHOD } from "@/constants/services";
import constant from "../_constants";

export const signUpApi = api.injectEndpoints({
    endpoints: (builder) => ({
        signUp: builder.mutation<SuccessResponse<SignUpResponse>, SignUp>({
            query: (body) => ({
                url: constant.URL_SIGN_UP,
                method: HTTP_METHOD.POST,
                body,
            }),
        }),
    }),
    overrideExisting: false,
});
export const { useSignUpMutation } = signUpApi;
