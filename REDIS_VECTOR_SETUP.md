# Redis Pub/Sub + Gemini Embedding Setup Guide

## Architecture Overview

```
┌─────────────┐      ┌─────────┐      ┌──────────────┐      ┌─────────────┐
│ Email Sync  │─────>│  Redis  │─────>│ Vector Worker│─────>│ AI Service  │
│  Service    │      │ Pub/Sub │      │   (Consumer) │      │   (Gemini)  │
└─────────────┘      └─────────┘      └──────────────┘      └─────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  PostgreSQL  │
                                       │   (pgvector) │
                                       └──────────────┘
```

## Changes Made

### 1. AI Service - Switched to Gemini Embedding API

**File:** `ai-service/app/services/search_vector_service.py`

- **Old:** SentenceTransformers (local model)
- **New:** Google Gemini `embedding-001` model
- **Dimensions:** 768 (Gemini standard)
- **Task Type:** `retrieval_document` (optimized for vector DB storage)

### 2. Backend - Redis Pub/Sub Infrastructure

**New Files:**
- `backend/src/common/redis/redis.service.ts` - Redis publisher/subscriber service
- `backend/src/common/redis/redis.module.ts` - Global Redis module
- `backend/src/workers/vector-worker.ts` - Standalone worker process

**Modified Files:**
- `backend/src/app.module.ts` - Added RedisModule
- `backend/src/modules/email/services/email-sync.service.ts` - Publishes to Redis instead of direct processing
- `backend/package.json` - Added worker scripts

### 3. Database - Updated Vector Dimensions

- Changed from 384 to 768 dimensions (Gemini embedding-001)
- Migration file updated: `backend/prisma/migrations/20251223125023_add_vector_embeddings/migration.sql`

## Setup Instructions

### 1. Install Dependencies

**AI Service:**
```bash
cd ai-service
uv pip install google-generativeai
```

**Backend:**
```bash
cd backend
npm install ioredis
```

### 2. Setup Redis

**Option A: Docker (Recommended)**
```bash
docker run -d \
  --name mailbox-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option B: Local Installation**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis

# Windows
# Download from https://redis.io/download
```

### 3. Environment Variables

**Backend `.env`:**
```env
# Add Redis URL
REDIS_URL=redis://localhost:6379

# Keep existing vars
DATABASE_URL=...
AI_SERVICE_URL=http://localhost:8000
GOOGLE_API_KEY=your_gemini_api_key
```

**AI Service `.env`:**
```env
GOOGLE_API_KEY=your_gemini_api_key
```

### 4. Apply Database Migration

```bash
cd backend

# Apply migration
psql "your-database-url" -f prisma/migrations/20251223125023_add_vector_embeddings/migration.sql

# Regenerate Prisma client
npx prisma generate
```

### 5. Start Services

**Terminal 1 - AI Service:**
```bash
cd ai-service
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Backend API:**
```bash
cd backend
npm run start:dev
```

**Terminal 3 - Vector Worker:**
```bash
cd backend
npm run start:vector-worker
```

## How It Works

### Email Sync Flow

1. **Email Sync Cron** (every 30 seconds)
   - Syncs new emails from Gmail/Outlook
   - Stores email metadata in PostgreSQL

2. **Publish to Redis**
   - After sync, finds emails without embeddings (max 50)
   - Publishes messages to Redis channel: `email:vector:sync`
   - Each message contains: `emailMessageId`, `subject`, `bodyText`, `timestamp`

3. **Vector Worker Consumes**
   - Listens to Redis `email:vector:sync` channel
   - Processes each message independently
   - Calls AI Service to generate embedding via Gemini API

4. **Store Embedding**
   - Worker stores 768-dimensional vector in PostgreSQL
   - Updates `message_bodies.embedding` column

5. **Search**
   - User queries trigger semantic search
   - Query converted to embedding via Gemini
   - pgvector performs cosine similarity search

### Message Format

```typescript
interface VectorSyncMessage {
  emailMessageId: string;  // UUID of email message
  subject: string;         // Email subject
  bodyText: string;        // Email body (plain text)
  timestamp: Date;         // When published
}
```

## Testing

### 1. Test Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

### 2. Monitor Redis Messages

```bash
redis-cli
> SUBSCRIBE email:vector:sync
# Will show messages being published
```

### 3. Test Embedding Generation

```bash
curl -X POST http://localhost:8000/api/v1/search/vector/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test email about invoices"}'

# Should return 768-dimensional array
```

### 4. Check Worker Logs

Watch the Vector Worker terminal for logs like:
```
[VectorWorker] Processing vector sync for email: abc-123-def
[VectorWorker] Successfully processed email abc-123-def in 1234ms (768 dimensions)
```

### 5. Verify Embeddings in Database

```sql
-- Check how many emails have embeddings
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;

-- Check embedding dimensions
SELECT
  id,
  emailMessageId,
  array_length(embedding::float[], 1) as dimensions
FROM message_bodies
WHERE embedding IS NOT NULL
LIMIT 5;
```

### 6. Test Semantic Search

```bash
curl -X POST http://localhost:3000/api/v1/emails/semantic-search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "payment invoices", "limit": 10}'

# Should return semantically related emails
```

## Monitoring & Debugging

### Check Redis Queue Length

```bash
redis-cli
> PUBSUB NUMSUB email:vector:sync
# Shows number of subscribers (should be 1 when worker is running)
```

### Worker Process Management

**Development:**
```bash
# Start worker
npm run start:vector-worker

# Stop worker
Ctrl+C
```

**Production (with PM2):**
```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start npm --name "vector-worker" -- run start:vector-worker:prod

# Monitor
pm2 logs vector-worker
pm2 monit

# Restart
pm2 restart vector-worker

# Stop
pm2 stop vector-worker
```

### Common Issues

**1. Worker not receiving messages**
- Check Redis is running: `redis-cli ping`
- Check worker logs for connection errors
- Verify REDIS_URL in .env

**2. Embedding generation fails**
- Check AI service is running on port 8000
- Verify GOOGLE_API_KEY is set correctly
- Check Gemini API quota limits

**3. "vector must have at least 1 dimension"**
- AI service returned empty embedding
- Check AI service logs
- Verify Gemini API key is valid

**4. Worker crashes**
- Check memory usage (Gemini responses can be large)
- Implement retry logic (TODO: add dead letter queue)
- Check database connection pool settings

## Performance Considerations

### Scaling

**Horizontal Scaling:**
- Run multiple Vector Worker instances
- Redis pub/sub will distribute messages
- Each worker processes independently

**Vertical Scaling:**
- Increase worker memory for batch processing
- Adjust batch size in `publishVectorSyncMessages` (currently 50)

### Cost Optimization

**Gemini API:**
- Free tier: 15 requests/minute
- Paid tier: Higher limits
- Consider caching common queries

**Redis:**
- Use Redis Cloud for production
- Enable persistence for message durability
- Monitor memory usage

### Rate Limiting

Current implementation doesn't handle rate limits. Consider:

```typescript
// Add to vector-worker.ts
const RateLimiter = require('limiter').RateLimiter;
const limiter = new RateLimiter({ tokensPerInterval: 15, interval: 'minute' });

// Before API call
await limiter.removeTokens(1);
```

## Production Deployment

### Docker Compose Example

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  backend:
    build: ./backend
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  vector-worker:
    build: ./backend
    command: npm run start:vector-worker:prod
    environment:
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=http://ai-service:8000
    depends_on:
      - redis
      - ai-service
    deploy:
      replicas: 2  # Run 2 workers for redundancy

  ai-service:
    build: ./ai-service
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}

volumes:
  redis-data:
```

## Next Steps

1. ✅ Install Redis
2. ✅ Install dependencies (ioredis, google-generativeai)
3. ✅ Update environment variables
4. ✅ Apply database migration
5. ✅ Start all services (AI, Backend, Worker)
6. ✅ Monitor logs and test semantic search

## Advanced Features (Future)

- [ ] Dead Letter Queue for failed embeddings
- [ ] Retry logic with exponential backoff
- [ ] Batch processing optimization
- [ ] Rate limiting for Gemini API
- [ ] Metrics and monitoring (Prometheus/Grafana)
- [ ] A/B testing different embedding models
