import { OIDCProviderConfig } from "../dto/oidc.dto";

export const GoogleOIDCConfig: OIDCProviderConfig = {
  name: "google",
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
  redirectUri: process.env.GOOGLE_CALLBACK_URL!,
  scopes: ["openid", "email", "profile"],
};
