import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class OAuthSignInDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  domain: string;
}
