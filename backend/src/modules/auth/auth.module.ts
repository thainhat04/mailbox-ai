import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "../../common/strategies";
import { OIDCModule } from "../oidc/oidc.module";
import { OIDCService } from "../oidc/oidc.service";

@Module({
  imports: [PassportModule, OIDCModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OIDCService],
  exports: [AuthService, OIDCService],
})
export class AuthModule {}
