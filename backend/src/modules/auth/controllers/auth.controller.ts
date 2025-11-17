import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { GoogleOAuthService } from '../services/google-oauth.service';
import type { SignUpDto } from '../dto/sign-up.dto';
import type { SignInDto } from '../dto/sign-in.dto';
import type { VerifyEmailDto } from '../dto/verify-email.dto';
import type { ForgotPasswordDto } from '../dto/forgot-password.dto';
import type { ResetPasswordDto } from '../dto/reset-password.dto';
import type { RefreshTokenDto } from '../dto/refresh-token.dto';
import type { ChangePasswordDto } from '../dto/change-password.dto';
import type { OAuthSignInDto } from '../dto/oauth-signin.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from 'src/core/decorators/current-user.decorator'
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) { }

  @Post('oauth/signin')
  @HttpCode(HttpStatus.OK)
  async oauthSignIn(@Body(ValidationPipe) dto: OAuthSignInDto) {
    const authUrl = await this.authService.getOAuthUrl(dto.domain);
    return {
      success: true,
      data: { authUrl },
      message: 'OAuth URL generated successfully',
    };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: FastifyReply,
  ) {
    try {
      if (!state) {
        return res.status(400).send({ error: 'State parameter is required' });
      }

      const { domain } = this.googleOAuthService.decodeState(state);

      if (!domain) {
        return res.status(400).send({ error: 'Invalid domain in state' });
      }

      if (error) {
        return res.redirect(`${domain}?error=${encodeURIComponent(error)}`);
      }

      if (!code) {
        return res.redirect(`${domain}?error=Code parameter is required`);
      }

      // Authenticate user
      const tokens = await this.authService.authenticateWithCode(code);

      // Redirect with tokens
      const redirectUrl = `${domain}?token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`;
      return res.redirect(redirectUrl);
    } catch (err) {
      const errorMessage = err.message || 'Authentication failed';
      return res.redirect(`${state.split('|')[1] || 'http://localhost:3000'}?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body(ValidationPipe) dto: SignUpDto) {
    const result = await this.authService.signUp(dto);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body(ValidationPipe) dto: SignInDto) {
    const tokens = await this.authService.signIn(dto);
    return {
      success: true,
      data: tokens,
      message: 'Sign in successful',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body(ValidationPipe) dto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(dto.email, dto.code);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('send-verify-code')
  @HttpCode(HttpStatus.OK)
  async sendVerifyCode(@Body('email') email: string) {
    const result = await this.authService.sendVerifyCode(email);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(ValidationPipe) dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body(ValidationPipe) dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.newPassword);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body(ValidationPipe) dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(dto.refreshToken);
    return {
      success: true,
      data: tokens,
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string) {
    const result = await this.authService.logout(refreshToken);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutFromAllDevices(@CurrentUser() user: any) {
    const result = await this.authService.logoutFromAllDevices(user.userId);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body(ValidationPipe) dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user.userId, dto.oldPassword, dto.newPassword);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    const userInfo = await this.authService.getUserInfo(user.userId);
    return {
      success: true,
      data: userInfo,
      message: 'User info retrieved successfully',
    };
  }
}
