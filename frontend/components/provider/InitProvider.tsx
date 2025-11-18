"use client";

import { ReactNode, useLayoutEffect } from "react";
import { useSelector } from "@/store";
import { useDispatch } from "@/store";
import { initLanguage } from "@/store/slice/language.slice";
import { initAuth } from "@/store/slice/auth.slice";
import type { RootState } from "@/store";
import LoadingApp from "../ui/LoadingApp";

interface Props {
    children: ReactNode;
}

export function InitProvider({ children }: Props) {
    const dispatch = useDispatch();
    const loading = useSelector((state: RootState) => state.app.loading);

    // mounted when all init flags turned true
    const mounted = Object.values(loading).every((v) => v === true);
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
