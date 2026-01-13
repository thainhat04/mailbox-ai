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
    const [isSaved, setIsSaved] = useState(false);
    const { result, error, raw } = useQueryHandler(useGetUserQuery, undefined, {
        skip: !isSaved,
    });

    useEffect(() => {
        if (accessToken) {
            localStorage.setItem(SERVICES.isLoggedIn, "true");
            setIsSaved(true);
        } else router.push(constants.URL_LOGIN);
    }, []);
    useEffect(() => {
        if (isSaved) {
            if (result) {
                const data = result.data;
                dispatch(login(data));
                router.push(constants.URL_LOGIN_REDIRECT);
                showToast(t("auth.login.8"), "success", constants.TIME_TOAST);
            }
        }
    }, [isSaved, result]);

    useEffect(() => {
        if (raw && raw.error) {
            router.push(constants.URL_LOGIN);
            showToast(t("auth.login.9"), "error", constants.TIME_TOAST);
        }
    }, [raw]);

    return <LoadingApp />;
}

export default CallbackPage;
