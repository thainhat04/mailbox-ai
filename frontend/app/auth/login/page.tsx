"use client";
import AuthLayout from "@/components/layout/AuthLayout";
import { CustomInput } from "@/components/ui/InputAuth";
import { KeyRound, Mail } from "lucide-react";

import ButtonAuth from "@/components/ui/ButtonAuth";
import ButtonSocial from "@/components/ui/ButtonSocial";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { use, useEffect } from "react";
import useInput from "@/hooks/useInput";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useSignInMutation, useOAuthSignInMutation } from "./_services";
import { useDispatch } from "@/store";
import { login } from "@/store/slice/auth.slice";
import SERVICES from "@/constants/services";
import constants from "./_constants";
import { useToast } from "@/components/ui/toast-provider";

function LoginPage() {
    const router = useRouter();
    const signInMutation = useMutationHandler(useSignInMutation, "Login");
    const oAuthSignInMutation = useMutationHandler(
        useOAuthSignInMutation,
        "oAuthSignIn"
    );

    const { showToast } = useToast();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [email, setEmail, errorEmail, setErrorEmail] = useInput();
    const [password, setPassword, errorPassword, setErrorPassword] = useInput();
    const handleSubmit = () => {
        let isValid = true;
        //check email and password not empty
        if (!email) {
            setErrorEmail(t("auth.login.error.requiredEmail"));
            isValid = false;
        }
        if (!password) {
            setErrorPassword(t("auth.login.error.requiredPassword"));
            isValid = false;
        }
        if (!isValid) return;
        signInMutation.Login({
            email,
            password,
        });
    };
    useEffect(() => {
        if (signInMutation.result) {
            const user = signInMutation.result.data.user;

            dispatch(
                login({
                    user,
                    accessToken: signInMutation.result.data.accessToken,
                })
            );

            router.push(constants.URL_LOGIN_REDIRECT);
            showToast(t("auth.login.8"), "success", constants.TIME_TOAST);
        }
    }, [signInMutation.result]);

    const googleLoginHandler = () => {
        oAuthSignInMutation.oAuthSignIn({
            urlOAuth: constants.URL_GOOGLE_LOGIN,
        });
    };

    const microsoftLoginHandler = () => {
        oAuthSignInMutation.oAuthSignIn({
            urlOAuth: constants.URL_MICROSOFT_LOGIN,
        });
    };
    useEffect(() => {
        if (oAuthSignInMutation.result) {
            const responseUrl = oAuthSignInMutation.result.data.response;
            window.location.href = responseUrl;
        }
    }, [oAuthSignInMutation.result]);

    return (
        <AuthLayout>
            <div className="text-white w-full max-w-md">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl uppercase font-bold">
                    {t("auth.login.1")}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg mt-4 sm:mt-5 font-bold text-gray-300">
                    {t("auth.login.2")}
                </p>
                <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:gap-4">
                    <CustomInput
                        icon={<Mail color="#A4A4A4" />}
                        placeholder={t("auth.login.3")}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setErrorEmail("");
                        }}
                        error={errorEmail}
                    />

                    <CustomInput
                        icon={<KeyRound color="#A4A4A4" />}
                        placeholder={t("auth.login.4")}
                        hidden
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setErrorPassword("");
                        }}
                        error={errorPassword}
                    />
                </div>
                {!signInMutation.isLoading && signInMutation.error?.message && (
                    <div
                        role="alert"
                        className="mt-4 w-full rounded-md border border-red-500/40 bg-red-500/10 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-300 flex items-start justify-between gap-3"
                    >
                        <div className="flex items-center gap-2">
                            <span>{String(signInMutation.error.message)}</span>
                        </div>
                    </div>
                )}
                <ButtonAuth
                    text={t("auth.login.1")}
                    className="mt-6 w-full py-2.5 sm:py-3 text-sm sm:text-base lg:text-lg"
                    onClick={handleSubmit}
                    isLoading={
                        signInMutation.isLoading ||
                        oAuthSignInMutation.isLoading
                    }
                />
                <div className="my-4 sm:my-6 w-full h-px bg-[#727272]"></div>
                <p className="text-xs sm:text-sm w-full text-[#B6B6B6] text-start font-bold">
                    {t("auth.login.5")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-4">
                    <ButtonSocial
                        text="Google"
                        iconUrl="/icons/google-icon.svg"
                        className="mt-0 sm:mt-4 w-full py-2.5 sm:py-3 text-xs sm:text-base lg:text-lg"
                        onClick={googleLoginHandler}
                        isLoading={
                            oAuthSignInMutation.isLoading ||
                            signInMutation.isLoading
                        }
                    />
                    <ButtonSocial
                        text="Microsoft"
                        iconUrl="/icons/microsoft-icon.svg"
                        className="mt-2 sm:mt-4 w-full py-2.5 sm:py-3 text-xs sm:text-base lg:text-lg"
                        onClick={microsoftLoginHandler}
                        isLoading={
                            oAuthSignInMutation.isLoading ||
                            signInMutation.isLoading
                        }
                    />
                </div>
                <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-[#B6B6B6] font-medium">
                    {t("auth.login.6")}{" "}
                    <span
                        role="button"
                        onClick={() => router.push("/auth/sign-up")}
                        className="cursor-pointer text-sky-500 hover:text-sky-400 font-semibold decoration-sky-500/70"
                    >
                        {t("auth.login.7")}
                    </span>
                </div>
            </div>
        </AuthLayout>
    );
}

export default LoginPage;
