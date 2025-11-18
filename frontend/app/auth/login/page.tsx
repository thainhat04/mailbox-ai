"use client";
import AuthLayout from "@/components/layout/AuthLayout";
import { CustomInput } from "@/components/ui/InputAuth";
import { KeyRound, Mail } from "lucide-react";

import ButtonAuth from "@/components/ui/ButtonAuth";
import ButtonSocial from "@/components/ui/ButtonSocial";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import useInput from "@/hooks/useInput";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useSignInMutation } from "./_services";
import { useDispatch } from "@/store";
import { login } from "@/store/slice/auth.slice";
import SERVICES from "@/constants/services";
import constants from "./_constants";
import { useToast } from "@/components/ui/toast-provider";

function LoginPage() {
    const router = useRouter();
    const signInMutation = useMutationHandler(useSignInMutation, "Login");
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

            dispatch(login(user));
            localStorage.setItem(
                SERVICES.accessToken,
                signInMutation.result.data.accessToken
            );
            localStorage.setItem(
                SERVICES.refreshToken,
                signInMutation.result.data.refreshToken
            );

            router.push(constants.URL_LOGIN_REDIRECT);
            showToast(
                "Login successful. Redirecting...",
                "success",
                constants.TIME_TOAST
            );
        }
    }, [signInMutation.result]);

    return (
        <AuthLayout>
            <div className="text-white w-full p-5">
                <h1 className="text-5xl uppercase">{t("auth.login.1")}</h1>
                <p className="text-lg mt-5 font-bold">{t("auth.login.2")}</p>
                <div className="mt-3 flex flex-col gap-4">
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
                        className="mt-4 w-full rounded-md border border-red-500/40 
               bg-red-500/10 px-4 py-2 text-sm text-red-300 
               flex items-start justify-between gap-3"
                    >
                        <div className="flex items-center gap-2">
                            <span>{String(signInMutation.error.message)}</span>
                        </div>
                    </div>
                )}
                <ButtonAuth
                    text={t("auth.login.1")}
                    className="mt-6 w-full py-3 text-lg"
                    onClick={handleSubmit}
                    isLoading={signInMutation.isLoading}
                />
                <div className="my-6 w-full h-px bg-[#727272]"></div>
                <p className="text-[14px] w-full text-[#B6B6B6] text-start font-bold">
                    {t("auth.login.5")}
                </p>
                <div className="flex items-center justify-center gap-3 ">
                    <ButtonSocial
                        text="Google"
                        iconUrl="/icons/google-icon.svg"
                        className="mt-4 w-full py-3 text-lg"
                    />
                    <ButtonSocial
                        text="Facebook"
                        iconUrl="/icons/facebook-icon.svg"
                        className="mt-4 w-full py-3 text-lg"
                    />
                </div>
                <div className="mt-6 text-center text-[#B6B6B6] font-medium">
                    {t("auth.login.6")}{" "}
                    <span
                        role="button"
                        onClick={() => router.push("/auth/sign-up")}
                        className="cursor-pointer text-sky-500 hover:text-sky-400 font-semibold  decoration-sky-500/70"
                    >
                        {t("auth.login.7")}
                    </span>
                </div>
            </div>
        </AuthLayout>
    );
}

export default LoginPage;
