# Authentication API Quick Reference

## Base URL
```
http://localhost:3001/auth
```

## Endpoints Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/oauth/signin` | No | Get Google OAuth URL |
| GET | `/google/callback` | No | OAuth callback handler |
| POST | `/signup` | No | Register new user |
| POST | `/signin` | No | Sign in with email/password |
| POST | `/verify-email` | No | Verify email with code |
| POST | `/send-verify-code` | No | Send verification code |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password` | No | Reset password with token |
| POST | `/refresh-token` | No | Refresh access token |
| GET | `/me` | Yes | Get current user info |
| POST | `/change-password` | Yes | Change password |
| POST | `/logout` | Yes | Logout current session |
| POST | `/logout-all` | Yes | Logout all devices |

## Request Examples

### Sign Up
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "givenName": "John",
    "familyName": "Doe"
  }'
```

### Sign In
```bash
curl -X POST http://localhost:3001/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get User Info (Protected)
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST http://localhost:3001/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

## Token Usage

### Access Token
- Short-lived (15 minutes)
- Used for API authentication
- Include in `Authorization` header as `Bearer {token}`

### Refresh Token
- Long-lived (7 days)
- Used to get new access tokens
- Should be stored securely
- Rotates on each refresh

## Database Migration Commands

```bash
# Create a new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (Database GUI)
npx prisma studio
```
