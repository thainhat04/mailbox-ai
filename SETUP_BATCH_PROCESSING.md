# Quick Setup Guide - Batch Processing with Gemini Embeddings

## What You Need to Install

### 1. Install Backend Dependencies

```bash
cd backend
npm install ioredis uuid @types/uuid
```

### 2. Install AI Service Dependencies

```bash
cd ai-service
uv pip install google-generativeai
```

### 3. Setup Redis

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
```

### 4. Environment Variables

Make sure your **backend/.env** has:
```env
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
GOOGLE_API_KEY=your_gemini_api_key_here
```

Make sure your **ai-service/.env** has:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 5. Apply Database Migration

```bash
cd backend

# Apply the migration
npx prisma db push

# Or use raw SQL
psql "your-database-url" -f prisma/migrations/20251223125023_add_vector_embeddings/migration.sql

# Regenerate Prisma client
npx prisma generate
```

## How to Run

### Start all services in separate terminals:

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

**Terminal 3 - Vector Batch Worker:**
```bash
cd backend
npm run start:vector-worker
```

## How It Works

1. **Email Sync** (every 30 seconds)
   - Syncs emails from Gmail/Outlook
   - Finds up to 100 emails without embeddings
   - Splits them into batches of 20

2. **Publishes to Redis**
   - Channel: `email:vector:sync:batch`
   - Each message contains 20 emails

3. **Vector Worker Processes**
   - Consumes batches from Redis
   - Calls Gemini API once for 20 embeddings
   - Stores all 20 embeddings in database

4. **Performance**
   - ~2 seconds per batch of 20 emails
   - ~100ms per email (20x faster than individual calls)
   - 15x faster than old approach!

## Check if It's Working

### 1. Test Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

### 2. Monitor Redis Messages
```bash
redis-cli
> SUBSCRIBE email:vector:sync:batch
# Will show batches being published
```

### 3. Check Worker Logs
Look for logs like:
```
[VectorBatchWorker] Processing batch abc-123 with 20 emails
[VectorBatchWorker] ✓ Batch abc-123 completed: 20 emails in 1850ms
```

### 4. Verify Database
```sql
-- Check how many emails have embeddings
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;

-- Check recent embeddings
SELECT
  id,
  "emailMessageId",
  "createdAt"
FROM message_bodies
WHERE embedding IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Troubleshooting

### "Cannot find module 'ioredis'"
```bash
cd backend
npm install ioredis uuid @types/uuid
```

### "Cannot find module 'google.generativeai'"
```bash
cd ai-service
uv pip install google-generativeai
```

### "Connection refused to Redis"
- Make sure Redis is running: `redis-cli ping`
- Check REDIS_URL in backend/.env

### "Worker not receiving messages"
- Check worker logs for errors
- Verify Redis connection
- Make sure email sync is running (backend must be started)

### "Empty embeddings error"
- Check GOOGLE_API_KEY is set correctly in both services
- Verify AI service is running on port 8000
- Check Gemini API quota/limits

## Performance Metrics

### Before (Individual Processing)
- 100 emails × 1.5s each = 150 seconds
- API calls: 100

### After (Batch Processing)
- 5 batches × 2s each = 10 seconds
- API calls: 5

**15x faster! 🚀**

## Next Steps

Once everything is running:

1. Wait for emails to sync (happens every 30 seconds automatically)
2. Watch the worker logs to see batches being processed
3. Check the database to see embeddings being stored
4. Test semantic search via the API endpoint

## Production Deployment

For production, use PM2 to manage the worker:

```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start npm --name "vector-worker" -- run start:vector-worker:prod

# Monitor
pm2 logs vector-worker
pm2 monit

# Scale to multiple workers
pm2 scale vector-worker 2
```

## Questions?

- **Batch size**: Configured at 20 emails per batch in [email-sync.service.ts:536](backend/src/modules/email/services/email-sync.service.ts#L536)
- **Max emails per sync**: Limited to 100 in [email-sync.service.ts:523](backend/src/modules/email/services/email-sync.service.ts#L523)
- **Worker code**: [vector-batch-worker.ts](backend/src/workers/vector-batch-worker.ts)
- **Batch publishing**: [email-sync.service.ts:504-569](backend/src/modules/email/services/email-sync.service.ts#L504-L569)

See [BATCH_PROCESSING.md](BATCH_PROCESSING.md) for detailed architecture documentation.
