"use client";

import { ReactNode, useEffect, useLayoutEffect } from "react";
import { useSelector } from "@/store";
import { useDispatch } from "@/store";
import { initLanguage } from "@/store/slice/language.slice";
import { initAuth } from "@/store/slice/auth.slice";
import type { RootState } from "@/store";
import LoadingApp from "../ui/LoadingApp";
import { useRouter } from "next/dist/client/components/navigation";
import { RouterClient } from "@/helper/client-router";

interface Props {
    children: ReactNode;
}

export function InitProvider({ children }: Props) {
    const dispatch = useDispatch();
    const loading = useSelector((state: RootState) => state.app.loading);

    // mounted when all init flags turned true
    const mounted = Object.values(loading).every((v) => v === true);
    const router = useRouter();

    useEffect(() => {
        RouterClient.set({
            push: router.push,
            replace: router.replace,
        });
    }, [router]);

    useLayoutEffect(() => {
        // dispatch all init thunks you need
        dispatch(initLanguage());
        dispatch(initAuth());
        // add more inits if any (theme, settings)
    }, [dispatch]);

    if (!mounted) {
        return <LoadingApp />;
    }

    return <>{children}</>;
}
