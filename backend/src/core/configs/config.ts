import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
    port: Number(process.env.PORT) || 8080,
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    },
    aiServiceApiKey: process.env.AI_SERVICE_API_KEY || 'default_ai_service_api_key',
    jwt: {
        jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || 15,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret',
        refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
        oneTimeTokenSecret: process.env.ONE_TIME_TOKEN_SECRET || 'default_one_time_token_secret',
        refreshTokenGracePeriodSeconds: Number(process.env.REFRESH_TOKEN_GRACE_PERIOD_SECONDS) || 3,
    },
    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
        },
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'noreply@mailbox.com',
    },
    app: {
        baseURL: process.env.BASE_URL || 'http://localhost:3001',
        frontendURL: process.env.FRONTEND_URL || 'http://localhost:3000',
        resetPasswordURL: process.env.RESET_PASSWORD_URL || 'http://localhost:3000/reset-password',
    },
}