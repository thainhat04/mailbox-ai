import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "../../common/strategies";
import { OIDCService } from "../oidc/oidc.service";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [PassportModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OIDCService],
  exports: [AuthService, OIDCService],
})
export class AuthModule { }
