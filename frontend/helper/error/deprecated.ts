import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export const isCustomError = (x: unknown): x is FetchBaseQueryError => {
    return typeof x === "object" && x !== null && "status" in x;
};

export const isError = (x: unknown): x is { error: FetchBaseQueryError } => {
    return typeof x === "object" && x !== null && "error" in x;
};
