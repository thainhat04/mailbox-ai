import { Injectable, Inject, forwardRef } from "@nestjs/common";
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
import { KanbanColumnService } from "../email/services/kanban-column.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly kanbanColumnService: KanbanColumnService,
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
    // Initialize default Kanban columns for new user
    await this.kanbanColumnService.initializeDefaultColumns(user.id);

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

  async refreshToken(
    refreshToken: string,
    rotateRefreshToken = false,
  ): Promise<TokenResponseDto> {
    try {
      this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });

      const session = await this.prisma.session.findUnique({
        where: { sessionToken: refreshToken },
        include: { user: true },
      });

      if (!session) {
        throw new BaseException(
          "Invalid refresh token",
          CODES.TOKEN_INVALID,
          401,
        );
      }

      if (session.expires < new Date()) {
        await this.prisma.session.delete({
          where: { id: session.id },
        });

        throw new BaseException(
          "Refresh token expired",
          CODES.TOKEN_EXPIRED,
          401,
        );
      }

      if (!session.user.isActive) {
        throw new BaseException(
          "Account is deactivated",
          CODES.USER_INACTIVE,
          401,
        );
      }

      // ==========================
      // 🔁 FLOW CŨ – rotate refresh token
      // ==========================
      if (rotateRefreshToken) {
        await this.prisma.session.delete({
          where: { id: session.id },
        });

        return this.generateTokens(session.user);
      }

      // ==========================
      // 🚀 FLOW MỚI – giữ refresh token
      // ==========================
      const tokenPayload = {
        sub: session.user.id,
        email: session.user.email,
        role: session.user.role,
      };

      const accessToken = this.jwtService.sign(tokenPayload, {
        expiresIn: (this.configService.get<string>("JWT_ACCESS_EXPIRATION") ||
          "60m") as any,
      });

      return {
        accessToken,
        refreshToken,
        user: this.mapUserToResponse(session.user),
      };
    } catch (error) {
      if (error instanceof BaseException) {
        throw error;
      }

      throw new BaseException(
        "Invalid or expired refresh token",
        CODES.TOKEN_INVALID,
        401,
      );
    }
  }

  async logout(refreshToken: string): Promise<void> {
    // Delete session from database
    await this.prisma.session.deleteMany({
      where: { sessionToken: refreshToken },
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

  async generateTokens(user: User): Promise<TokenResponseDto> {
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
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    // Store session in database
    await this.prisma.session.create({
      data: {
        sessionToken: refreshToken,
        userId: user.id,
        expires,
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
