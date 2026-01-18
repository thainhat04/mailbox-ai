import * as Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production")
    .default("development"),
  PORT: Joi.number().default(3001),
  APP_NAME: Joi.string().required(),

  // Database
  DATABASE_URL: Joi.string().required(),
  DB_CONNECTION_LIMIT: Joi.number().default(20),
  DB_POOL_TIMEOUT: Joi.number().default(20),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default("60m"),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default("30d"),

  // Swagger
  SWAGGER_ENABLED: Joi.boolean().default(true),

  // CORS
  CORS_ORIGIN: Joi.string().default("http://localhost:3000"),

  // Google Provider
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string().required(),

  // Microsoft Provider
  MICROSOFT_CLIENT_ID: Joi.string().required(),
  MICROSOFT_CLIENT_SECRET: Joi.string().required(),
  MICROSOFT_CALLBACK_URL: Joi.string().required(),
});

export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  APP_NAME: string;
  DATABASE_URL: string;
  DB_CONNECTION_LIMIT: number;
  DB_POOL_TIMEOUT: number;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRATION: string;
  SWAGGER_ENABLED: boolean;
  CORS_ORIGIN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  MICROSOFT_CALLBACK_URL: string;
}
