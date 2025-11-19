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
            <div className="text-white w-full max-w-md">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl uppercase font-bold">
                    {t("auth.signup.1")}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg mt-4 sm:mt-5 font-bold text-gray-300">
                    {t("auth.signup.2")}
                </p>
                <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:gap-4">
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
                        className="mt-4 w-full rounded-md border border-red-500/40 bg-red-500/10 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-300 flex items-start justify-between gap-3"
                    >
                        <div className="flex items-center gap-2">
                            <span>{String(signUpMutation.error.message)}</span>
                        </div>
                    </div>
                )}
                {signUpMutation.result && (
                    <div
                        role="status"
                        className="mt-4 w-full rounded-md border border-green-500/30 bg-green-500/10 px-3 sm:px-4 py-2 text-xs sm:text-sm text-green-300 flex items-start justify-between gap-3"
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
                    className="mt-6 w-full py-2.5 sm:py-3 text-sm sm:text-base lg:text-lg"
                    onClick={handleSubmit}
                    isLoading={signUpMutation.isLoading}
                />
                <div className="my-4 sm:my-6 w-full h-px bg-[#727272]"></div>
                <p className="text-xs sm:text-sm w-full text-[#B6B6B6] text-start font-bold">
                    {t("auth.signup.7")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-4">
                    <ButtonSocial
                        text="Google"
                        iconUrl="/icons/google-icon.svg"
                        className="mt-0 sm:mt-4 w-full py-2.5 sm:py-3 text-xs sm:text-base lg:text-lg"
                    />
                    <ButtonSocial
                        text="Facebook"
                        iconUrl="/icons/facebook-icon.svg"
                        className="mt-2 sm:mt-4 w-full py-2.5 sm:py-3 text-xs sm:text-base lg:text-lg"
                    />
                </div>
                <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-[#B6B6B6] font-medium">
                    {t("auth.signup.8")}{" "}
                    <span
                        role="button"
                        onClick={() => router.push("/auth/login")}
                        className="cursor-pointer text-sky-500 hover:text-sky-400 font-semibold decoration-sky-500/70"
                    >
                        {t("auth.signup.9")}
                    </span>
                </div>
            </div>
        </AuthLayout>
    );
}

export default SignUpPage;
