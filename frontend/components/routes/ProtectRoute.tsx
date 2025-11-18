"use client";

import React, { useEffect } from "react";
import { useSelector } from "@/store";
import { useRouter } from "next/navigation";

import constantServices from "@/constants/services";
function ProtectRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useSelector((state) => state.auth.isLoggedIn);
    const router = useRouter();
    const isAuth = React.useState(isAuthenticated);
    useEffect(() => {
        if (!isAuthenticated) {
            router.push(constantServices.URL_LOGIN);
        }
    }, [isAuthenticated, router]);

    if (!isAuth) return null;

    return <>{children}</>;
}

export default ProtectRoute;
