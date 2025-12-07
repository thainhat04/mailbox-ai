# Mailbox AI

A full-stack intelligent email management system built with Next.js and NestJS, featuring OAuth2 authentication, IMAP integration, and a modern email interface.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Contributing](#contributing)

## 🎯 Overview

Mailbox AI is a comprehensive email management platform that provides:

- **Secure Authentication**: Email/password and OAuth2 (Google, Microsoft) authentication
- **Email Management**: Full IMAP/SMTP integration for email retrieval and sending
- **Modern UI**: Responsive three-column layout with dark theme
- **Real-time Sync**: Automatic email synchronization with IMAP servers
- **AI-Powered**: Intelligent email processing and management

## ✨ Features

### Authentication
- ✅ Email/password registration and login
- ✅ OAuth2 social login (Google, Microsoft)
- ✅ JWT-based authentication with refresh tokens
- ✅ Protected routes and session management
- ✅ Automatic token refresh

### Email Management
- ✅ Multi-folder inbox (Inbox, Sent, Drafts, Trash, etc.)
- ✅ Email list with pagination and filtering
- ✅ Full email detail view with HTML rendering
- ✅ Compose, reply, and forward emails
- ✅ Mark as read/unread
- ✅ Star/unstar emails
- ✅ Delete and archive emails
- ✅ Email search functionality
- ✅ Attachment handling and downloads
- ✅ IMAP/SMTP integration

### User Interface
- ✅ Modern dark-themed design
- ✅ Responsive layout (mobile and desktop)
- ✅ Three-column layout on desktop
- ✅ Mobile-friendly navigation
- ✅ Real-time updates
- ✅ Optimistic UI updates
- ✅ Internationalization (English, Vietnamese)

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.0.3 (App Router)
- **UI Library**: React 19.2.0
- **State Management**: Redux Toolkit, RTK Query, Jotai
- **Styling**: Tailwind CSS 4
- **Internationalization**: i18next
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Backend
- **Framework**: NestJS 11 (Fastify adapter)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT, Passport.js, OAuth2/OIDC
- **Email**: IMAP, SMTP (Nodemailer, Mailparser)
- **Validation**: class-validator, Joi
- **Documentation**: Swagger/OpenAPI

### Infrastructure
- **Database**: PostgreSQL (Neon.tech)
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Containerization**: Docker

## 🏗️ Architecture

The application follows a **monorepo structure** with separate frontend and backend services:

```
mailbox/
├── frontend/          # Next.js frontend application
├── backend/           # NestJS backend API
├── ai-service/        # AI service (optional)
└── docker-compose.yml # Docker orchestration
```

### System Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │ ──────> │  Frontend   │ ──────> │   Backend   │
│  (Next.js)  │ <────── │  (Next.js)  │ <────── │  (NestJS)   │
└─────────────┘         └─────────────┘         └─────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────┐
                                                │  PostgreSQL │
                                                │  Database   │
                                                └─────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────┐
                                                │  IMAP/SMTP  │
                                                │   Servers   │
                                                └─────────────┘
```

### Backend Architecture (3-Layer)

1. **Controller Layer**: HTTP request/response handling
2. **Service Layer**: Business logic and external integrations
3. **Repository Layer**: Database access via Prisma

### Frontend Architecture

- **App Router**: Next.js 16 App Router for routing
- **Component-Based**: Modular React components
- **State Management**: Redux for global state, RTK Query for API
- **Service Layer**: Centralized API services

## 📁 Project Structure

```
mailbox/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── modules/            # Feature modules (auth, email, oidc)
│   │   ├── common/             # Shared utilities
│   │   ├── database/           # Prisma configuration
│   │   └── main.ts             # Application entry point
│   ├── prisma/                 # Database schema and migrations
│   ├── Dockerfile
│   └── README.md               # Backend documentation
│
├── frontend/                   # Next.js frontend
│   ├── app/                    # App Router pages
│   │   ├── auth/              # Authentication pages
│   │   └── inbox/             # Inbox application
│   ├── components/             # React components
│   ├── services/              # API services
│   ├── store/                 # Redux store
│   ├── Dockerfile
│   └── README.md              # Frontend documentation
│
├── ai-service/                 # AI service (optional)
├── docker-compose.yml          # Docker orchestration
└── README.md                   # This file
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ and npm/yarn
- **PostgreSQL** database (local or cloud)
- **Git** for version control
- **Docker** (optional, for containerized deployment)

### OAuth2 Credentials

You'll need OAuth2 credentials for:
- **Google OAuth2**: [Google Cloud Console](https://console.cloud.google.com)
- **Microsoft OAuth2**: [Azure Portal](https://portal.azure.com)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/mailbox-ai.git
cd mailbox-ai
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
yarn install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Setup Husky (Git hooks)
yarn prepare

# Generate Prisma Client
yarn prisma:generate

# Run database migrations
yarn prisma:migrate

# Start development server
yarn start:dev
```

Backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install  # or yarn install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration (see Environment Variables section)

# Start development server
npm run dev  # or yarn dev
```

Frontend will run on `http://localhost:4300`

### 4. Access the Application

- **Frontend**: http://localhost:4300
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs

## 🔐 Environment Variables

### Backend (.env)

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

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:4300
```

## 💻 Development

### Backend Development

```bash
cd backend

# Development mode with hot reload
yarn start:dev

# Debug mode
yarn start:debug

# Production build
yarn build
yarn start:prod

# Run tests
yarn test
yarn test:watch
yarn test:cov

# Code quality
yarn lint
yarn format

# Database tools
yarn prisma:studio    # Visual database browser
yarn prisma:migrate   # Run migrations
yarn prisma:generate  # Generate Prisma Client
```

### Frontend Development

```bash
cd frontend

# Development mode
npm run dev

# Production build
npm run build
npm run start

# Linting
npm run lint
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 API Documentation

Once the backend is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:3001/api/docs
- **Features**:
  - Interactive API testing
  - Request/response schemas
  - Authentication support (JWT Bearer token)
  - All available endpoints with descriptions

### Main API Endpoints

#### Authentication (`/api/v1/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user
- `GET /auth/signin/:provider` - OAuth2 sign-in
- `GET /auth/callback/:provider` - OAuth2 callback

#### Email Management (`/api/v1`)
- `GET /mailboxes` - List all mailboxes
- `GET /mailboxes/:id/emails` - Get emails in mailbox
- `GET /emails` - Get emails (paginated)
- `GET /emails/:id` - Get email details
- `POST /emails/send` - Send email
- `POST /emails/:id/reply` - Reply to email
- `PATCH /emails/:id/read` - Mark as read
- `PATCH /emails/:id/star` - Toggle star
- `DELETE /emails/:id` - Delete email

For detailed API documentation, see [Backend README](./backend/README.md#api-endpoints)

## 🔒 Security

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Token Rotation**: Refresh tokens rotated on each use
- **Token Expiration**: Access tokens (60m), Refresh tokens (30d)
- **OAuth2**: Secure OAuth2/OIDC flow

### API Security
- **CORS**: Configurable CORS policies
- **Input Validation**: Automatic validation with class-validator
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Protection**: React's built-in sanitization
- **HTTPS**: Enforced in production

### Token Storage
- **Access Token**: Stored in localStorage (short-lived)
- **Refresh Token**: Stored in localStorage (long-lived)
- **Token Rotation**: New refresh token on each refresh
- **Token Revocation**: Logout invalidates tokens

## 🚢 Deployment

### Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure environment variables
4. Set build command: `yarn build`
5. Set start command: `yarn start:prod`

### Database (Neon.tech)

1. Create a new PostgreSQL database on Neon.tech
2. Copy the connection string
3. Add to backend environment variables as `DATABASE_URL`

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individually
cd backend && docker build -t mailbox-backend .
cd frontend && docker build -t mailbox-frontend .
```

## 📖 Documentation

For detailed documentation on each component:

- **[Backend README](./backend/README.md)**: Complete backend documentation
  - API endpoints
  - Database schema
  - Development guide
  - Architecture details

- **[Frontend README](./frontend/README.md)**: Complete frontend documentation
  - Component structure
  - State management
  - API integration
  - Development tips

## 🧪 Testing

### Backend Tests
```bash
cd backend
yarn test              # Unit tests
yarn test:watch        # Watch mode
yarn test:cov          # Coverage
yarn test:e2e          # E2E tests
```

### Frontend Tests
```bash
cd frontend
npm test               # Run tests
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow existing code patterns
- Run linters before committing
- Write tests for new features
- Update documentation as needed

## 📝 License

This project is private and proprietary.

## 🔗 Links

- **Live Demo**: [Frontend](https://mailbox-ai-pv3e.vercel.app/)
- **Repository**: [GitHub](https://github.com/your-username/mailbox-ai)
- **API Documentation**: http://localhost:3001/api/docs (when running locally)

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the detailed READMEs in `backend/` and `frontend/` directories
- Review API documentation at `/api/docs`

---

**Built with ❤️ using Next.js and NestJS**
