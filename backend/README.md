# Mailbox AI - Backend

A robust NestJS-based backend API for Mailbox AI, an intelligent email management system with OAuth2 authentication, IMAP integration, and email processing capabilities.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - OAuth2/OIDC integration (Google, Microsoft)
  - Password-based authentication with bcrypt
  - Role-based access control (Admin, User)

- **Email Management**
  - IMAP integration for email retrieval
  - SMTP support for sending emails
  - Email parsing with attachments
  - Mailbox/folder management
  - Email search functionality
  - Mark as read/unread
  - Star/unstar emails
  - Reply and forward emails
  - Email modification capabilities

- **Database**
  - PostgreSQL with Prisma ORM
  - User management
  - OAuth2 token storage
  - IMAP configuration management
  - Refresh token management with soft delete

- **API Features**
  - RESTful API design
  - Swagger/OpenAPI documentation
  - Global exception handling
  - Request validation with class-validator
  - CORS support
  - Fastify adapter for high performance

## 📋 Prerequisites

- Node.js 20+ 
- PostgreSQL database
- Yarn or npm package manager
- Google OAuth2 credentials (for Google sign-in)
- Microsoft OAuth2 credentials (for Microsoft sign-in)

## 🛠️ Installation

1. **Install dependencies**
```bash
yarn install
```

2. **Setup environment variables**
Create a `.env` file in the root directory:
```env
# Application
NODE_ENV=development
PORT=3001
APP_NAME=Mailbox AI

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mailbox_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRATION=60m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRATION=30d

# Swagger
SWAGGER_ENABLED=true

# CORS
CORS_ORIGIN=http://localhost:4300

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/callback/google

# Microsoft OAuth2
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:3001/api/v1/auth/callback/microsoft
```

3. **Setup Husky (Git hooks)**
```bash
yarn prepare
```

4. **Generate Prisma Client**
```bash
yarn prisma:generate
```

5. **Run database migrations**
```bash
yarn prisma:migrate
```

## 🚦 Running the Application

### Development
```bash
yarn start:dev
```

The server will start on `http://localhost:3001`

### Production
```bash
yarn build
yarn start:prod
```

### Debug Mode
```bash
yarn start:debug
```

## 📚 API Documentation

Once the server is running, access Swagger documentation at:
- **URL**: `http://localhost:3001/api/docs`

The Swagger UI provides:
- Interactive API testing
- Request/response schemas
- Authentication support (JWT Bearer token)
- All available endpoints with descriptions

## 🏗️ Architecture

This project follows a **3-layer architecture**:

1. **Controller Layer** (`src/modules/*/controllers`)
   - Handles HTTP requests and responses
   - Request validation
   - Response formatting

2. **Service Layer** (`src/modules/*/services`)
   - Contains business logic
   - Data transformation
   - External service integration (IMAP, OAuth2)

3. **Repository Layer** (Prisma)
   - Database access
   - Data persistence
   - Query optimization

## 📁 Project Structure

```
backend/
├── src/
│   ├── common/              # Shared utilities and configurations
│   │   ├── configs/         # Configuration files (Swagger, validation)
│   │   ├── constants/       # Application constants
│   │   ├── decorators/      # Custom decorators (@CurrentUser, @Public, @Roles)
│   │   ├── dtos/            # Base DTOs (Response, Pagination)
│   │   ├── enums/           # Enumerations
│   │   ├── exceptions/      # Custom exceptions
│   │   ├── filters/         # Exception filters
│   │   ├── guards/          # Authentication/Authorization guards
│   │   ├── interceptors/    # Request/Response interceptors
│   │   ├── interfaces/      # TypeScript interfaces
│   │   ├── strategies/      # Passport strategies (JWT)
│   │   └── utils/           # Utility functions
│   ├── database/            # Database module (Prisma)
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication module
│   │   │   ├── dto/         # Auth DTOs
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── email/           # Email management module
│   │   │   ├── dto/         # Email DTOs
│   │   │   ├── entities/    # Email entities
│   │   │   ├── services/    # IMAP, OAuth2 services
│   │   │   ├── email.controller.ts
│   │   │   ├── email.service.ts
│   │   │   └── email.module.ts
│   │   ├── oidc/            # OAuth2/OIDC module
│   │   │   ├── providers/   # Google, Microsoft providers
│   │   │   ├── oidc.service.ts
│   │   │   └── oidc.strategy.ts
│   │   └── mail/            # Mail utilities
│   ├── app.module.ts        # Root module
│   ├── app.controller.ts    # Root controller
│   └── main.ts              # Application entry point
├── prisma/
│   ├── schema.prisma        # Prisma schema
│   └── migrations/          # Database migrations
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔌 API Endpoints

### Authentication (`/api/v1/auth`)

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with email and password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user information
- `GET /auth/signin/:provider` - OAuth2 sign-in (google/microsoft)
- `GET /auth/callback/:provider` - OAuth2 callback handler

### Email Management (`/api/v1`)

#### Mailboxes
- `GET /mailboxes` - Get all mailboxes with email counts
- `GET /mailboxes/:id` - Get mailbox by ID
- `GET /mailboxes/:id/emails` - Get emails in a mailbox (paginated)

#### Emails
- `GET /emails` - Get emails with pagination (default: INBOX)
- `GET /emails/:id` - Get email by ID
- `GET /emails/search` - Search emails
- `POST /emails/send` - Send an email
- `POST /emails/:id/reply` - Reply to an email
- `POST /emails/:id/modify` - Modify an email
- `PATCH /emails/:id/read` - Mark email as read
- `PATCH /emails/:id/unread` - Mark email as unread
- `PATCH /emails/:id/star` - Toggle star status
- `DELETE /emails/:id` - Delete email

#### IMAP
- `GET /imap/test` - Test IMAP connection
- `GET /imap/mailboxes` - List all available IMAP mailboxes

#### Attachments
- `GET /attachments/:attachmentId` - Stream email attachment

## 🗄️ Database Schema

### Models

- **User**: User accounts with authentication
- **RefreshToken**: Refresh token management
- **OAuth2Token**: OAuth2 token storage (Google, Microsoft)
- **ImapConfig**: IMAP/SMTP configuration per user

### Enums

- **UserRole**: ADMIN, USER
- **MailProvider**: GOOGLE, MICROSOFT

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password storage
- **OAuth2**: Secure OAuth2 flow for third-party providers
- **CORS**: Configurable CORS policies
- **Input Validation**: Automatic validation with class-validator
- **Global Exception Filter**: Consistent error handling
- **Soft Delete**: Data retention with soft delete pattern

## 🧪 Testing

```bash
# Unit tests
yarn test

# Watch mode
yarn test:watch

# Coverage
yarn test:cov

# E2E tests
yarn test:e2e
```

## 📝 Code Quality

```bash
# Lint code
yarn lint

# Format code
yarn format
```

## 🐳 Docker

### Build Image
```bash
docker build -t mailbox-backend .
```

### Run Container
```bash
docker run -p 3001:3001 --env-file .env mailbox-backend
```

### Docker Compose
```bash
docker-compose up -d
```

## 🔧 Development Tools

### Prisma Studio
Visual database browser:
```bash
yarn prisma:studio
```

### Database Migrations
```bash
# Create new migration
yarn prisma:migrate

# Generate Prisma Client
yarn prisma:generate
```

## 💡 Usage Examples

### Using @CurrentUser Decorator
```typescript
@Get('profile')
@ApiBearerAuth('JWT-auth')
async getProfile(@CurrentUser() user: JwtPayload) {
  return user;
}
```

### Using @Public Decorator
```typescript
@Post('login')
@Public()
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

### Using Response DTO
```typescript
@Get()
async findAll() {
  const users = await this.userService.findAll();
  return ResponseDto.success(users, 'Users retrieved successfully');
}
```

### Using Pagination
```typescript
@Get()
async findAll(@Query() pagination: PaginationDto) {
  const { data, total } = await this.userService.findWithPagination(
    pagination.page,
    pagination.limit,
  );

  const meta = PaginationUtil.calculateMeta(
    pagination.page,
    pagination.limit,
    total,
  );

  return ResponseDto.success(data, 'Users retrieved', meta);
}
```

## 📦 Key Dependencies

- **@nestjs/core**: NestJS framework
- **@nestjs/platform-fastify**: Fastify adapter
- **@prisma/client**: Prisma ORM
- **@nestjs/jwt**: JWT authentication
- **passport**: Authentication middleware
- **bcrypt**: Password hashing
- **imap**: IMAP client library
- **nodemailer**: Email sending
- **mailparser**: Email parsing
- **xoauth2**: OAuth2 for IMAP/SMTP

## ⚠️ Important Notes

- By default, all routes are protected by JWT guard. Use `@Public()` decorator to make routes public.
- All exceptions are caught by the global exception filter and returned in a consistent format.
- Validation is automatically applied to all DTOs using class-validator.
- Swagger requires JWT token for protected routes - click "Authorize" button and enter your token.
- Environment variables are validated on startup using Joi schema.
- Husky pre-commit hooks automatically lint and format staged files.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass
4. Submit a pull request

## 📄 License

This project is private and proprietary.
