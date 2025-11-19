import { AppConfig } from "@/config";
const LOGIN_CONSTANTS = {
    URL_LOGIN: "/auth/login",
    URL_LOGIN_REDIRECT: "/inbox",
    TIME_TOAST: 3000, // in milliseconds
    TIME_REDIRECT_AFTER_LOGIN: 500, // in milliseconds
    URL_GOOGLE_LOGIN: `${AppConfig.apiBaseUrl}/auth/signin/google?domain=${AppConfig.domainName}/auth/callback`,
    URL_MICROSOFT_LOGIN: `${AppConfig.apiBaseUrl}/auth/signin/microsoft?domain=${AppConfig.domainName}/auth/callback`,
};
export default LOGIN_CONSTANTS;
