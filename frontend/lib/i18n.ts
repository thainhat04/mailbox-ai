"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";

// Only initialize i18next on the client side
const isServer = typeof window === "undefined";

if (!isServer && !i18next.isInitialized) {
    i18next
        .use(initReactI18next)
        .use(Backend)
        .init({
            supportedLngs: ["en", "vi"],
            fallbackLng: "vi",
            ns: ["translations"],
            defaultNS: "translations",
            debug: process.env.NODE_ENV === "development",
            interpolation: { escapeValue: false },
            backend: {
                loadPath: "/locales/{{lng}}/translations.json",
            },
        });
}

export default i18next;
