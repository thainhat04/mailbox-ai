"use client";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import AuthRoute from "../routes/AuthRoute";
function AuthLayout({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [isAlignItemCenter, setIsAlignItemCenter] = useState(true);
    useEffect(() => {
        if (contentRef.current) {
            if (contentRef.current.scrollHeight > window.innerHeight) {
                setIsAlignItemCenter(false);
            } else {
                setIsAlignItemCenter(true);
            }
        }
    }, [contentRef]);
    return (
        <AuthRoute>
            <div className="h-screen w-screen flex bg-[#160430]">
                <div className="w-3/5 h-full relative">
                    <Image
                        src="/images/auth-background.png"
                        alt="Auth Background"
                        fill
                        className="object-cover"
                    />
                    <div className="absolute bottom-15 left-15 text-white uppercase">
                        <h2 className="text-3xl">{t("auth.1")}</h2>
                        <h1 className="text-5xl bg-linear-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                            {t("auth.2")}
                        </h1>
                    </div>
                </div>

                <div
                    ref={contentRef}
                    className={clsx(
                        "w-2/5 h-full overflow-y-scroll custom-scroll p-8 flex justify-center",
                        {
                            "items-center": isAlignItemCenter,
                            "items-start": !isAlignItemCenter,
                        }
                    )}
                >
                    {children}
                </div>
            </div>
        </AuthRoute>
    );
}

export default AuthLayout;
