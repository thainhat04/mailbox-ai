"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { setAppLoading } from "./app.slice";
import type { AppDispatch } from "../index";
import SERVICES from "@/constants/services";
import { userApi } from "@/services/User";
import { RouterClient } from "@/helper/client-router";

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

interface AuthState {
    user: User | null;
    isLoggedIn: boolean;
}

const initialState: AuthState = {
    user: null,
    isLoggedIn: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        login: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.isLoggedIn = true;
        },
        logout: {
            reducer: (state) => {
                state.user = null;
                state.isLoggedIn = false;
                RouterClient.replace(SERVICES.URL_LOGIN);
            },
            prepare: () => {
                if (typeof window !== "undefined") {
                    localStorage.removeItem(SERVICES.accessToken);
                    localStorage.removeItem(SERVICES.refreshToken);
                }

                return { payload: undefined };
            },
        },
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },
    },
});

export const { login, logout, updateUser } = authSlice.actions;

/**
 * Thunk: initAuth
 * Example: check token in localStorage, optionally fetch profile,
 * then dispatch login(...) and setAppLoading({ user: true })
 *
 * Tailor to your auth flow (call API to refresh token or fetch profile).
 */
export const initAuth = () => async (dispatch: AppDispatch) => {
    try {
        if (typeof window === "undefined") {
            // server — just set false to indicate not initialized
            dispatch(setAppLoading({ user: true }));
            return;
        }

        const accessToken = localStorage.getItem(SERVICES.accessToken);
        if (accessToken) {
            try {
                const result = await dispatch(
                    userApi.endpoints.getUser.initiate()
                );
                if ("data" in result && result.data) {
                    dispatch(login(result.data.data));
                } else if (
                    "error" in result &&
                    result.error &&
                    "status" in result.error
                ) {
                    const status = result.error.status;

                    if (status === SERVICES.STATUS_UNAUTHORIZED) {
                        localStorage.removeItem(SERVICES.accessToken);
                        localStorage.removeItem(SERVICES.refreshToken);
                    } else {
                        throw new Error("retry");
                    }
                } else throw new Error("retry");
            } catch (err) {
                let retryCount = 0;
                const maxRetry = SERVICES.MAX_RETRY_ATTEMPTS;
                let success = false;

                while (retryCount < maxRetry) {
                    retryCount++;

                    await sleep(SERVICES.RETRY_DELAY_MS);

                    const retryResult = await dispatch(
                        userApi.endpoints.getUser.initiate()
                    );

                    if ("data" in retryResult && retryResult.data) {
                        dispatch(login(retryResult.data.data));
                        success = true;
                        break;
                    } else if (
                        "error" in retryResult &&
                        retryResult.error &&
                        "status" in retryResult.error
                    ) {
                        const status = retryResult.error.status;

                        if (status === SERVICES.STATUS_UNAUTHORIZED) {
                            localStorage.removeItem(SERVICES.accessToken);
                            localStorage.removeItem(SERVICES.refreshToken);
                            break;
                        }
                    }
                }
                if (!success) {
                    dispatch(logout());
                }
            }
        }

        // mark auth init done

        dispatch(setAppLoading({ user: true }));
    } catch (err) {
        dispatch(setAppLoading({ user: true }));
    }
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default authSlice.reducer;
