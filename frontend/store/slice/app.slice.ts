"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AppInitState {
    loading: {
        language: boolean;
        user: boolean;
        // add more keys if you want other init flags e.g. theme, settings...
    };
}

const initialState: AppInitState = {
    loading: {
        language: false,
        user: false,
    },
};

const appSlice = createSlice({
    name: "app",
    initialState,
    reducers: {
        setAppLoading: (
            state,
            action: PayloadAction<Partial<AppInitState["loading"]>>
        ) => {
            Object.assign(state.loading, action.payload);
        },
        resetAppLoading: (state) => {
            state.loading = { language: false, user: false };
        },
    },
});

export const { setAppLoading, resetAppLoading } = appSlice.actions;
export default appSlice.reducer;
