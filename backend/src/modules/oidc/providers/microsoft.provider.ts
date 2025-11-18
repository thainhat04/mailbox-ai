import { OIDCProviderConfig } from "../dto/oidc.dto";

export const MicrosoftOIDCConfig: OIDCProviderConfig = {
  name: "microsoft",
  clientId: process.env.MS_CLIENT_ID!,
  clientSecret: process.env.MS_CLIENT_SECRET!,
  authorizationEndpoint:
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  userInfoEndpoint: "https://graph.microsoft.com/oidc/userinfo",
  redirectUri: process.env.MS_REDIRECT_URI!,
  scopes: ["openid", "email", "profile", "offline_access"], // REQUIRED
};
