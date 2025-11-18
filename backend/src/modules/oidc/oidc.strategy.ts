// oidc.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-openidconnect";

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  constructor(options: any) {
    super(options);
  }

  async validate(issuer: string, profile: any, done: VerifyCallback) {
    // Here you can delegate to OidcService
    done(null, { ...profile, provider: issuer });
  }
}
