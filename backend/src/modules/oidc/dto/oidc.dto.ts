export interface OIDCProviderConfig {
  name: string; // "google" | "microsoft" | others
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  redirectUri: string;
  scopes: string[];

  // PKCE optional
  usePKCE?: boolean;
  codeVerifier?: string;
}
