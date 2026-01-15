"use client";
import { useState, useCallback, useMemo } from "react";
import type { TypedMutationTrigger } from "@reduxjs/toolkit/query/react";
import { ErrorResponse } from "@/types/error-response";
import { isCustomError } from "@/helper/error/deprecated";
import SERVICES_CONSTANT from "@/constants/services";

export function useMutationHandler<
    H extends () => readonly [TypedMutationTrigger<any, any, any>, any],
    Name extends string
>(mutationHook: H, name: Name) {
    type Trigger = ReturnType<H>[0];
    type Result = Awaited<ReturnType<ReturnType<Trigger>["unwrap"]>>;

    const [trigger] = mutationHook();

    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAction = useCallback(
        async (
            args: Parameters<Trigger>[0],
            throwOnError = false,
            resultWithError = false
        ) => {
            setIsLoading(true);
            setError(null);
            setMessage(null);
            setResult(null);
            try {
                const res = await trigger(args).unwrap();
                setResult(res);
                if (!resultWithError) return res;
                return {
                    data: res,
                    error: null,
                };
            } catch (err) {
                if (isCustomError(err)) {
                    const e = err as any;
                    if (
                        e.status !== SERVICES_CONSTANT.STATUS_NOT_CLIENT_ERROR
                    ) {
                        const errData = e.data as ErrorResponse;
                        setMessage(errData.message);
                        setError(errData.errorCode);
                        //dùng translate ở Error
                        if (resultWithError) {
                            return {
                                data: null,
                                error: {
                                    error: errData.errorCode,
                                    message: errData.message,
                                },
                            };
                        }
                    }
                    if (throwOnError) throw e;
                }
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [trigger]
    );

    // Các callback riêng biệt
    const action: (args: Parameters<Trigger>[0]) => Promise<Result | null> =
        useCallback(
            (args: Parameters<Trigger>[0]) => handleAction(args, false),
            [handleAction]
        );

    const unwrapAction: (args: Parameters<Trigger>[0]) => Promise<Result> =
        useCallback((args) => handleAction(args, true), [handleAction]);

    const wrapAction: (args: Parameters<Trigger>[0]) => Promise<{
        data: Result | null;
        error: { error: string; message: string } | null;
    }> = useCallback((args) => handleAction(args, false, true), [handleAction]);

    const errorInfo = useMemo(() => {
        if (error || message) {
            return { error, message };
        }
        return null;
    }, [error, message]);

    return {
        [name]: action,
        [`${name}UnWrap`]: unwrapAction,
        [`${name}Wrap`]: wrapAction,
        result,
        error: errorInfo,
        isLoading,
    } as Record<Name, typeof action> &
        Record<`${Name}UnWrap`, typeof unwrapAction> &
        Record<`${Name}Wrap`, typeof wrapAction> & {
            result: Result | null;
            error: typeof errorInfo;
            isLoading: boolean;
        };
}

// Usage example:
// const { mutate, muteNoWrap, result, error, isLoading } = useMutationHandler(useCreateUserMutation, 'mutate');
