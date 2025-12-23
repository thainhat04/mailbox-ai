# Semantic Search Setup Guide

## Overview

This guide walks you through setting up semantic search for emails using local vector embeddings (sentence-transformers).

**Architecture:**
- **Backend**: NestJS with PostgreSQL + pgvector
- **AI Service**: Python FastAPI with sentence-transformers (all-MiniLM-L6-v2)
- **Embeddings**: 384-dimensional vectors
- **Search**: Cosine similarity using pgvector

## Prerequisites

1. PostgreSQL database with pgvector extension support
2. Python AI service running (see ai-service directory)
3. Node.js and npm installed

## Step-by-Step Setup

### 1. Enable pgvector Extension

Run the setup script to enable pgvector and create vector indexes:

```bash
cd backend
npx ts-node src/scripts/setup-pgvector.ts
```

This will:
- Enable the `vector` extension in PostgreSQL
- Create an IVFFlat index for fast cosine similarity search
- Verify the index was created successfully

### 2. Start the AI Service

The AI service must be running to generate embeddings:

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify it's working:
```bash
curl -X POST http://localhost:8000/api/v1/search/vector/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test message"}'
```

### 3. Backfill Existing Emails

Generate embeddings for all existing emails without embeddings:

```bash
cd backend
npx ts-node src/scripts/backfill-embeddings.ts
```

**Options:**
- `--limit N`: Process only N emails (default: 1000)
- `--batch-size N`: Process N emails per batch (default: 20)

**Example:**
```bash
# Process 500 emails in batches of 10
npx ts-node src/scripts/backfill-embeddings.ts --limit 500 --batch-size 10
```

### 4. Start the Backend

The backend will now automatically generate embeddings for new emails during sync:

```bash
cd backend
npm run start:dev
```

### 5. Test Semantic Search

**API Endpoint:** `POST /api/v1/emails/semantic-search`

**Request:**
```json
{
  "query": "money",
  "page": 1,
  "limit": 10
}
```

**Expected Behavior:**
Searching for "money" should return emails containing related terms:
- invoice
- payment
- salary
- price
- budget
- financial

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/emails/semantic-search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "money",
    "page": 1,
    "limit": 10
  }'
```

## How It Works

### 1. Email Sync (Automatic)

When new emails are synced (`EmailSyncService`):
1. Emails are fetched from Gmail/Outlook
2. Emails are stored in database
3. **NEW**: Embeddings are generated automatically in batches
4. Embeddings are stored in `message_bodies.embedding` column

### 2. Embedding Generation

```typescript
// In EmailSyncService (automatic during sync)
await this.generateEmbeddingsForAccount(emailAccountId);
```

Process:
1. Find emails without embeddings (limit 100)
2. Split into batches of 20
3. Call AI service: `POST /api/v1/search/vector/embeddings/batch`
4. Store 384-dimensional vectors in database

### 3. Semantic Search

```typescript
// In EmailService
const embedding = await this.searchVectorService.createVectorEmbedding(query);
const results = await this.messageRepository.semanticSearchEmails(userId, query, embedding);
```

SQL Query (using pgvector):
```sql
SELECT em.*, (1 - (mb.embedding <=> $1::vector)) AS relevance_score
FROM email_messages em
INNER JOIN message_bodies mb ON mb."emailMessageId" = em.id
WHERE em."emailAccountId" = ANY($2::text[])
  AND mb.embedding IS NOT NULL
  AND (1 - (mb.embedding <=> $1::vector)) > 0.5
ORDER BY mb.embedding <=> $1::vector ASC
LIMIT 50
```

## Configuration

### Environment Variables

Add to `backend/.env`:
```env
AI_SERVICE_URL=http://localhost:8000
DATABASE_URL=postgresql://user:password@localhost:5432/mailbox
```

### Adjust Search Parameters

In [email-message.repository.ts](src/modules/email/repositories/email-message.repository.ts:896):

```typescript
const similarityThreshold = 0.5; // Adjust threshold (0.0 - 1.0)
```

- **Higher threshold (0.7-0.9)**: More precise, fewer results
- **Lower threshold (0.3-0.5)**: More results, less precise

## Performance

### Embedding Generation
- **Single email**: ~100-200ms
- **Batch (20 emails)**: ~50-80ms per email
- **Model**: sentence-transformers/all-MiniLM-L6-v2 (local, no API cost)

### Search Performance
- **With index**: <100ms for most queries
- **Without index**: 1-5 seconds (not recommended)
- **Storage**: ~1.5KB per email (384 floats × 4 bytes)

## Monitoring

### Check Embedding Status

```sql
-- Count emails with embeddings
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;

-- Count emails without embeddings
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NULL;

-- View index status
SELECT * FROM pg_indexes WHERE tablename = 'message_bodies';
```

### Backend Logs

Look for embedding-related logs:
```
[EMBEDDINGS] Generating embeddings for account: ...
[EMBEDDINGS] Found X messages without embeddings
[EMBEDDINGS] ✓ Batch 1/5 completed (20 embeddings stored)
[EMBEDDINGS] ✅ Completed embedding generation
```

## Troubleshooting

### 1. AI Service Connection Error

**Error:** `AI service connection failed: ECONNREFUSED`

**Solution:**
- Ensure AI service is running: `cd ai-service && uvicorn app.main:app --reload`
- Check `AI_SERVICE_URL` in `.env`

### 2. pgvector Extension Not Found

**Error:** `type "vector" does not exist`

**Solution:**
```bash
# Install pgvector (PostgreSQL)
# On macOS with Homebrew:
brew install pgvector

# Run setup script
npx ts-node src/scripts/setup-pgvector.ts
```

### 3. No Search Results

**Possible causes:**
- Embeddings not generated yet → Run backfill script
- AI service not running → Start AI service
- Similarity threshold too high → Lower threshold in repository

**Debug:**
```sql
-- Check if embeddings exist
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;

-- Check vector dimensions
SELECT pg_typeof(embedding) FROM message_bodies WHERE embedding IS NOT NULL LIMIT 1;
```

### 4. Slow Search Performance

**Solution:** Ensure index is created:
```sql
CREATE INDEX IF NOT EXISTS idx_message_bodies_embedding_cosine
ON message_bodies
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Test Queries

Try these semantic queries:

| Query | Expected Results |
|-------|-----------------|
| "money" | invoice, payment, salary, price, budget |
| "urgent meeting" | deadline, important, ASAP, time-sensitive |
| "vacation" | holiday, time off, PTO, leave |
| "project status" | update, progress, milestone, report |
| "customer feedback" | review, complaint, suggestion, testimonial |

## Architecture Changes

### What Was Removed
- ❌ Redis dependency
- ❌ Pub/Sub architecture
- ❌ Separate vector worker process
- ❌ `RedisService`, `RedisModule`
- ❌ `vector-worker.ts`, `vector-batch-worker.ts`

### What Was Added
- ✅ Direct embedding generation in `EmailSyncService`
- ✅ Batch processing (20 emails at a time)
- ✅ Setup and backfill scripts
- ✅ Automatic embedding on email sync

### Benefits
- Simpler architecture (no Redis)
- Fewer moving parts
- Easier to debug
- Lower infrastructure costs
- Embeddings still generated efficiently in batches

## Next Steps

1. ✅ Run setup script: `npx ts-node src/scripts/setup-pgvector.ts`
2. ✅ Start AI service
3. ✅ Run backfill script: `npx ts-node src/scripts/backfill-embeddings.ts`
4. ✅ Test semantic search via API
5. 🎯 Monitor logs and adjust threshold if needed

## Support

For issues or questions, check:
- Backend logs for embedding generation
- AI service logs for API calls
- Database for embedding storage
- Network connectivity between backend and AI service
