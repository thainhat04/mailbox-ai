# Authentication System Documentation

## Overview

This is a comprehensive OAuth2 and JWT-based authentication system built with NestJS, Prisma, and PostgreSQL. The system supports both Google OAuth and basic email/password authentication with advanced security features.

## Features

### Authentication Methods
- ✅ Google OAuth 2.0
- ✅ Email/Password (Basic Auth)
- ✅ Email verification with 6-digit codes
- ✅ Password reset with secure tokens
- ✅ JWT access tokens and refresh tokens

### Security Features
- ✅ Refresh token rotation with token families
- ✅ Token reuse detection (security breach prevention)
- ✅ Grace period for race conditions
- ✅ Secure password hashing with bcrypt
- ✅ Rate limiting for verification codes
- ✅ One-time tokens for password reset
- ✅ Role-based access control (RBAC)

## Database Schema

The system uses three main models:

### User Model
- Supports both OAuth and basic auth
- Stores user profile information
- Tracks email verification status
- Supports multiple roles (USER, ADMIN, MODERATOR)
- Soft delete capability

### UserToken Model
- Manages refresh tokens
- Implements token families for rotation
- Tracks token usage and expiration
- Supports token revocation

### VerifyCode Model
- Handles email verification codes
- Manages password reset tokens
- Auto-expiration support
- Status tracking (PENDING, USED, EXPIRED)

## API Endpoints

### Public Endpoints

#### 1. **OAuth Sign In**
```http
POST /auth/oauth/signin
Content-Type: application/json

{
  "domain": "http://localhost:3000"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  },
  "message": "OAuth URL generated successfully"
}
```

#### 2. **Google OAuth Callback**
```http
GET /auth/google/callback?code={code}&state={state}
```
**Redirects to:** `{domain}?token={accessToken}&refresh_token={refreshToken}`

#### 3. **Sign Up**
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "givenName": "John",
  "familyName": "Doe",
  "phone": "+1234567890"
}
```

#### 4. **Sign In**
```http
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Sign in successful"
}
```

#### 5. **Verify Email**
```http
POST /auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

#### 6. **Send Verification Code**
```http
POST /auth/send-verify-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 7. **Forgot Password**
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 8. **Reset Password**
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "secure-reset-token",
  "newPassword": "newpassword123"
}
```

#### 9. **Refresh Token**
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints (Require Authentication)

#### 10. **Get Current User**
```http
GET /auth/me
Authorization: Bearer {accessToken}
```

#### 11. **Change Password**
```http
POST /auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "oldPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

#### 12. **Logout**
```http
POST /auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 13. **Logout from All Devices**
```http
POST /auth/logout-all
Authorization: Bearer {accessToken}
```

## Environment Variables

Create a `.env` file in the backend root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mailbox

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key
REFRESH_TOKEN_EXPIRES_IN=7d
ONE_TIME_TOKEN_SECRET=your-super-secret-one-time-token-key
REFRESH_TOKEN_GRACE_PERIOD_SECONDS=3

# OAuth Configuration - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@mailbox.com

# Application URLs
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
RESET_PASSWORD_URL=http://localhost:3000/reset-password

# AI Service
AI_SERVICE_API_KEY=your-ai-service-api-key
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
```bash
# Create PostgreSQL database
createdb mailbox

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

### 3. Configure Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 4. Configure SMTP (Optional)

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the app password in `SMTP_PASS`

### 5. Run the Application
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Usage Examples

### Frontend Integration

#### React Example
```typescript
// Sign In
const signIn = async (email: string, password: string) => {
  const response = await fetch('http://localhost:3001/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);

  return data;
};

// Make authenticated requests
const getProfile = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3001/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
};

// Refresh token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:3001/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  // Update tokens
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);

  return data;
};
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Keep JWT secrets secure and rotate them regularly**
3. **Use strong passwords (enforce minimum length)**
4. **Enable rate limiting on authentication endpoints**
5. **Monitor for suspicious activity (token reuse detection is built-in)**
6. **Use environment variables for sensitive data**
7. **Implement CSRF protection for web applications**
8. **Regularly update dependencies**

## Refresh Token Rotation

This system implements **Refresh Token Rotation** for enhanced security:

### How it works:
1. When a user signs in, they receive an access token and a refresh token
2. Each refresh token belongs to a "token family"
3. When refreshing, the old token is revoked and a new one is issued
4. All tokens in the same family are tracked
5. If a revoked token is reused, the entire family is invalidated

### Grace Period:
- A 3-second grace period handles race conditions
- Multiple simultaneous refresh requests won't trigger security breach

### Token Reuse Detection:
- If a revoked token (outside grace period) is used, it indicates a security breach
- All tokens in that family are immediately revoked
- The user must sign in again

## Role-Based Access Control (RBAC)

### Available Roles:
- `USER`: Regular user
- `ADMIN`: Administrator with full access
- `MODERATOR`: Moderation capabilities

### Usage Example:
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('ADMIN')
  getUsers() {
    // Only accessible by ADMINs
  }

  @Get('dashboard')
  @Roles('ADMIN', 'MODERATOR')
  getDashboard() {
    // Accessible by both ADMIN and MODERATOR
  }
}
```

## Troubleshooting

### Common Issues:

**1. Database connection failed**
- Check if PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Ensure database exists

**2. Google OAuth not working**
- Verify Google OAuth credentials
- Check redirect URI matches exactly
- Ensure Google+ API is enabled

**3. Email not sending**
- Verify SMTP credentials
- Check if less secure apps are enabled (Gmail)
- Use app passwords for Gmail

**4. Token expired errors**
- Access tokens expire in 15 minutes by default
- Use refresh token to get new access token
- Implement automatic token refresh in frontend

## License

This project is part of the Mailbox application.

## Support

For issues or questions, please open an issue on the project repository.
