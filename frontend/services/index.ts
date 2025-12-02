import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithInterceptors } from "./baseQuery";

export const api = createApi({
    baseQuery: baseQueryWithInterceptors,
    tagTypes: ["User", "Auth", "Emails", "Mailboxes"],
    keepUnusedDataFor: 60,
    endpoints: () => ({}),
});
