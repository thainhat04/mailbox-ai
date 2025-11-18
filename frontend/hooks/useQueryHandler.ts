"use client";
import { useState, useEffect, useMemo } from "react";
import type { TypedUseQueryHookResult } from "@reduxjs/toolkit/query/react";
import type { QueryOptions } from "@/types/optional-query";

import { ErrorResponse } from "@/types/error-response";
import { isCustomError } from "@/helper/error/deprecated";

export function useQueryHandler<T, A = void>(
    queryHook: (arg: A, options?: any) => TypedUseQueryHookResult<T, any, any>,
    args: A extends void ? undefined : A,
    options?: QueryOptions<T>
) {
    const queryResult = queryHook(args as A, options);

    const {
        data,
        error: rawError,
        isLoading,
        isFetching,
        refetch,
    } = queryResult;

    const [result, setResult] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [message, setMessage] = useState<string | null>(null);

    // cập nhật result khi có data
    useEffect(() => {
        if (data) {
            setResult(data);
        }
    }, [data]);

    // chuẩn hóa error
    useEffect(() => {
        if (rawError && isCustomError(rawError)) {
            const err = rawError as any;
            if (err.status !== 0) {
                const errData = err.data as ErrorResponse;
                setMessage(errData.message);
                setError(errData.errorCode);
                //dùng translate ở Error
            }
        } else {
            setError(null);
            setMessage(null);
        }
    }, [rawError]);

    const errorInfo = useMemo(() => {
        if (!rawError) return null;
        if (error || message) {
            return { error, message };
        }
        return null;
    }, [rawError, error, message]);
    return {
        result, // kiểu của data Query bạn truyền vào
        error: errorInfo, // { error: string | null, message: string | null } | null
        isLoading, // lần đầu gọi
        isFetching, // các lần gọi sau
        refetch, // hàm gọi lại
        raw: queryResult, // kết quả thô từ RTK Query
    };
}

// Usage example:
// const userQuery = useQueryHandler(useGetUserQuery, userId, { refetchOnFocus: true });
// const userData = userQuery.result;
// const userErr = userQuery.error;
