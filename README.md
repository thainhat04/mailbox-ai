# Mailbox AI

Smart email management system with AI-powered summarization and Kanban board workflow.

## Deployed URLs

- **Frontend**: [Your deployed frontend URL]
- **Backend**: [Your deployed backend URL]

## Prerequisites

- **Backend**: Node.js 18+, Yarn
- **AI Service**: Python 3.13+, UV
- **Database**: PostgreSQL
- **API Keys**: Google OAuth credentials, Google Gemini API key

## Local Setup

### 1. Clone Repository
```bash
git clone [repository-url]
cd mailbox-ai
```

### 2. Backend Setup
```bash
cd backend
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma migrate dev
npx prisma generate

# Start development server
yarn start:dev
# Server runs at http://localhost:8080
```

### 3. AI Service Setup
```bash
cd ai-service
uv sync

# Configure environment
cp .env.example .env
# Edit .env with your Gemini API key

# Start service
python main.py
# Service runs at http://localhost:8000
```

### 4. Frontend Setup
```bash
cd frontend
npm install  # or yarn install

# Configure environment
cp .env.example .env
# Edit .env with backend URL

# Start development server
npm run dev
# Frontend runs at http://localhost:4300
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **Gmail API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Set **Authorized redirect URIs**:
   ```
   # Local development
   http://localhost:8080/api/v1/auth/google/callback

   # Production
   https://[your-backend-domain]/api/v1/auth/google/callback
   ```
7. Copy **Client ID** and **Client Secret** to backend `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback
   ```

## Core Features (Project Requirements)

### I. Kanban Interface Visualization
- **Board Layout**: Organized email workflow with distinct columns (INBOX → TODO → PROCESSING → DONE)
- **Email Cards**: Each card displays real Gmail data:
  - Sender name & email
  - Email subject
  - AI-generated summary (not full body)
  - Timestamp
- **Real Data**: All data fetched from Gmail API via backend

- **API**: `GET /api/v1/kanban/board`

### II. Workflow Management (Drag-and-Drop)
- **Drag & Drop**: Move email cards between columns
- **Backend Sync**: Status changes persist to database immediately
- **Real-time Update**: UI updates without page refresh
- **Status Tracking**: Each email's `kanbanStatus` and `statusChangedAt` tracked

- **API**: `PATCH /api/v1/:id/kanban/status`

### III. Snooze/Deferral Mechanism
- **Snooze Options**: 1 hour, 3 hours, 1 day, 3 days, 1 week, or custom time
- **Hide from View**: Snoozed emails move to FROZEN column
- **Auto-Wake**: Background job (runs every 5 minutes) automatically returns emails to INBOX when snooze expires
- **Manual Unsnooze**: Users can manually unfreeze emails anytime

- **APIs**:
  - `POST /api/v1/:id/freeze` - Snooze email
  - `POST /api/v1/:id/unfreeze` - Manual unsnooze
  - `GET /api/v1/frozen` - View all snoozed emails

### IV. Content Summarization Integration
- **AI-Powered**: Uses Google Gemini API for real email summarization (not hardcoded)
- **Smart Caching**: Summaries cached to avoid redundant API calls
- **Key Points Extraction**: Returns structured summary with actionable items
- **Dynamic Generation**: Each email processed individually by LLM

- **API**: `GET /api/v1/:id/summary`

  **Example Response**:
  ```json
  {
    "summary": "Client đề xuất meeting vào thứ 2 lúc 2PM...",
    "model_used": "gemini-2.5-flash"
  }
  ```

## Authentication

All API requests require JWT token:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## Architecture
- **Backend**: NestJS with Fastify, Prisma ORM, PostgreSQL
- **AI Service**: FastAPI, Google Gemini AI
- **Frontend**: Next.js (React)
