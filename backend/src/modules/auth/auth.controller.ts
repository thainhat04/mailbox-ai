import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Res,
  All,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { OIDCService } from "../oidc/oidc.service";
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto,
} from "./dto";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseDto } from "../../common/dtos/response.dto";
import { JwtAuthGuard } from "src/common/guards";
import {
  OAuthProvider,
  OAuthSignInDto,
  OAuthSignInResponseDto,
  OAuthCallbackDto,
} from "./dto/providers";
import type { FastifyReply } from "fastify";
import { GenerateUtil } from "../../common/utils";
import { OIDCProviderConfig } from "../oidc/dto/oidc.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oidcService: OIDCService,
  ) { }

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User successfully registered",
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 400, description: "Email already exists" })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ResponseDto<TokenResponseDto>> {
    const data = await this.authService.register(registerDto);
    return ResponseDto.success(data, "User registered successfully");
  }

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({
    status: 200,
    description: "User successfully logged in",
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid credentials" })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<ResponseDto<TokenResponseDto>> {
    const data = await this.authService.login(loginDto);
    return ResponseDto.success(data, "Login successful");
  }

  @Public()
  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({
    status: 200,
    description: "Access token successfully refreshed",
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid or expired refresh token" })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<ResponseDto<TokenResponseDto>> {
    const data = await this.authService.refreshToken(
      refreshTokenDto.refreshToken,
    );
    return ResponseDto.success(data, "Token refreshed successfully");
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "Logout user by invalidating refresh token" })
  @ApiResponse({ status: 200, description: "User successfully logged out" })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<ResponseDto<null>> {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return ResponseDto.success(null, "Logout successful");
  }

  @Get("me")
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get current user information" })
  @ApiResponse({ status: 200, description: "User information retrieved" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getCurrentUser(@CurrentUser("sub") userId: string) {
    const data = await this.authService.getCurrentUser(userId);
    return ResponseDto.success(data, "User information retrieved");
  }

  @Public()
  @Get("signin/:provider")
  @ApiOperation({ summary: "Sign in with provider" })
  @ApiResponse({ status: 200, description: "Provider sign in successful" })
  @ApiResponse({ status: 400, description: "Provider sign in failed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async oauthSignIn(
    @Query() query: OAuthSignInDto,
    @Param("provider") provider: string,
  ): Promise<ResponseDto<OAuthSignInResponseDto>> {
    const response = await this.oidcService.oauthSignIn(
      provider as OAuthProvider,
      query.domain,
    );
    return ResponseDto.success(response, "Provider sign in successful");
  }

  @Public()
  @Get("callback/:provider")
  async oauthCallback(
    @Query() query: OAuthCallbackDto,
    @Param("provider") provider: OAuthProvider,
    @Res() res: FastifyReply,
  ) {
    let domain: string | undefined;

    try {
      const decoded = await GenerateUtil.decodeState(query.state);
      domain = decoded.domain;

      if (!decoded.randomPart || !domain) {
        return await this.redirectWithError(
          res,
          domain || "http://localhost:3000",
          "Invalid state",
        );
      }

      const tokens = await this.oidcService.authenticationWithCode(
        provider,
        query.code,
      );
      const { access_token, id_token, refresh_token } = tokens;

      // Set cookies before redirect
      res.header(
        "Set-Cookie",
        `access_token=${access_token}; HttpOnly; Secure; Path=/; SameSite=Lax`,
      );
      res.header(
        "Set-Cookie",
        `id_token=${id_token}; HttpOnly; Secure; Path=/; SameSite=Lax`,
      );
      res.header(
        "Set-Cookie",
        `refresh_token=${refresh_token}; HttpOnly; Secure; Path=/; SameSite=Lax`,
      );

      // Redirect with tokens in URL
      const redirectUrl = `${domain}?access_token=${encodeURIComponent(access_token)}&id_token=${encodeURIComponent(id_token)}&refresh_token=${encodeURIComponent(refresh_token)}`;

      return res.status(302).redirect(redirectUrl);
    } catch (error) {
      console.error("OAuth callback error:", error);
      return await this.redirectWithError(
        res,
        domain || "http://localhost:3000",
        error instanceof Error ? error.message : "Authentication failed",
      );
    }
  }

  private async redirectWithError(
    res: FastifyReply,
    domain: string,
    error: string,
  ) {
    const redirectUrl = `${domain}?error=${encodeURIComponent(error)}`;
    return res.status(302).redirect(redirectUrl);
  }
}
