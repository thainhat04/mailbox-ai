import axios from "axios";
import { Injectable } from "@nestjs/common";
import { OIDCProviderConfig } from "./dto/oidc.dto";
import { OAuthProvider } from "../auth/dto/providers";
import { GoogleOIDCConfig } from "./providers/google.provider";
import { MicrosoftOIDCConfig } from "./providers/microsoft.provider";
import * as jwt from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { HashUtil } from "../../common/utils/hash.util";
import crypto from "crypto";
import { UserRole } from "@prisma/client";

export interface OidcUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class OIDCService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // STEP 1: Create Auth URL (Redirect User -> Provider)
  createAuthUrl(provider: OIDCProviderConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: "code",
      scope: provider.scopes.join(" "),
      state,
    });

    // Google-specific: Add parameters to get refresh_token
    if (provider.name === "google") {
      params.append("access_type", "offline");
      params.append("prompt", "consent");
    }

    return `${provider.authorizationEndpoint}?${params.toString()}`;
  }

  // STEP 2: Exchange Code For Tokens (CALL TOKEN ENDPOINT)
  async exchangeCodeForTokens(provider: OIDCProviderConfig, code: string) {
    const data = new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: provider.redirectUri,
    });

    // PROVIDER SPECIAL LOGIC
    switch (provider.name) {
      case "google":
        break;

      case "microsoft":
        // Microsoft REQUIRES scope AGAIN to get refresh_token
        data.append("scope", provider.scopes.join(" "));
        break;
    }

    // PKCE SUPPORT
    if (provider.usePKCE && provider.codeVerifier) {
      data.append("code_verifier", provider.codeVerifier);
    }

    const res = await axios.post(provider.tokenEndpoint, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return res.data; // contains refresh_token (Google + Microsoft)
  }

  // Get provider config by OAuthProvider enum
  private getProviderConfig(provider: OAuthProvider): OIDCProviderConfig {
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return GoogleOIDCConfig;
      case OAuthProvider.MICROSOFT:
        return MicrosoftOIDCConfig;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Verify ID Token and extract user info
  async verifyIDToken(
    idToken: string,
    provider: OAuthProvider,
  ): Promise<OidcUserInfo> {
    if (!idToken) {
      throw new Error("No id_token field in token response");
    }

    // Decode the ID token (without verification for now)
    // For production, you should verify the signature using JWKS
    const decoded = jwt.decode(idToken, { complete: true });

    if (!decoded || typeof decoded === "string") {
      throw new Error("Failed to decode ID Token");
    }

    const payload = decoded.payload as jwt.JwtPayload;

    // Validate basic claims
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error("ID Token has expired");
    }

    // Extract user info from claims
    const userInfo: OidcUserInfo = {
      sub: payload.sub || "",
      email: payload.email,
      email_verified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    };

    if (!userInfo.sub) {
      throw new Error("Invalid ID Token: missing sub claim");
    }

    return userInfo;
  }

  async authenticationWithCode(provider: OAuthProvider, code: string) {
    const providerConfig = this.getProviderConfig(provider);
    const tokens = await this.exchangeCodeForTokens(providerConfig, code);

    // Extract and verify ID token
    const idToken = tokens.id_token;
    console.log("idToken", idToken);
    if (!idToken) {
      throw new Error("No id_token in token response");
    }

    const userInfo = await this.verifyIDToken(idToken, provider);

    userInfo.email = userInfo.email ?? userInfo.sub;
    if (!userInfo.email) {
      throw new Error("Email is required for user creation");
    }

    let user = await this.prisma.user.findUnique({
      where: {
        email: userInfo.email,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || userInfo.given_name || null,
          hashPassword: "",
          role: UserRole.USER,
          isActive: true,
        },
      });
    }

    return {
      ...tokens,
      userInfo,
    };
  }
}
