"use client";
import AuthLayout from "@/components/layout/AuthLayout";
import { CustomInput } from "@/components/ui/InputAuth";
import { KeyRound, Mail, User } from "lucide-react";
import ButtonAuth from "@/components/ui/ButtonAuth";
import ButtonSocial from "@/components/ui/ButtonSocial";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import useInput from "@/hooks/useInput";
import { useMutationHandler } from "@/hooks/useMutationHandler";
import { useSignUpMutation } from "./_services";
//import { useToast } from "@/components/ui/toast-provider";

function SignUpPage() {
    const router = useRouter();
    //const { showToast } = useToast();
    const { t } = useTranslation();
    const [email, setEmail, errorEmail, setErrorEmail] = useInput();
    const [username, setUsername, errorUsername, setErrorUsername] = useInput();
    const [password, setPassword, errorPassword, setErrorPassword] = useInput();
    const [
        confirmPassword,
        setConfirmPassword,
        errorConfirmPassword,
        setErrorConfirmPassword,
    ] = useInput();

    const signUpMutation = useMutationHandler(useSignUpMutation, "SignUp");
    const handleSubmit = () => {
        let valid = true;
        // Validation logic here
        if (!email) {
            setErrorEmail(t("auth.signup.error.requiredEmail"));
            valid = false;
        }
        if (!username) {
            setErrorUsername(t("auth.signup.error.requiredUsername"));
            valid = false;
        }
        if (!password) {
            setErrorPassword(t("auth.signup.error.requiredPassword"));
            valid = false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            setErrorEmail(t("auth.signup.error.invalidEmail"));
            valid = false;
        }
        if (
            password &&
            !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
                password
            )
        ) {
            setErrorPassword(t("auth.signup.error.invalidPassword"));
            valid = false;
        }
        if (!confirmPassword) {
            setErrorConfirmPassword(
                t("auth.signup.error.requiredConfirmPassword")
            );
            valid = false;
        }
        if (password !== confirmPassword) {
            setErrorConfirmPassword(
                t("auth.signup.error.invalidConfirmPassword")
            );
            valid = false;
        }
        //Sign up
        if (!valid) return;
        signUpMutation.SignUp({
            email,
            password,
        });
    };

    return (
        <AuthLayout>
            <div className="text-white w-full p-5">
                <h1 className="text-5xl uppercase">{t("auth.signup.1")}</h1>
                <p className="text-lg mt-5 font-bold">{t("auth.signup.2")}</p>
                <div className="mt-3 flex flex-col gap-4">
                    <CustomInput
                        icon={<Mail color="#A4A4A4" />}
                        placeholder={t("auth.signup.3")}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setErrorEmail("");
                        }}
                        error={errorEmail}
                    />
                    <CustomInput
                        placeholder={t("auth.signup.4")}
                        icon={<User color="#A4A4A4" />}
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setErrorUsername("");
                        }}
                        error={errorUsername}
                    />
                    <CustomInput
                        icon={<KeyRound color="#A4A4A4" />}
                        placeholder={t("auth.signup.5")}
                        hidden
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setErrorPassword("");
                        }}
                        error={errorPassword}
                    />
                    <CustomInput
                        icon={<KeyRound color="#A4A4A4" />}
                        placeholder={t("auth.signup.6")}
                        hidden
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrorConfirmPassword("");
                        }}
                        error={errorConfirmPassword}
                    />
                </div>
                {!signUpMutation.isLoading && signUpMutation.error?.message && (
                    <div
                        role="alert"
                        className="mt-4 w-full rounded-md border border-red-500/40 
               bg-red-500/10 px-4 py-2 text-sm text-red-300 
               flex items-start justify-between gap-3"
                    >
                        <div className="flex items-center gap-2">
                            <span>{String(signUpMutation.error.message)}</span>
                        </div>
                    </div>
                )}
                {signUpMutation.result && (
                    <div
                        role="status"
                        className="mt-4 w-full rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2 
                   text-sm text-green-300 flex items-start justify-between gap-3"
                    >
                        <div className="flex items-center gap-2">
                            <span>
                                {String(
                                    t(
                                        "auth.signup.success",
                                        "Sign up successful!. Please go to login page."
                                    )
                                )}
                            </span>
                        </div>
                    </div>
                )}

                <ButtonAuth
                    text={t("auth.signup.1")}
                    className="mt-6 w-full py-3 text-lg"
                    onClick={handleSubmit}
                    isLoading={signUpMutation.isLoading}
                />
                <div className="my-6 w-full h-px bg-[#727272]"></div>
                <p className="text-[14px] w-full text-[#B6B6B6] text-start font-bold">
                    {t("auth.signup.7")}
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
                    {t("auth.signup.8")}{" "}
                    <span
                        role="button"
                        onClick={() => router.push("/auth/login")}
                        className="cursor-pointer text-sky-500 hover:text-sky-400 font-semibold  decoration-sky-500/70"
                    >
                        {t("auth.signup.9")}
                    </span>
                </div>
            </div>
        </AuthLayout>
    );
}

export default SignUpPage;
