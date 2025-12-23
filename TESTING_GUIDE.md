# Semantic Search Testing Guide

## 🚀 Step-by-Step Testing Process

### Step 1: Setup Database (One-time)

**Run pgvector setup:**
```bash
cd backend
npx ts-node src/scripts/run-pgvector-setup.ts
```

**Expected output:**
```
🔧 Setting up pgvector extension and indexes...
📦 Enabling pgvector extension...
✅ pgvector extension enabled
📊 Creating vector index for cosine similarity...
✅ Vector index created
✅ pgvector setup completed successfully!
```

---

### Step 2: Start AI Service (Terminal 1)

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Test AI Service:**
```bash
# In another terminal
curl -X POST http://localhost:8000/api/v1/search/vector/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "invoice payment deadline"}'
```

**Expected response:**
```json
{
  "embedding": [0.123, -0.456, 0.789, ... ] // 384 numbers
}
```

---

### Step 3: Start Backend (Terminal 2)

```bash
cd backend
npm run start:dev
```

**Expected output:**
```
[Nest] LOG [Bootstrap] Application is running on: http://localhost:8080
[Nest] LOG [Bootstrap] Swagger docs: http://localhost:8080/api/docs
[Nest] LOG [EMAILS] Starting scheduled email sync
```

**Look for these logs confirming no Redis errors:**
- ✅ No "Redis connection failed" errors
- ✅ App starts successfully
- ✅ Email sync runs every 30 seconds

---

### Step 4: Backfill Embeddings (Terminal 3 - Optional)

**Generate embeddings for existing emails:**
```bash
cd backend
npx ts-node src/scripts/backfill-embeddings.ts --limit 100
```

**Expected output:**
```
🚀 Starting embedding backfill process...
🔍 Finding emails without embeddings...
📧 Found 50 emails without embeddings

📦 Processing batch 1/3 (20 emails)...
✅ Batch 1/3 completed in 1234ms (20 embeddings stored)
📦 Processing batch 2/3 (20 emails)...
✅ Batch 2/3 completed in 1156ms (20 embeddings stored)
📦 Processing batch 3/3 (10 emails)...
✅ Batch 3/3 completed in 678ms (10 embeddings stored)

✅ Backfill completed!
📊 Summary:
   - Total emails processed: 50
   - Successfully embedded: 50
   - Failed: 0
```

---

### Step 5: Get Authentication Token

**Login to get JWT token:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Response:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

**Save the token:**
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Step 6: Test Semantic Search 🎯

#### Test 1: Search for "money"

```bash
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "money",
    "page": 1,
    "limit": 10
  }' | jq
```

**Expected results should contain emails about:**
- ✅ invoice
- ✅ payment
- ✅ salary
- ✅ price
- ✅ budget
- ✅ financial matters

**Response format:**
```json
{
  "data": {
    "emails": [
      {
        "id": "...",
        "subject": "Invoice #12345 - Payment Due",
        "preview": "Please find attached invoice for...",
        "relevanceScore": 0.87,
        ...
      },
      {
        "id": "...",
        "subject": "Salary Review Discussion",
        "preview": "We would like to schedule...",
        "relevanceScore": 0.82,
        ...
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

#### Test 2: Search for "urgent meeting"

```bash
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "urgent meeting",
    "page": 1,
    "limit": 5
  }' | jq
```

**Expected results:**
- ✅ Emails with "deadline"
- ✅ Emails with "important"
- ✅ Emails with "ASAP"
- ✅ Emails with "time-sensitive"
- ✅ Conference/call invitations

#### Test 3: Search for "vacation"

```bash
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "vacation",
    "page": 1,
    "limit": 5
  }' | jq
```

**Expected results:**
- ✅ Emails with "holiday"
- ✅ Emails with "time off"
- ✅ Emails with "PTO"
- ✅ Emails with "leave"

---

## 📊 Verify Embedding Generation

### Check Database

```sql
-- Connect to your database
psql $DATABASE_URL

-- Count emails with embeddings
SELECT COUNT(*) as emails_with_embeddings
FROM message_bodies
WHERE embedding IS NOT NULL;

-- Count emails without embeddings
SELECT COUNT(*) as emails_without_embeddings
FROM message_bodies
WHERE embedding IS NULL;

-- View recent embeddings (first 5 dimensions only)
SELECT
  em.subject,
  LEFT(mb.embedding::text, 100) as embedding_preview
FROM email_messages em
JOIN message_bodies mb ON mb."emailMessageId" = em.id
WHERE mb.embedding IS NOT NULL
LIMIT 5;

-- Check vector dimensions
SELECT pg_typeof(embedding) as type
FROM message_bodies
WHERE embedding IS NOT NULL
LIMIT 1;
-- Should return: vector(384)
```

### Monitor Backend Logs

**Watch for embedding generation logs:**
```bash
# In backend terminal, look for:
[EMBEDDINGS] Generating embeddings for account: xxx
[EMBEDDINGS] Found 10 messages without embeddings
[EMBEDDINGS] Processing batch 1/1 (10 emails)...
[EMBEDDINGS] ✓ Batch 1/1 completed (10 embeddings stored)
[EMBEDDINGS] ✅ Completed embedding generation
```

---

## 🧪 Advanced Testing

### Compare Semantic vs Exact Search

**Exact search (basic):**
```bash
curl -X GET "http://localhost:8080/api/v1/emails/search?q=invoice" \
  -H "Authorization: Bearer $TOKEN" | jq
```
Returns: Only emails containing word "invoice"

**Semantic search:**
```bash
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "invoice", "limit": 10}' | jq
```
Returns: Emails about invoices, payments, bills, receipts (even without word "invoice")

### Test Relevance Scores

All results should have `relevanceScore` between 0.5 and 1.0:
- **0.9-1.0**: Very high relevance (almost exact match)
- **0.7-0.9**: High relevance (strong semantic similarity)
- **0.5-0.7**: Medium relevance (related concepts)

```bash
# Check relevance scores
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "project deadline", "limit": 5}' | \
  jq '.data.emails[] | {subject, relevanceScore}'
```

---

## 🔍 Troubleshooting

### Issue 1: No results from semantic search

**Check 1: Are embeddings generated?**
```sql
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;
```
If 0, run backfill script.

**Check 2: Is AI service running?**
```bash
curl http://localhost:8000/health
```

**Check 3: Are there emails in database?**
```sql
SELECT COUNT(*) FROM email_messages;
```

### Issue 2: "AI service connection failed"

**Error in logs:**
```
[EMBEDDINGS] Failed to process batch 1: AI service connection failed
```

**Solution:**
1. Check AI service is running: `curl http://localhost:8000/health`
2. Check AI_SERVICE_URL in backend/.env: `AI_SERVICE_URL=http://localhost:8000`
3. Restart AI service

### Issue 3: Slow search (>1 second)

**Check if index exists:**
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'message_bodies'
AND indexname LIKE '%embedding%';
```

**If no index, create it:**
```bash
npx ts-node src/scripts/run-pgvector-setup.ts
```

### Issue 4: Backend won't start

**Error:** "Cannot find module 'RedisService'"

**Solution:** Files were moved, rebuild:
```bash
cd backend
rm -rf dist
npm run build
npm run start:dev
```

---

## ✅ Success Criteria

Your semantic search is working correctly if:

- [x] Backend starts without Redis errors
- [x] AI service responds to embedding requests
- [x] Backfill script completes successfully
- [x] Semantic search returns results
- [x] Results are ranked by relevance score
- [x] Conceptual queries work:
  - "money" → finds invoices, payments, salary
  - "urgent" → finds deadlines, important emails
  - "vacation" → finds holidays, time off, PTO
- [x] Search performance < 200ms with index
- [x] New emails get embeddings automatically (check logs every 30s)

---

## 📈 Performance Benchmarks

Expected performance:

| Operation | Expected Time |
|-----------|--------------|
| Single embedding generation | 100-200ms |
| Batch (20 emails) | 1-2 seconds |
| Semantic search | <100ms (with index) |
| Backfill 100 emails | 5-10 seconds |

---

## 🎯 Test Checklist

```
Setup:
[ ] pgvector extension enabled
[ ] Vector index created
[ ] AI service running on port 8000
[ ] Backend running on port 8080
[ ] At least 10 emails in database

Testing:
[ ] Embeddings generated (check database)
[ ] Semantic search returns results
[ ] Relevance scores between 0.5-1.0
[ ] Conceptual queries work (money → invoice)
[ ] Results ranked by relevance
[ ] Search completes in <200ms

Monitoring:
[ ] Backend logs show embedding generation
[ ] No Redis errors in logs
[ ] Email sync runs every 30 seconds
[ ] New emails get embeddings automatically
```

---

## 📝 Example Test Session

```bash
# Terminal 1: Start AI Service
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload
# ✅ Running on http://0.0.0.0:8000

# Terminal 2: Setup & Start Backend
cd backend
npx ts-node src/scripts/run-pgvector-setup.ts
# ✅ pgvector setup completed

npm run start:dev
# ✅ Application running on http://localhost:8080

# Terminal 3: Backfill (optional)
cd backend
npx ts-node src/scripts/backfill-embeddings.ts --limit 50
# ✅ 50 embeddings generated

# Terminal 4: Test
# Get token
export TOKEN=$(curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' | \
  jq -r '.data.access_token')

# Test semantic search
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "money", "limit": 5}' | jq

# ✅ Returns relevant emails with scores!
```

---

**Ready to test?** Follow Step 1-6 above! 🚀
