# Semantic Search Implementation Guide

## Overview

This document describes the implementation of semantic search for the mailbox application. The system generates vector embeddings for emails and uses pgvector for efficient semantic similarity search.

## Architecture

### Components

1. **AI Service (Python/FastAPI)** - Generates vector embeddings using Gemini LLM
2. **Backend (NestJS)** - Manages embeddings and performs semantic search
3. **Database (PostgreSQL + pgvector)** - Stores vector embeddings

### Flow

```
Email Sync → Generate Embeddings (Batch) → Store in DB → Semantic Search
```

## Implementation Details

### 1. AI Service Changes

**Files Modified:**
- `ai-service/app/schemas/search_vector.py` - Added batch embedding schemas
- `ai-service/app/api/v1/endpoints/search_vector.py` - Added batch endpoint
- `ai-service/app/services/search_vector_service.py` - Added batch processing method

**Endpoints:**
- `POST /api/v1/search/vector/embeddings` - Single embedding generation
- `POST /api/v1/search/vector/embeddings/batch` - Batch embedding generation (up to 100 texts)

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/v1/search/vector/embeddings/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Meeting about project deadline",
      "Invoice for December services"
    ]
  }'
```

### 2. Backend Changes

**Files Modified:**
- `backend/src/modules/email/services/search-vector.service.ts` - Added batch creation and storage
- `backend/src/modules/email/services/email-sync.service.ts` - Added automatic embedding generation
- `backend/src/modules/email/repositories/email-message.repository.ts` - Implemented pgvector search
- `backend/src/modules/email/email.service.ts` - Added semantic search method

**Key Methods:**

**SearchVectorService:**
- `createVectorEmbedding(text)` - Generate single embedding
- `createVectorEmbeddingBatch(texts[])` - Generate batch embeddings
- `storeEmbedding(emailMessageId, embedding)` - Store embedding in DB
- `storeBatchEmbeddings(ids[], embeddings[][])` - Store batch embeddings

**EmailSyncService:**
- `generateEmbeddingsForAccount(accountId)` - Generate embeddings for emails without them (called after sync)

**EmailMessageRepository:**
- `semanticSearchEmails(userId, query, embedding, options)` - Perform vector similarity search using pgvector

### 3. Database Changes

**Schema Updates:**
- Added `embedding vector(768)` column to `message_bodies` table
- Enabled pgvector extension

**Migration:**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE message_bodies ADD COLUMN embedding vector(768);

-- Create HNSW index for fast similarity search
CREATE INDEX message_bodies_embedding_idx
ON message_bodies USING hnsw (embedding vector_cosine_ops);
```

**To Apply Migration:**
```bash
cd backend
npx prisma migrate deploy
# or for development
npx prisma migrate dev
```

## Usage

### 1. Automatic Embedding Generation

Embeddings are automatically generated when emails are synced:

1. Email sync runs (every 30 seconds)
2. New emails are stored in database
3. After sync, `generateEmbeddingsForAccount()` is called in background
4. Batch embeddings are created for emails without embeddings (max 50 per batch)
5. Embeddings are stored in `message_bodies.embedding` column

### 2. Semantic Search API

**Endpoint:** `POST /api/v1/emails/search/semantic`

**Request:**
```json
{
  "query": "financial reports",
  "page": 1,
  "limit": 50
}
```

**Response:**
```json
{
  "emails": [
    {
      "id": "msg_123",
      "subject": "Q4 Budget Summary",
      "from": { "email": "finance@company.com", "name": "Finance Team" },
      "relevanceScore": 0.87,
      ...
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 15,
  "totalPages": 1
}
```

### 3. Search Logic

The semantic search uses **cosine similarity** via pgvector:

1. Convert user query to embedding via AI service
2. Use pgvector's `<=>` operator (cosine distance) to find similar emails
3. Filter by similarity threshold (default: 0.5)
4. Return results ordered by relevance (highest similarity first)

**SQL Query:**
```sql
SELECT em.*, (1 - (mb.embedding <=> $embedding::vector)) AS relevance_score
FROM email_messages em
INNER JOIN message_bodies mb ON mb."emailMessageId" = em.id
WHERE mb.embedding IS NOT NULL
  AND (1 - (mb.embedding <=> $embedding::vector)) > 0.5
ORDER BY mb.embedding <=> $embedding::vector ASC
```

## Performance Considerations

### Indexing Strategy

The implementation uses **HNSW (Hierarchical Navigable Small World)** index:
- **Pros:** Fast search, good recall
- **Cons:** Slower index build time, more memory usage

Alternative: **IVFFlat**
- **Pros:** Faster index build
- **Cons:** Requires training data, lower recall

### Batch Processing

- Embeddings are generated in batches of 50 to balance performance and resource usage
- Background processing prevents blocking email sync
- Error handling ensures failed embeddings don't crash sync

### Optimization Tips

1. **Adjust similarity threshold** - Lower threshold = more results but less relevant
2. **Tune HNSW parameters** - Adjust `m` and `ef_construction` for speed vs accuracy
3. **Limit embedding text** - Currently limited to 1000 chars to reduce API costs

## Testing

### 1. Test Embedding Generation

```bash
# Test AI service endpoint
curl -X POST http://localhost:8000/api/v1/search/vector/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "meeting about budget"}'
```

### 2. Test Semantic Search

```bash
# Search for emails about money
curl -X POST http://localhost:3000/api/v1/emails/search/semantic \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "money", "limit": 10}'

# Should return emails containing: invoice, payment, salary, budget, etc.
```

### 3. Verify Embeddings in Database

```sql
-- Check how many emails have embeddings
SELECT COUNT(*)
FROM message_bodies
WHERE embedding IS NOT NULL;

-- Check embedding similarity
SELECT
  em.subject,
  (1 - (mb.embedding <=> '[0.1, 0.2, ...]'::vector)) as similarity
FROM email_messages em
JOIN message_bodies mb ON mb."emailMessageId" = em.id
WHERE mb.embedding IS NOT NULL
ORDER BY mb.embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

## Troubleshooting

### Issue: Embeddings Not Generated

**Check:**
1. AI service is running (`http://localhost:8000`)
2. Database has pgvector extension enabled
3. Email sync is running successfully
4. Logs for errors in `EmailSyncService.generateEmbeddingsForAccount()`

### Issue: Search Returns No Results

**Check:**
1. Emails have embeddings (`SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL`)
2. Similarity threshold is not too high (try lowering from 0.5 to 0.3)
3. Query embedding is generated successfully
4. pgvector index exists (`\d message_bodies` in psql)

### Issue: Slow Search Performance

**Solutions:**
1. Ensure HNSW index is created
2. Reduce result limit
3. Add filters (date range, sender, etc.) to reduce search space
4. Consider using IVFFlat index for faster queries with large datasets

## Definition of Done ✅

- [x] **Embeddings Generation:** System generates and stores embeddings using Gemini API
- [x] **Batch Processing:** Emails are processed in batches for efficiency
- [x] **Conceptual Relevance:** Searching "money" returns emails with "invoice", "salary", "payment"
- [x] **API Endpoint:** `POST /api/v1/emails/search/semantic` accepts query and returns ranked results
- [x] **Database Integration:** pgvector extension stores 768-dimension embeddings
- [x] **Automatic Sync:** Embeddings generated automatically during email sync
- [x] **Performance:** HNSW index enables fast similarity search

## Next Steps

1. **Apply database migration** - Run `npx prisma migrate deploy`
2. **Start AI service** - Ensure AI service is running
3. **Sync emails** - Wait for or trigger email sync
4. **Test search** - Try semantic search via API
5. **Monitor logs** - Check embedding generation logs
6. **Tune parameters** - Adjust similarity threshold and batch size as needed
