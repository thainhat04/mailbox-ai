import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../../core/configs/config';

export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
  locale?: string;
}

@Injectable()
export class GoogleOAuthService {
  private oauth2Client: OAuth2Client;
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor() {
    this.oauth2Client = new OAuth2Client(
      config.oauth.google.clientId,
      config.oauth.google.clientSecret,
      config.oauth.google.callbackURL,
    );
  }

  getAuthUrl(state: string): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'consent',
    });

    this.logger.log('Generated Google OAuth URL');
    return authUrl;
  }

  async exchangeCode(code: string): Promise<{ access_token: string; id_token: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.logger.log('Successfully exchanged code for tokens');

      return {
        access_token: tokens.access_token,
        id_token: tokens.id_token,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens', error.stack);
      throw new Error('Failed to exchange authorization code');
    }
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: config.oauth.google.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid token payload');
      }

      const userInfo: GoogleUserInfo = {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified || false,
        name: payload.name || '',
        givenName: payload.given_name || '',
        familyName: payload.family_name || '',
        picture: payload.picture || '',
        locale: payload.locale,
      };

      this.logger.log(`Verified Google user: ${userInfo.email}`);
      return userInfo;
    } catch (error) {
      this.logger.error('Failed to verify ID token', error.stack);
      throw new Error('Failed to verify Google ID token');
    }
  }

  generateState(domain: string): string {
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `${randomPart}|${domain}`;
  }

  decodeState(state: string): { randomPart: string; domain: string } {
    const parts = state.split('|');
    if (parts.length !== 2) {
      throw new Error('Invalid state parameter');
    }
    return {
      randomPart: parts[0],
      domain: parts[1],
    };
  }
}
