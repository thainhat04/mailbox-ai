import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { config } from '../../../core/configs/config';
import * as crypto from 'crypto';

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  provider: string;
  emailVerified: boolean;
  iat?: number;
  exp?: number;
}

export interface DecodedToken {
  email: string;
  userId: string;
  userFromProvider: boolean;
  emailVerified: boolean;
  fullName?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  provider: string;
  identities?: any;
  roles: string[];
  accountType: number;
}

@Injectable()
export class JwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  async generateAccessToken(user: any): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      provider: user.provider,
      emailVerified: user.emailVerified,
    };

    return this.jwtService.sign(payload, {
      secret: config.jwt.jwtSecret,
      expiresIn: config.jwt.jwtExpiresIn,
    });
  }

  async generateRefreshToken(user: any): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: config.jwt.refreshTokenSecret,
      expiresIn: config.jwt.refreshTokenExpiresIn,
    });
  }

  async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<DecodedToken | null> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: config.jwt.jwtSecret,
      });

      return {
        email: decoded.email,
        userId: decoded.sub,
        userFromProvider: decoded.provider === 'GOOGLE',
        emailVerified: decoded.emailVerified || false,
        fullName: decoded.fullName,
        givenName: decoded.givenName,
        familyName: decoded.familyName,
        picture: decoded.picture,
        provider: decoded.provider,
        identities: decoded.identities,
        roles: decoded.roles || [],
        accountType: decoded.accountType || 0,
      };
    } catch (error) {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token, {
        secret: config.jwt.refreshTokenSecret,
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  hashToken(token: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateRandomCode(length: number = 6): string {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
