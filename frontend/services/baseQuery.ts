import { AppConfig } from "@/config";
import SERVICES from "@/constants/services";
import constantServices, { HTTP_METHOD } from "@/constants/services";
import { customError } from "@/helper/error/customError";
import { isError } from "@/helper/error/deprecated";
import {
    fetchBaseQuery,
    type BaseQueryFn,
    type FetchArgs,
    type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { convertArgBase } from "@/helper/convert/case-convert";
import type { RootState } from "@/store";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

const BASE_URL = AppConfig.apiBaseUrl;

const rawBaseQuery = fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken;
        if (token) headers.set("authorization", `Bearer ${token}`);
        return headers;
    },
});

export const baseQueryWithInterceptors: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    // Đợi nếu đang refresh token
    await mutex.waitForUnlock();

    let processedArgs = args;
    if (typeof args === "object" && "body" in args && args.body) {
        processedArgs = {
            ...args,
            body: convertArgBase(args.body),
        };
    }

    let result = await rawBaseQuery(processedArgs, api, extraOptions);

    // custom error (giữ nguyên)
    if (isError(result)) {
        result.error = customError(result.error);
    }
    // convert case response data
    if ("data" in result && result.data) {
        result = {
            ...result,
            data: convertArgBase(result.data),
        };
    }
    return result;
};
