import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { HashUtil } from "../../common/utils/hash.util";
import {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  UserResponseDto,
} from "./dto";
import { BaseException } from "../../common/exceptions";
import { CODES } from "../../common/constants";
import { OAuthProvider, OAuthSignInResponseDto } from "./dto/providers";
import { OIDCService } from "../oidc/oidc.service";
import { GoogleOIDCConfig } from "../oidc/providers/google.provider";
import { MicrosoftOIDCConfig } from "../oidc/providers/microsoft.provider";
import { GenerateUtil } from "../../common/utils";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly oidcService: OIDCService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokenResponseDto> {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BaseException(
        "Email already exists",
        CODES.EMAIL_ALREADY_EXISTS,
      );
    }

    // Hash password
    const hashPassword = await HashUtil.hash(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        hashPassword,
      },
    });

    // Generate tokens
    return await this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BaseException("Invalid credentials", CODES.INVALID_CREDENTIALS);
    }

    // Verify password
    const isPasswordValid = await HashUtil.compare(password, user.hashPassword);

    if (!isPasswordValid) {
      throw new BaseException("Invalid credentials", CODES.INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new BaseException("Account is deactivated", CODES.USER_INACTIVE);
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new BaseException("Invalid refresh token", CODES.TOKEN_INVALID);
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        await this.prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { deletedAt: new Date() },
        });

        throw new BaseException("Refresh token expired", CODES.TOKEN_EXPIRED);
      }

      // Check if user is active
      if (!storedToken.user.isActive) {
        throw new BaseException("Account is deactivated", CODES.USER_INACTIVE);
      }

      // Soft delete old refresh token
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { deletedAt: new Date() },
      });

      // Generate new tokens
      return this.generateTokens(storedToken.user);
    } catch (error) {
      // Re-throw BaseException to preserve error details
      if (error instanceof BaseException) {
        throw error;
      }
      // Generic error for JWT verification failures
      throw new BaseException(
        "Invalid or expired refresh token",
        CODES.TOKEN_INVALID,
      );
    }
  }

  async logout(refreshToken: string): Promise<void> {
    // Soft delete refresh token from database
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { deletedAt: new Date() },
    });
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BaseException("User not found", CODES.USER_NOT_FOUND, 404);
    }

    return this.mapUserToResponse(user);
  }

  async oauthSignIn(
    provider: OAuthProvider,
    domain: string,
  ): Promise<OAuthSignInResponseDto> {
    const state = await GenerateUtil.generateState(domain);
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return {
          response: this.oidcService.createAuthUrl(GoogleOIDCConfig, state),
        };
      case OAuthProvider.MICROSOFT:
        return {
          response: this.oidcService.createAuthUrl(MicrosoftOIDCConfig, state),
        };
      default:
        throw new BaseException(
          "Invalid provider",
          CODES.INVALID_PROVIDER,
          400,
          "Invalid provider",
        );
    }
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token (60 minutes)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>("JWT_ACCESS_EXPIRATION") ||
        "60m") as any,
    });

    // Generate refresh token (30 days)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_REFRESH_SECRET") as any,
      expiresIn: (this.configService.get<string>("JWT_REFRESH_EXPIRATION") ||
        "30d") as any,
    });

    // Calculate expiration date for refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.mapUserToResponse(user),
    };
  }

  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
