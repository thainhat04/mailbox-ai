# Database Reset & Semantic Search Setup

## 🔄 Step 1: Reset Database

### Option A: Using Prisma (Recommended)

```bash
cd backend

# Reset database (drops all data and re-runs migrations)
npx prisma migrate reset --force

# This will:
# 1. Drop all tables
# 2. Re-run all migrations
# 3. Seed the database (if seed script exists)
```

### Option B: Manual Reset (if Prisma fails)

```bash
# Connect to database
psql $DATABASE_URL

# Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;

# Exit psql
\q

# Then run migrations
cd backend
npx prisma migrate deploy
```

---

## 🔧 Step 2: Setup pgvector

After reset, you need to re-enable pgvector:

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

🔍 Verifying indexes...
✅ Found vector indexes:
┌─────────┬──────────────────────────────────────────┬─────────────────┐
│ (index) │ Index                                    │ Table           │
├─────────┼──────────────────────────────────────────┼─────────────────┤
│    0    │ 'idx_message_bodies_embedding_cosine'    │'message_bodies' │
└─────────┴──────────────────────────────────────────┴─────────────────┘

✅ pgvector setup completed successfully!
```

---

## 🚀 Step 3: Start Services

### Terminal 1: AI Service

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify AI service is working:**
```bash
# In another terminal
curl -X POST http://localhost:8000/api/v1/search/vector/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'

# Should return: {"embedding": [0.123, -0.456, ...]}
```

### Terminal 2: Backend

```bash
cd backend
npm run start:dev
```

**Look for these logs:**
```
[Nest] LOG [Bootstrap] Application is running on: http://localhost:8080
[Nest] LOG [Bootstrap] Swagger docs: http://localhost:8080/api/docs
[Nest] LOG [EmailSyncService] [EMAILS] Starting scheduled email sync
```

**✅ Success indicators:**
- No "Redis connection failed" errors
- No "Cannot find RedisService" errors
- App starts successfully

---

## 📧 Step 4: Sync Emails

### Option A: Wait for Automatic Sync (30 seconds)

The backend automatically syncs emails every 30 seconds. Just wait and watch the logs:

```
[EmailSyncService] Starting sync for account: xxx-xxx-xxx
[EmailSyncService] Sync completed for account xxx: +10 messages, -0 messages
[EmailSyncService] [EMBEDDINGS] Generating embeddings for account: xxx
[EmailSyncService] [EMBEDDINGS] Found 10 messages without embeddings
[EmailSyncService] [EMBEDDINGS] Processing batch 1/1 (10 emails)...
[EmailSyncService] [EMBEDDINGS] ✓ Batch 1/1 completed (10 embeddings stored)
[EmailSyncService] [EMBEDDINGS] ✅ Completed embedding generation
```

### Option B: Manual Trigger (via API)

If you have an endpoint to trigger sync manually, use it. Otherwise, just wait for the cron job.

---

## 🔍 Step 5: Verify Embeddings

### Check Database

```sql
-- Connect to database
psql $DATABASE_URL

-- Check if pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Count emails with embeddings
SELECT COUNT(*) as with_embeddings
FROM message_bodies
WHERE embedding IS NOT NULL;

-- Count total emails
SELECT COUNT(*) as total_emails FROM email_messages;

-- View recent emails with embeddings
SELECT
  em.subject,
  em."from",
  CASE WHEN mb.embedding IS NOT NULL THEN '✅ Has embedding' ELSE '❌ No embedding' END as status
FROM email_messages em
LEFT JOIN message_bodies mb ON mb."emailMessageId" = em.id
ORDER BY em.date DESC
LIMIT 10;
```

**Expected after first sync:**
```
 subject                          | from              | status
----------------------------------+-------------------+----------------
 Invoice #12345                   | billing@acme.com  | ✅ Has embedding
 Meeting Tomorrow                 | boss@company.com  | ✅ Has embedding
 Your Order Shipped               | shop@amazon.com   | ✅ Has embedding
```

---

## 🧪 Step 6: Test Semantic Search

### Get Authentication Token

```bash
# Login (adjust email/password)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }' | jq

# Save token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test Search

```bash
# Test 1: Search for "money"
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "money", "page": 1, "limit": 10}' | jq

# Test 2: Search for "urgent meeting"
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "urgent meeting", "page": 1, "limit": 5}' | jq

# Test 3: Search for "vacation"
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "vacation", "page": 1, "limit": 5}' | jq
```

---

## 📊 Step 7: Backfill More Emails (Optional)

If you have many existing emails, run the backfill script:

```bash
cd backend

# Process first 100 emails
npx ts-node src/scripts/backfill-embeddings.ts --limit 100

# Or all emails (remove limit)
npx ts-node src/scripts/backfill-embeddings.ts --limit 10000
```

**Expected output:**
```
🚀 Starting embedding backfill process...
📊 Configuration: limit=100, batch_size=20

🔍 Finding emails without embeddings...
📧 Found 100 emails without embeddings

📦 Processing batch 1/5 (20 emails)...
✅ Batch 1/5 completed in 1234ms (20 embeddings stored)
📦 Processing batch 2/5 (20 emails)...
✅ Batch 2/5 completed in 1156ms (20 embeddings stored)
...
✅ Backfill completed!
📊 Summary:
   - Total emails processed: 100
   - Successfully embedded: 100
   - Failed: 0
```

---

## ✅ Success Checklist

After reset and setup, verify:

```bash
# 1. pgvector extension enabled
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
# Should show: vector | 0.7.0 | ...

# 2. Vector index created
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'message_bodies' AND indexname LIKE '%embedding%';"
# Should show: idx_message_bodies_embedding_cosine

# 3. AI service running
curl http://localhost:8000/health
# Should return: {"status": "ok"} or similar

# 4. Backend running
curl http://localhost:8080/api/health || curl http://localhost:8080/
# Should return HTTP 200

# 5. Emails synced
psql $DATABASE_URL -c "SELECT COUNT(*) FROM email_messages;"
# Should show number > 0

# 6. Embeddings generated
psql $DATABASE_URL -c "SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;"
# Should show number > 0

# 7. Semantic search works
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 5}' | jq
# Should return results with relevanceScore
```

---

## 🔧 Troubleshooting Reset Issues

### Issue: "Can't reach database server"

**Check database URL:**
```bash
cat backend/.env | grep DATABASE_URL
```

**Test connection:**
```bash
psql $DATABASE_URL -c "SELECT version();"
```

If connection fails:
- Check internet connection
- Check if database is paused (Neon databases pause after inactivity)
- Wake up database by visiting Neon dashboard

### Issue: Migration fails

**Clear migration history and retry:**
```bash
cd backend

# Delete migration files (backup first!)
mkdir -p .backup
cp -r prisma/migrations .backup/

# Reset Prisma
npx prisma migrate reset --skip-generate --skip-seed

# Re-run setup
npx ts-node src/scripts/run-pgvector-setup.ts
```

### Issue: No emails after reset

**You need to:**
1. Re-authenticate with Gmail/Outlook in frontend
2. Wait for automatic sync (30 seconds)
3. Or trigger manual sync if available

---

## 🎯 Complete Reset Script

Here's a script that does everything:

```bash
#!/bin/bash

echo "🔄 Starting complete reset and setup..."

# 1. Reset database
echo "📦 Resetting database..."
cd backend
npx prisma migrate reset --force

# 2. Setup pgvector
echo "🔧 Setting up pgvector..."
npx ts-node src/scripts/run-pgvector-setup.ts

# 3. Start AI service (in background)
echo "🤖 Starting AI service..."
cd ../ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
AI_PID=$!

# Wait for AI service to start
sleep 5

# 4. Start backend (in background)
echo "🚀 Starting backend..."
cd ../backend
npm run start:dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 10

echo "✅ Setup complete!"
echo ""
echo "Services running:"
echo "  - AI Service: http://localhost:8000"
echo "  - Backend: http://localhost:8080"
echo ""
echo "Next steps:"
echo "  1. Wait for email sync (watch logs)"
echo "  2. Run backfill: npx ts-node src/scripts/backfill-embeddings.ts"
echo "  3. Test search!"
echo ""
echo "To stop services:"
echo "  kill $AI_PID $BACKEND_PID"
```

---

**Ready to start?** Run Step 1 (Reset Database) when your database is accessible! 🚀
