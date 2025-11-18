# Mailbox AI - React Authentication (Email+Password + Google Sign-In) + Email Dashboard Mockup

A full-stack application demonstrating secure authentication (Email+Password + Google OAuth) with a responsive three-column email dashboard.

## Public Hosting URL

**Live Demo:** [PLACEHOLDER - Add deployment URL here]

**Demo Credentials:**
```
Email: demo@mailboxai.com
Password: Demo123!
```

## Setup and Run Instructions

### Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL
- Google OAuth credentials

### Installation & Running Locally

1. **Clone the repository**
   ```bash
   git clone [REPOSITORY_URL]
   cd mailbox-ai
   ```

2. **Backend Setup**
   ```bash
   cd backend
   yarn install

   # Setup environment variables
   cp .env.example .env
   # Edit .env with your configuration:
   # - DATABASE_URL=postgresql://user:password@localhost:5432/mailbox_ai
   # - JWT_SECRET=your_jwt_secret_key
   # - JWT_ACCESS_EXPIRATION=60m
   # - JWT_REFRESH_EXPIRATION=30d
   # - GOOGLE_CLIENT_ID=your_google_client_id
   # - GOOGLE_CLIENT_SECRET=your_google_client_secret
   # - GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/callback/google
   # - CORS_ORIGIN=http://localhost:3000

   # Run database migrations (also generates Prisma Client)
   npx prisma migrate dev

   # Start development server (runs on port 8080)
   yarn start:dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install  # or yarn install

   # Setup environment variables
   cp .env.example .env
   # Edit .env with:
   # - NEXT_PUBLIC_API_URL=http://localhost:8080
   # - NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

   # Start development server (runs on port 3000)
   npm run dev
   ```

4. **Access the application**
   - Open browser: `http://localhost:3000`
   - Backend API: `http://localhost:8080`

## Token Storage Choices and Security Considerations

### Token Storage Strategy

| Token Type | Storage Location | Justification |
|------------|-----------------|---------------|
| **Access Token** | In-memory (React State/Context) | - Short-lived (60 minutes)<br>- Not accessible via JavaScript after page refresh<br>- Immune to XSS attacks<br>- Lost on page reload → triggers automatic refresh<br>- Most secure for short-term credentials |
| **Refresh Token** | localStorage | - Long-lived (30 days)<br>- Persists across page refreshes<br>- Enables seamless user experience<br>- **Trade-off:** Vulnerable to XSS attacks |

### Why localStorage for Refresh Token?

**Advantages:**
- ✅ **User Experience:** Users remain logged in across browser sessions
- ✅ **No Page Refresh Login:** Automatic token refresh prevents re-authentication
- ✅ **Simplicity:** Works with any backend (cross-origin compatible)
- ✅ **Multi-tab Support:** Same token accessible across browser tabs

**Security Mitigations Implemented:**
- ✅ **Token Rotation:** New refresh token issued on every refresh request (soft-deleted in database)
- ✅ **Token Expiration:** Access token expires after 60 minutes, refresh token after 30 days
- ✅ **Refresh Token Revocation:** Logout invalidates token on server (soft delete in database)
- ✅ **Database Tracking:** All refresh tokens stored in database with expiration tracking
- ✅ **XSS Protection:** React's built-in sanitization
- ✅ **Input Validation:** All inputs validated with class-validator DTOs
- ✅ **HTTPS Only:** Tokens only transmitted over secure connections in production

**Alternative Considered: HttpOnly Cookies**

We considered storing refresh tokens in HttpOnly cookies, which would be more secure:

| Aspect | localStorage | HttpOnly Cookie |
|--------|-------------|-----------------|
| XSS Protection | ❌ Vulnerable | ✅ Immune |
| CSRF Protection | ✅ Immune | ❌ Requires CSRF tokens |
| Cross-Origin | ✅ Easy | ❌ Complex CORS setup |
| Implementation | ✅ Simple | ❌ Requires same-origin or proxy |

**Decision:** We chose localStorage for this project to prioritize development speed and cross-origin compatibility. For production systems with higher security requirements, **HttpOnly cookies with CSRF protection** would be the recommended approach.

### Token Refresh Flow

Our implementation handles token expiration automatically:

```
1. API Request → 401 Unauthorized
2. Axios Interceptor detects 401
3. Check if refresh token exists in localStorage
4. POST /auth/refresh with refreshToken
5. Success?
   → Store new accessToken in memory
   → Retry original request with new token
6. Failure?
   → Clear all tokens
   → Redirect to /login
```

**Concurrency Protection:**
- Multiple simultaneous 401 errors trigger only ONE refresh request
- Failed requests are queued and retried after successful refresh
- Prevents token refresh race conditions

### Security Best Practices Implemented

1. **JWT Configuration:**
   - Algorithm: HS256 (HMAC with SHA-256)
   - Access token: 60 minutes expiration
   - Refresh token: 30 days expiration
   - Tokens stored in database with soft-delete support

2. **API Security:**
   - CORS configured (default: `http://localhost:3000`, configurable via `CORS_ORIGIN` env)
   - SQL injection prevention (Prisma ORM with parameterized queries)
   - Input validation with class-validator DTOs
   - Password hashing with bcrypt (salt rounds: 10)

3. **Authentication Security:**
   - Secure password requirements (min 8 chars, uppercase, lowercase, number, special character)
   - Token rotation on every refresh (old token soft-deleted)
   - Refresh token revocation on logout
   - User active status check on login and token refresh
   - Automatic logout on token refresh failure

4. **OAuth 2.0 (Google):**
   - OpenID Connect (OIDC) implementation with passport-openidconnect
   - Scopes: `openid`, `email`, `profile`
   - Offline access support (`access_type=offline`)
   - Callback URL: `http://localhost:8080/api/v1/auth/callback/google`

## Third-Party Services Used

### Google OAuth 2.0

**Purpose:** Enables "Sign in with Google" functionality

**Setup Instructions:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen:
   - Application name: Mailbox AI
   - User support email
   - Authorized domains
6. Create OAuth Client ID (Web application):
   - **Authorized JavaScript origins:**
     - `http://localhost:8080` (backend port)
     - `http://localhost:3000` (frontend port)
   - **Authorized redirect URIs:**
     - `http://localhost:8080/api/v1/auth/callback/google`
7. Copy **Client ID** and **Client Secret**
8. Add to environment variables:
   ```
   # Backend (.env)
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/callback/google

   # Frontend (.env)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   ```

**Integration:**
- Frontend: Next.js 16 (OAuth flow handled by backend redirect)
- Backend: Passport.js with `passport-openidconnect` strategy
- Provider: Custom Google OIDC provider configuration
- Flow: Authorization Code Flow with PKCE

### Hosting Providers

**Frontend Hosting:**
- **Service:** [Vercel / Netlify / Firebase Hosting - PLACEHOLDER]

**Backend Hosting:**
- **Service:** [Railway / Heroku / Render - PLACEHOLDER]

**Database:**
- **Service:** Neon.tech PostgreSQL

---

## Demo

**Demo Video:** [PLACEHOLDER - Add link to video walkthrough showing:]
- Email/password login flow
- Google Sign-In flow
- Token refresh simulation (after token expiry)
- Logout functionality
- Three-column email dashboard navigation