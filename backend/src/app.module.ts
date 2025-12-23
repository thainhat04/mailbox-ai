import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validationSchema } from "./common/configs/config";
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./common/redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EmailModule } from "./modules/email/email.module";
import { JwtAuthGuard } from "./common/guards";

@Module({
  imports: [
    // Config module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      envFilePath: ".env",
    }),

    // JWT module
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any,
      },
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Database
    DatabaseModule,

    // Redis for pub/sub
    RedisModule,

    // Feature modules
    AuthModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
