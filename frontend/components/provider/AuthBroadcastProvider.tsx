"use client";

import { useEffect } from "react";
import { useDispatch } from "@/store";
import { authChannel } from "@/lib/auth-channel";
import { logout } from "@/store/slice/auth.slice";
import SERVICES from "@/constants/services";

export default function AuthBroadcastProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const dispatch = useDispatch();

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type === SERVICES.LOGOUT_MESSAGE) {
                dispatch(logout());
            } else if (event.data?.type === SERVICES.LOGIN_MESSAGE) {
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        };

        authChannel.addEventListener("message", handler);

        return () => {
            authChannel.removeEventListener("message", handler);
        };
    }, [dispatch]);

    return <>{children}</>;
}
