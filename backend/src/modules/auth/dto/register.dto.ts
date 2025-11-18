import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({
    description:
      "Password (min 8 characters, must contain uppercase, number, and special character)",
    example: "Password123!",
  })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    },
  )
  password: string;
}
