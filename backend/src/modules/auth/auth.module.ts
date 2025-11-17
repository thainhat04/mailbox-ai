import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module';
import { config } from '../../core/configs/config';

// Controllers
import { AuthController } from './controllers/auth.controller';

// Services
import { AuthService } from './services/auth.service';
import { JwtService as CustomJwtService } from './services/jwt.service';
import { MailService } from './services/mail.service';
import { GoogleOAuthService } from './services/google-oauth.service';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({
      secret: config.jwt.jwtSecret,
      signOptions: {
        expiresIn: (typeof config.jwt.jwtExpiresIn === 'number'
          ? `${config.jwt.jwtExpiresIn}m`
          : config.jwt.jwtExpiresIn) as any
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    CustomJwtService,
    MailService,
    GoogleOAuthService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    CustomJwtService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule { }
