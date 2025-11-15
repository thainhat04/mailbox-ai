# Backend Setup Guide

## Installation

1. **Install dependencies**
```bash
yarn install
```

2. **Setup environment variables**
```bash
cp .env.example .env
```

3. **Setup Husky**
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

## Development

```bash
yarn start:dev
```

## Database

```bash
# Generate Prisma client
yarn prisma:generate

# Create migration
yarn prisma:migrate

# Open Prisma Studio
yarn prisma:studio
```

## Code Quality

```bash
# Lint code
yarn lint

# Format code
yarn format
```

## Docker

```bash
# Build image
docker build -t mailbox-backend .

# Run container
docker run -p 3001:3001 mailbox-backend
```

## API Documentation

Once the server is running, access Swagger documentation at:
- URL: http://localhost:3001/api/docs


## Architecture

This project follows a 3-layer architecture:

1. **Controller Layer**: Handles HTTP requests and responses
2. **Service Layer**: Contains business logic
3. **Repository Layer**: Handles data access via Prisma



## Key Features

- ✅ Husky pre-commit hooks (lint + format staged files)
- ✅ Joi validation for environment variables
- ✅ Global exception filter with custom error codes
- ✅ JWT authentication with guards
- ✅ Swagger API documentation with authentication
- ✅ Prisma ORM with PostgreSQL
- ✅ Global validation pipe
- ✅ Custom decorators (@CurrentUser, @Public, @Roles)
- ✅ Base DTOs (Pagination, Response, Error)
- ✅ Repository pattern with interfaces

## Usage Examples

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

### Using @Roles Decorator
```typescript
@Get('admin')
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
async adminOnly() {
  return { message: 'Admin only route' };
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

## Notes

- By default, all routes are protected by JWT guard. Use `@Public()` decorator to make routes public.
- All exceptions are caught by the global exception filter and returned in a consistent format.
- Validation is automatically applied to all DTOs using class-validator.
- Swagger requires JWT token for protected routes - click "Authorize" button and enter your token.
