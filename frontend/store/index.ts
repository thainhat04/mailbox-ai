"use client";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";

// RTK Query API (you had this)
import { api } from "@/services";
import { rtkQueryErrorLogger } from "@/services/middleware/rtk-query-error-logger";

// slices
import themeReducer from "./slice/theme.slice";
import authReducer from "./slice/auth.slice";
import appReducer from "./slice/app.slice";
import languageReducer from "./slice/language.slice";

const rootReducer = combineReducers({
    theme: themeReducer,
    auth: authReducer,
    app: appReducer,
    language: languageReducer,
    [api.reducerPath]: api.reducer,
});

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(api.middleware)
            .concat(rtkQueryErrorLogger),
    devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

// convenience: typed useDispatch hook (if you prefer)
export const useDispatch = () => store.dispatch as AppDispatch;

export default store;
