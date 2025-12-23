# Mailbox AI

Smart email management system with AI-powered summarization and Kanban board workflow.

## Deployed URLs

- **Frontend**: [Frontend URL](https://mailbox-ai-pv3e.vercel.app)
- **Backend**: [Backend URL](https://mailbox-ai-tawny.vercel.app)

## Prerequisites

- **Backend**: Node.js 18+, Yarn
- **AI Service**: Python 3.13+, UV (package manager)
- **Database**: PostgreSQL 12+ with `pgvector` and `pg_trgm` extensions
- **API Keys**:
  - Google OAuth credentials (for Gmail login)
  - Google Gemini API key (for AI summarization)

## Local Setup

### 1. Clone Repository
```bash
git clone https://github.com/thainhat04/mailbox-ai
cd mailbox-ai
```

### 2. Database Setup (PostgreSQL with Extensions)

Your PostgreSQL database needs two extensions (`pg_trgm` for fuzzy search, `vector` for semantic search). These will be created automatically when you run Prisma migrations in step 3:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Backend Setup
```bash
cd backend
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Setup database and extensions
npx prisma migrate dev
npx prisma generate

# Start development server
yarn start:dev
# Server runs at http://localhost:8080
```

### 4. AI Service Setup
```bash
cd ai-service
uv sync

# Configure environment
cp .env.example .env
# Edit .env with your configuration (see below)

# Start service
uv run python main.py
# Service runs at http://localhost:8000
```

**Required Environment Variables:**
```env
# Gemini API for Summarization (Required)
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Local Embedding Configuration (Required for Semantic Search)
USE_LOCAL_EMBEDDINGS=true
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Optional Summarization Settings
MAX_SUMMARY_LENGTH=200
TEMPERATURE=0.3
```

**First-time Setup:**
The AI service will automatically download the embedding model (`all-MiniLM-L6-v2`) on first run. This is a ~80MB download and only happens once.

**Get Gemini API Key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to your `.env` file

### 5. Frontend Setup
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

### V. Fuzzy Search Engine
- **Typo Tolerance**: Handles misspellings using PostgreSQL pg_trgm extension (e.g., "marketting" → "marketing")
- **Partial Matches**: Supports incomplete queries (e.g., "Nguy" → finds "Nguyễn Văn A")
- **Multi-field Search**: Searches across subject, sender name/email, and snippet
- **Relevance Ranking**: Results scored 0-1 and sorted by best match first (uses similarity + word_similarity)
- **Pagination**: Supports page and limit parameters (default: 50 per page)
- **Search UI**: Integrated search bar with loading/empty/error states

- **API**: `GET /api/v1/emails/fuzzy-search?q=query&page=1&limit=50`

  **Example Response**:
  ```json
  {
    "emails": [
      {
        "id": "email-id",
        "subject": "Marketing Campaign",
        "from": "sender@example.com",
        "fromName": "Sender Name",
        "snippet": "Email preview...",
        "relevanceScore": 0.85
      }
    ],
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
  ```

### VI. Filtering & Sorting
- **Sorting Options**:
  - `date_desc`: Newest first (default)
  - `date_asc`: Oldest first
  - `sender`: Sort by sender name alphabetically
  - Applies within each Kanban column independently
- **Filter Controls**:
  - `unreadOnly`: Show only unread emails
  - `hasAttachmentsOnly`: Show only emails with attachments
  - `fromEmail`: Filter by specific sender email
  - `includeDoneAll`: Include all DONE emails (default: last 7 days only)
- **Real-time Update**: Changes apply instantly without page reload
- **Persistent View**: Filters remain active until manually cleared

- **API**: `GET /api/v1/kanban/board?sortBy=date_desc&unreadOnly=true&hasAttachmentsOnly=true&fromEmail=sender@example.com`

### VII. Semantic Search (Vector Embeddings)
- **Conceptual Relevance**: Searches by meaning, not exact text (e.g., "money" finds "invoice", "salary", "payment")
- **Local AI Model**: Uses `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions, no API costs)
- **Vector Storage**: PostgreSQL pgvector extension with cosine similarity (IVFFlat index)
- **Automatic Processing**: New emails get embeddings on sync
- **Integration**: Works alongside fuzzy search

- **API**: `GET /api/v1/emails-search/semantic-search?query=text&page=1&limit=50`

### VIII. Search Auto-Suggestion
- **Type-ahead Dropdown**: Shows suggestions as user types (300ms debounce)
- **Dual Sources**: Sender suggestions (name + email) and keyword suggestions (from subjects)
- **Smart Filtering**: Excludes stop words, min 3 chars, ordered by frequency
- **Keyboard Navigation**: Arrow keys, Enter to select, Escape to close, Ctrl+K to focus

- **API**: `GET /api/v1/emails/suggestions?q=query&limit=5`

### IX. Dynamic Kanban Configuration
- **Custom Columns**: Create/rename/delete workflow columns (max 10)
- **Full Customization**: Name, color (16 presets), icon
- **Gmail Label Mapping**: Each column maps to Gmail label, auto-syncs on card move
- **System Protection**: INBOX and FROZEN columns cannot be deleted
- **Drag-to-Reorder**: Change column order in settings
- **Persistence**: Configuration saved to database

- **APIs**:
  - `GET /api/v1/kanban/columns` - Get all columns
  - `POST /api/v1/kanban/columns` - Create column
  - `PUT /api/v1/kanban/columns/:id` - Update column
  - `DELETE /api/v1/kanban/columns/:id` - Delete column (moves emails to INBOX)
  - `PATCH /api/v1/kanban/columns/reorder` - Reorder columns

## Running All Services Together

To run the complete application, you need all three services running simultaneously:

**Terminal 1 - Backend:**
```bash
cd backend
yarn start:dev
```

**Terminal 2 - AI Service:**
```bash
cd ai-service
uv run python main.py
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

**Service Dependencies:**
- Frontend → Backend (API calls)
- Backend → AI Service (summarization + embeddings)
- Backend → PostgreSQL (data + vector storage)
- Backend → Gmail API (email sync)

## Authentication

All API requests require JWT token:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## Architecture
- **Backend**: NestJS with Fastify, Prisma ORM, PostgreSQL (with pgvector + pg_trgm)
- **AI Service**: FastAPI, sentence-transformers (local), Google Gemini AI (cloud)
- **Frontend**: Next.js 16 (React 19), Redux Toolkit, RTK Query
