"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { setAppLoading } from "./app.slice";
import type { AppDispatch } from "../index";

interface LanguageState {
    language: string;
}

const initialState: LanguageState = {
    language: "en",
};

const languageSlice = createSlice({
    name: "language",
    initialState,
    reducers: {
        setLanguage: (state, action: PayloadAction<string>) => {
            if (action.payload !== "vi" && action.payload !== "en") return;
            if (state.language === action.payload) return;
            state.language = action.payload;
            if (typeof window !== "undefined") {
                localStorage.setItem("i18nextLng", action.payload);
            }
            const i18n = require("@/lib/i18n").default;
            if (i18n && typeof i18n.changeLanguage === "function") {
                i18n.changeLanguage(action.payload);
            }
        },
    },
});

export const { setLanguage } = languageSlice.actions;

/**
 * Thunk: initLanguage
 * - read from localStorage (if window)
 * - call i18n.changeLanguage if available
 * - dispatch setLanguage(...)
 * - dispatch setAppLoading({ language: true })
 */
export const initLanguage = () => (dispatch: AppDispatch) => {
    let lng = "en";

    if (typeof window !== "undefined") {
        lng = localStorage.getItem("i18nextLng") || "en";
    }

    try {
        // dynamic require to avoid SSR breakage
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const i18n = require("@/lib/i18n").default;
        if (i18n && typeof i18n.changeLanguage === "function") {
            i18n.changeLanguage(lng);
        }
    } catch (err) {
        // ignore if i18n not present during SSR/build
    }

    dispatch(setLanguage(lng));
    dispatch(setAppLoading({ language: true }));
};

export default languageSlice.reducer;
