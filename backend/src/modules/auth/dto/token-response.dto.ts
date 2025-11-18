import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class UserResponseDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;

  @ApiProperty({ example: "user@example.com" })
  email: string;

  @ApiPropertyOptional({ example: "John Doe" })
  name: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class TokenResponseDto {
  @ApiProperty({
    description: "JWT access token (expires in 60 minutes)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "JWT refresh token (expires in 30 days)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
