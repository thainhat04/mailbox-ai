import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto, RefreshTokenDto, TokenResponseDto } from "./dto";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseDto } from "../../common/dtos/response.dto";
import { JwtAuthGuard } from "src/common/guards";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    @Body() registerDto: RegisterDto
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
    @Body() loginDto: LoginDto
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
    @Body() refreshTokenDto: RefreshTokenDto
  ): Promise<ResponseDto<TokenResponseDto>> {
    const data = await this.authService.refreshToken(
      refreshTokenDto.refreshToken
    );
    return ResponseDto.success(data, "Token refreshed successfully");
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "Logout user by invalidating refresh token" })
  @ApiResponse({ status: 200, description: "User successfully logged out" })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto
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
}
