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
import { JwtAuthGuard } from "../../common/guards";
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
  ) {}

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
    @Res() res: FastifyReply,
  ): Promise<void> {
    const data = await this.authService.register(registerDto);

    // Set cookies
    this.setAuthCookies(res, data.accessToken, data.refreshToken);

    res
      .status(201)
      .send(ResponseDto.success(data, "User registered successfully"));
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
    @Res() res: FastifyReply,
  ): Promise<void> {
    const data = await this.authService.login(loginDto);

    // Set cookies
    this.setAuthCookies(res, data.accessToken, data.refreshToken);

    res.status(200).send(ResponseDto.success(data, "Login successful"));
  }

  @Public()
  @Get("refresh")
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({
    status: 200,
    description: "Access token successfully refreshed",
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid or expired refresh token" })
  async refreshToken(@Res() res: FastifyReply): Promise<void> {
    // Try to get refresh token from cookie if not in body
    const refreshToken = res.request.cookies?.refresh_token as
      | string
      | undefined;

    if (!refreshToken) {
      res
        .status(400)
        .send(
          ResponseDto.error(
            "Refresh token is required",
            "REFRESH_TOKEN_MISSING",
          ),
        );
      return;
    }

    const data = await this.authService.refreshToken(refreshToken);

    // Set new cookies
    this.setAuthCookies(res, data.accessToken, data.refreshToken);

    res
      .status(200)
      .send(ResponseDto.success(data, "Token refreshed successfully"));
  }

  @Public()
  @Get("logout")
  @ApiOperation({ summary: "Logout user by invalidating refresh token" })
  @ApiResponse({ status: 200, description: "User successfully logged out" })
  async logout(@Res() res: FastifyReply): Promise<void> {
    // Try to get refresh token from cookie if not in body
    const refreshToken = res.request.cookies?.refresh_token as
      | string
      | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear cookies
    this.clearAuthCookies(res);

    res.status(200).send(ResponseDto.success(null, "Logout successful"));
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

  /**
   * Set authentication cookies
   */
  private setAuthCookies(
    res: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction = process.env.NODE_ENV === "production";
    const secureFlag = isProduction ? "Secure; " : "";
    const sameSite = "SameSite=Lax";

    // Access token cookie (60 minutes)
    const accessTokenMaxAge = 60 * 60; // 60 minutes
    res.header(
      "Set-Cookie",
      `access_token=${accessToken}; HttpOnly; ${secureFlag}Path=/; ${sameSite}; Max-Age=${accessTokenMaxAge}`,
    );

    // Refresh token cookie (30 days)
    const refreshTokenMaxAge = 60 * 60 * 24 * 30; // 30 days
    res.header(
      "Set-Cookie",
      `refresh_token=${refreshToken}; HttpOnly; ${secureFlag}Path=/; ${sameSite}; Max-Age=${refreshTokenMaxAge}`,
    );
  }

  /**
   * Clear authentication cookies
   */
  private clearAuthCookies(res: FastifyReply): void {
    res.header(
      "Set-Cookie",
      "access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
    );
    res.header(
      "Set-Cookie",
      "refresh_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
    );
  }
}
