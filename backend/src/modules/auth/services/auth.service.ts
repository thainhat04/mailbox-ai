import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { JwtService } from './jwt.service';
import { MailService } from './mail.service';
import { GoogleOAuthService } from './google-oauth.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../../core/configs/config';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  // OAuth Sign In
  async getOAuthUrl(domain: string): Promise<string> {
    const state = this.googleOAuthService.generateState(domain);
    return this.googleOAuthService.getAuthUrl(state);
  }

  // OAuth Callback Handler
  async authenticateWithCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Exchange code for tokens
      const tokens = await this.googleOAuthService.exchangeCode(code);

      // Verify ID token and get user info
      const googleUser = await this.googleOAuthService.verifyIdToken(tokens.id_token);

      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!user) {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            sub: googleUser.sub,
            email: googleUser.email,
            emailVerified: googleUser.emailVerified,
            fullName: googleUser.name,
            givenName: googleUser.givenName,
            familyName: googleUser.familyName,
            picture: googleUser.picture,
            provider: 'GOOGLE',
            identities: { google: googleUser },
            roles: ['USER'],
            locale: googleUser.locale,
          },
        });

        this.logger.log(`Created new Google user: ${user.email}`);
      } else {
        // Update last login
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        this.logger.log(`Google user logged in: ${user.email}`);
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.jwtService.generateTokens(user);

      // Hash and store refresh token
      const hashedRefreshToken = this.jwtService.hashToken(refreshToken, config.jwt.refreshTokenSecret);
      const familyId = uuidv4();
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 7);

      await this.prisma.userToken.create({
        data: {
          userId: user.id,
          token: hashedRefreshToken,
          familyId,
          expiredAt,
          lastUsedAt: new Date(),
        },
      });

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('OAuth authentication failed', error.stack);
      throw new BadRequestException('OAuth authentication failed');
    }
  }

  // Basic Auth Sign Up
  async signUp(signUpDto: SignUpDto): Promise<{ success: boolean; message: string }> {
    const { email, password, givenName, familyName, phone } = signUpDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        givenName,
        familyName,
        phone,
        provider: 'BASIC',
        roles: ['USER'],
        emailVerified: false,
      },
    });

    // Generate verification code
    const code = this.jwtService.generateRandomCode(6);
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 10);

    await this.prisma.verifyCode.create({
      data: {
        value: code,
        email,
        type: 'VERIFY_EMAIL',
        expiredAt,
        status: 'PENDING',
      },
    });

    // Send verification email
    try {
      await this.mailService.sendVerifyCodeEmail('Email Verification Code', email, code);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error.stack);
    }

    this.logger.log(`User signed up: ${email}`);

    return {
      success: true,
      message: 'User registered successfully. Please check your email for verification code.',
    };
  }

  // Basic Auth Sign In
  async signIn(signInDto: SignInDto): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password } = signInDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Check password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.jwtService.generateTokens(user);

    // Hash and store refresh token
    const hashedRefreshToken = this.jwtService.hashToken(refreshToken, config.jwt.refreshTokenSecret);
    const familyId = uuidv4();
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 7);

    await this.prisma.userToken.create({
      data: {
        userId: user.id,
        token: hashedRefreshToken,
        familyId,
        expiredAt,
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(`User signed in: ${email}`);

    return { accessToken, refreshToken };
  }

  // Verify Email
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const verifyCode = await this.prisma.verifyCode.findFirst({
      where: {
        email,
        value: code,
        type: 'VERIFY_EMAIL',
        status: 'PENDING',
        expiredAt: { gte: new Date() },
      },
    });

    if (!verifyCode) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Mark code as used
    await this.prisma.verifyCode.update({
      where: { id: verifyCode.id },
      data: { status: 'USED' },
    });

    // Update user email verified
    await this.prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });

    this.logger.log(`Email verified: ${email}`);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  // Send Verify Code
  async sendVerifyCode(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Check spam (max 3 requests in 30 minutes)
    const recentCodes = await this.prisma.verifyCode.count({
      where: {
        email,
        type: 'VERIFY_EMAIL',
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000),
        },
      },
    });

    if (recentCodes >= 3) {
      throw new BadRequestException('Too many verification requests. Please try again later.');
    }

    // Generate verification code
    const code = this.jwtService.generateRandomCode(6);
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 10);

    await this.prisma.verifyCode.create({
      data: {
        value: code,
        email,
        type: 'VERIFY_EMAIL',
        expiredAt,
        status: 'PENDING',
      },
    });

    // Send verification email
    await this.mailService.sendVerifyCodeEmail('Email Verification Code', email, code);

    this.logger.log(`Verification code sent to: ${email}`);

    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  }

  // Forgot Password
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check spam (max 3 requests in 30 minutes)
    const recentCodes = await this.prisma.verifyCode.count({
      where: {
        email,
        type: 'RESET_PASSWORD',
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000),
        },
      },
    });

    if (recentCodes >= 3) {
      throw new BadRequestException('Too many reset password requests. Please try again later.');
    }

    // Invalidate previous reset codes
    await this.prisma.verifyCode.updateMany({
      where: {
        email,
        type: 'RESET_PASSWORD',
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Generate secure token
    const token = this.jwtService.generateSecureToken(32);
    const hashedToken = this.jwtService.hashToken(token, config.jwt.oneTimeTokenSecret);

    // Create verify code
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 30);

    await this.prisma.verifyCode.create({
      data: {
        value: hashedToken,
        email,
        type: 'RESET_PASSWORD',
        expiredAt,
        status: 'PENDING',
      },
    });

    // Create reset URL
    const resetUrl = `${config.app.resetPasswordURL}?token=${token}`;

    // Send reset password email
    await this.mailService.sendResetPasswordEmail('Reset Your Password', email, resetUrl);

    this.logger.log(`Password reset requested for: ${email}`);

    return {
      success: true,
      message: 'Password reset link sent to your email',
    };
  }

  // Reset Password
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const hashedToken = this.jwtService.hashToken(token, config.jwt.oneTimeTokenSecret);

    const verifyCode = await this.prisma.verifyCode.findFirst({
      where: {
        value: hashedToken,
        type: 'RESET_PASSWORD',
        status: 'PENDING',
        expiredAt: { gte: new Date() },
      },
    });

    if (!verifyCode) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { email: verifyCode.email },
      data: { password: hashedPassword },
    });

    // Mark code as used
    await this.prisma.verifyCode.update({
      where: { id: verifyCode.id },
      data: { status: 'USED' },
    });

    // Revoke all user tokens
    await this.prisma.userToken.updateMany({
      where: {
        user: { email: verifyCode.email },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Password reset for: ${verifyCode.email}`);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  // Change Password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException('Cannot change password for OAuth users');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid old password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all user tokens except current session
    await this.prisma.userToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Password changed for user: ${user.email}`);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  // Refresh Token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const hashedToken = this.jwtService.hashToken(refreshToken, config.jwt.refreshTokenSecret);
    const gracePeriod = config.jwt.refreshTokenGracePeriodSeconds * 1000;

    // Find token
    const userToken = await this.prisma.userToken.findFirst({
      where: {
        token: hashedToken,
        revokedAt: null,
        expiredAt: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!userToken) {
      // Check if token was recently revoked (race condition)
      const revokedToken = await this.prisma.userToken.findFirst({
        where: {
          token: hashedToken,
          revokedAt: { gte: new Date(Date.now() - gracePeriod) },
        },
        include: { user: true },
      });

      if (revokedToken) {
        // Get latest token in family
        const latestToken = await this.prisma.userToken.findFirst({
          where: {
            familyId: revokedToken.familyId,
            revokedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        });

        if (latestToken) {
          // Generate new tokens
          const tokens = await this.jwtService.generateTokens(latestToken.user);

          // Hash and store new refresh token
          const newHashedToken = this.jwtService.hashToken(tokens.refreshToken, config.jwt.refreshTokenSecret);
          const expiredAt = new Date();
          expiredAt.setDate(expiredAt.getDate() + 7);

          await this.prisma.userToken.create({
            data: {
              userId: latestToken.userId,
              token: newHashedToken,
              familyId: revokedToken.familyId,
              parentId: latestToken.id,
              expiredAt,
              lastUsedAt: new Date(),
            },
          });

          return tokens;
        }
      }

      // Check if it's a reused token (security breach)
      const oldToken = await this.prisma.userToken.findFirst({
        where: { token: hashedToken, revokedAt: { not: null } },
      });

      if (oldToken) {
        // Revoke entire token family
        await this.prisma.userToken.updateMany({
          where: {
            familyId: oldToken.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        this.logger.warn(`Token reuse detected - revoked family: ${oldToken.familyId}`);
      }

      throw new UnauthorizedException('Invalid refresh token');
    }

    // Update last used
    await this.prisma.userToken.update({
      where: { id: userToken.id },
      data: { lastUsedAt: new Date() },
    });

    // Generate new tokens
    const tokens = await this.jwtService.generateTokens(userToken.user);

    // Hash and store new refresh token
    const newHashedToken = this.jwtService.hashToken(tokens.refreshToken, config.jwt.refreshTokenSecret);
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 7);

    await this.prisma.userToken.create({
      data: {
        userId: userToken.userId,
        token: newHashedToken,
        familyId: userToken.familyId,
        parentId: userToken.id,
        expiredAt,
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(`Token refreshed for user: ${userToken.user.email}`);

    return tokens;
  }

  // Logout
  async logout(refreshToken: string): Promise<{ success: boolean; message: string }> {
    const hashedToken = this.jwtService.hashToken(refreshToken, config.jwt.refreshTokenSecret);

    const userToken = await this.prisma.userToken.findFirst({
      where: { token: hashedToken, revokedAt: null },
    });

    if (userToken) {
      await this.prisma.userToken.update({
        where: { id: userToken.id },
        data: { revokedAt: new Date() },
      });

      this.logger.log(`User logged out - token revoked: ${userToken.id}`);
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  // Logout from all devices
  async logoutFromAllDevices(userId: string): Promise<{ success: boolean; message: string }> {
    await this.prisma.userToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`User logged out from all devices: ${userId}`);

    return {
      success: true,
      message: 'Logged out from all devices successfully',
    };
  }

  // Get User Info
  async getUserInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        fullName: true,
        givenName: true,
        familyName: true,
        picture: true,
        provider: true,
        roles: true,
        accountType: true,
        isActive: true,
        locale: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
