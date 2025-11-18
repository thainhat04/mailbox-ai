"use client";

import { Provider } from "react-redux";
import { ToastProvider } from "@/components/ui/toast-provider";
import store from "../store";
import { InitProvider } from "@/components/provider/InitProvider";

export default function ProviderLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ToastProvider>
            <Provider store={store}>
                <InitProvider>{children}</InitProvider>
            </Provider>
        </ToastProvider>
    );
}
