"use client";

import { useEffect, useState } from "react";
import { useSelector } from "@/store";
import { useRouter } from "next/navigation";

function AuthRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useSelector((state) => state.auth.isLoggedIn);
    const router = useRouter();
    const [isAuth, setIsAuth] = useState(isAuthenticated);
    useEffect(() => {
        if (isAuthenticated) {
            router.push("/");
        }
    }, []);

    if (isAuth) return null;
    return <>{children}</>;
}

export default AuthRoute;
