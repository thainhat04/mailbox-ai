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
import { convertCase } from "@/helper/convert/case-convert";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

const BASE_URL = AppConfig.apiBaseUrl;

const rawBaseQuery = fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem(SERVICES.accessToken);
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
            body: convertCase("", args.body),
        };
    }

    let result = await rawBaseQuery(processedArgs, api, extraOptions);

    if (
        (isError(result) &&
            result.error.status === constantServices.STATUS_UNAUTHORIZED) ||
        localStorage.getItem(constantServices.refreshToken)
    ) {
        if (!mutex.isLocked()) {
            const release = await mutex.acquire();
            try {
                const refreshToken = localStorage.getItem(
                    constantServices.refreshToken
                );

                const refreshResult = await rawBaseQuery(
                    {
                        url: constantServices.URL_REFRESH_TOKEN,
                        method: HTTP_METHOD.POST,
                        body: { refreshToken },
                    },
                    api,
                    extraOptions
                );

                if ("data" in refreshResult && refreshResult.data) {
                    // Lưu token mới
                    const {
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                    } = (refreshResult.data as any).data;

                    localStorage.setItem(SERVICES.accessToken, newAccessToken);
                    if (newRefreshToken) {
                        localStorage.setItem(
                            SERVICES.refreshToken,
                            newRefreshToken
                        );
                    }

                    // Retry request gốc
                    result = await rawBaseQuery(args, api, extraOptions);
                }
            } finally {
                release();
            }
        } else {
            await mutex.waitForUnlock();
            result = await rawBaseQuery(args, api, extraOptions);
        }
    }

    // custom error (giữ nguyên)
    if (isError(result)) {
        result.error = customError(result.error);
    }
    // convert case response data
    if ("data" in result && result.data) {
        result = {
            ...result,
            data: convertCase("", result.data),
        };
    }
    return result;
};
