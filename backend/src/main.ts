import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { setupSwagger } from "./common/configs/swagger.config";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import fastifyCookie from "@fastify/cookie";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      maxParamLength: 1000,
    }),
  );

  // Register cookie plugin
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || "your-secret-key-change-in-production",
  });

  // Set global prefix
  app.setGlobalPrefix("api/v1");

  const configService = app.get(ConfigService);

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  const corsOrigin = configService.get<string>("CORS_ORIGIN");
  console.log("corsOrigin", corsOrigin);
  app.enableCors({
    origin: corsOrigin || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  });

  // Swagger setup
  const swaggerEnabled = configService.get<boolean>("SWAGGER_ENABLED");
  if (swaggerEnabled) {
    setupSwagger(app);
    logger.log("Swagger documentation available at /api/docs");
  }

  const port = configService.get<number>("PORT") || 3001;

  await app.listen(port, "127.0.0.1");

  logger.log(`Application is running on: http://127.0.0.1:${port}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs: http://127.0.0.1:${port}/api/docs`);
  }
}

bootstrap();
