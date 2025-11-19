"use client";

import { useRouter } from "next/navigation";

import { useSearchParams } from "next/navigation";

import { useDispatch } from "@/store";
import { login } from "@/store/slice/auth.slice";
import { useQueryHandler } from "@/hooks/useQueryHandler";
import { useGetUserQuery } from "@/services/User";
import SERVICES from "@/constants/services";
import constants from "./_constants";
import { useToast } from "@/components/ui/toast-provider";
import { use, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LoadingApp from "@/components/ui/LoadingApp";

function CallbackPage() {
    const router = useRouter();

    const { showToast } = useToast();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const searchParams = useSearchParams();
    const accessToken = searchParams.get(constants.accessTokenParam) || "";
    const refreshToken = searchParams.get(constants.refreshTokenParam) || "";
    const [isSaved, setIsSaved] = useState(false);
    const { result, error, raw } = useQueryHandler(useGetUserQuery, undefined, {
        skip: !isSaved,
    });

    useEffect(() => {
        //call dispatch to save tokens to localStorage
        if (accessToken && refreshToken) {
            localStorage.setItem(SERVICES.accessToken, accessToken);
            localStorage.setItem(SERVICES.refreshToken, refreshToken);
            setIsSaved(true);
        } else router.push(constants.URL_LOGIN);
    }, []);
    useEffect(() => {
        if (isSaved) {
            if (result) {
                const user = result.data;
                dispatch(login(user));
                router.push(constants.URL_LOGIN_REDIRECT);
                showToast(t("auth.login.8"), "success", constants.TIME_TOAST);
            }
        }
    }, [isSaved, result]);

    useEffect(() => {
        if (raw && raw.error) {
            router.push(constants.URL_LOGIN);
        }
    }, [raw]);

    return <LoadingApp />;
}

export default CallbackPage;
