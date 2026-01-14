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
import { Mutex } from "async-mutex";

const mutex = new Mutex();

const BASE_URL = AppConfig.apiBaseUrl;

const rawBaseQuery = fetchBaseQuery({
    baseUrl: BASE_URL,
    credentials: "include", // Include cookies in requests
    prepareHeaders: (headers) => {
        // Try to get token from localStorage first (for backward compatibility)
        const token = localStorage.getItem(SERVICES.accessToken);
        if (token) {
            headers.set("authorization", `Bearer ${token}`);
        }
        // If no token in localStorage, cookies will be sent automatically via credentials: "include"
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
            body: convertArgBase("dto", args.body),
        };
    }

    let result = await rawBaseQuery(processedArgs, api, extraOptions);

    if (
        isError(result) &&
        result.error.status === constantServices.STATUS_UNAUTHORIZED
    ) {
        // Try to refresh token - cookies will be sent automatically via credentials: "include"
        // If refreshToken is in localStorage, send it in body as well (for backward compatibility)
        const refreshToken = localStorage.getItem(constantServices.refreshToken);

        // Always try to refresh if we have a token in localStorage OR cookies might be available
        if (refreshToken || true) { // Always try - backend will check cookies if body is empty
            if (!mutex.isLocked()) {
                const release = await mutex.acquire();
                try {
                    // Send refreshToken in body if available, otherwise backend will use cookies
                    const data = refreshToken
                        ? convertArgBase("dto", { refreshToken })
                        : convertArgBase("dto", {});

                    const refreshResult = await rawBaseQuery(
                        {
                            url: constantServices.URL_REFRESH_TOKEN,
                            method: HTTP_METHOD.POST,
                            body: data,
                        },
                        api,
                        extraOptions
                    );

                    if ("data" in refreshResult && refreshResult.data) {
                        // Lưu token mới vào localStorage (cookies được set tự động bởi backend)
                        const {
                            accessToken: newAccessToken,
                            refreshToken: newRefreshToken,
                        } = (refreshResult.data as any).data;

                        // Update localStorage for backward compatibility
                        if (newAccessToken) {
                            localStorage.setItem(SERVICES.accessToken, newAccessToken);
                        }
                        if (newRefreshToken) {
                            localStorage.setItem(
                                SERVICES.refreshToken,
                                newRefreshToken
                            );
                        }

                        // Retry request gốc
                        result = await rawBaseQuery(
                            processedArgs,
                            api,
                            extraOptions
                        );
                    }
                } finally {
                    release();
                }
            } else {
                await mutex.waitForUnlock();
                result = await rawBaseQuery(processedArgs, api, extraOptions);
            }
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
            data: convertArgBase("domain", result.data),
        };
    }
    return result;
};
