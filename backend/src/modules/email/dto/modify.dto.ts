import { IsBoolean, IsOptional } from "class-validator";

export class ModifyEmailFlagsDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @IsOptional()
  @IsBoolean()
  delete?: boolean;
}
