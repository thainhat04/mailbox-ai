# 🚀 Start Semantic Search - Complete Guide

## ✅ Fixed Issues

The following issues have been resolved:
- ✅ Removed Redis dependency
- ✅ Updated verification script (no more Redis errors)
- ✅ Created AI service startup script
- ✅ Simplified architecture

---

## 📋 Prerequisites Check

Before starting, ensure you have:
- [ ] PostgreSQL database (Neon or local)
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Database connection working

---

## 🎯 Step-by-Step Startup

### **Step 1: Start AI Service**

```bash
# Option A: Using the startup script (recommended)
cd ai-service
./start-ai-service.sh

# Option B: Manual start
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process [12345]
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**✅ Verify it's working:**
```bash
# In another terminal
curl http://localhost:8000/health
# Should return: {"status":"healthy"} or similar

# Test embedding generation
curl -X POST http://localhost:8000/api/v1/search/vector/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}' | jq
# Should return: {"embedding": [0.123, -0.456, ...]}
```

---

### **Step 2: Setup Database (One-time)**

```bash
cd backend

# Enable pgvector extension and create indexes
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

### **Step 3: Start Backend**

```bash
cd backend
npm run start:dev
```

**Expected output:**
```
[Nest] LOG [Bootstrap] Application is running on: http://localhost:8080
[Nest] LOG [Bootstrap] Swagger docs: http://localhost:8080/api/docs
[Nest] LOG [EmailSyncService] [EMAILS] Starting scheduled email sync
```

**✅ What to look for:**
- ✅ No Redis errors
- ✅ Server starts successfully
- ✅ Email sync runs every 30 seconds

---

### **Step 4: Verify Everything is Working**

```bash
cd backend

# Run verification script
npx ts-node verify-embeddings.ts
```

**Expected output:**
```
🔍 Starting Embedding Verification...

1️⃣ Checking Database...
   ✅ Embedding column exists: USER-DEFINED

2️⃣ Checking pgvector extension...
   ✅ pgvector extension is installed

3️⃣ Checking AI Service...
   ✅ AI service is accessible at http://localhost:8000

4️⃣ Checking messages without embeddings...
   ⚠️  Found X messages without embeddings

5️⃣ Checking configuration...
   AI_SERVICE_URL: http://localhost:8000

6️⃣ Testing embedding generation...
   ✅ Embedding generation works! (384 dimensions)

📊 SUMMARY
Database:        ✅ Column exists: USER-DEFINED
AI Service:      ✅ AI service is accessible
Messages:        ⚠️  X messages need embeddings
Configuration:   ✅ Configuration looks good
```

---

### **Step 5: Backfill Embeddings (Optional)**

If you have existing emails, generate embeddings for them:

```bash
cd backend

# Process first 100 emails
npx ts-node src/scripts/backfill-embeddings.ts --limit 100

# Or process all
npx ts-node src/scripts/backfill-embeddings.ts --limit 10000
```

**Progress will look like:**
```
🚀 Starting embedding backfill process...
📧 Found 50 emails without embeddings

📦 Processing batch 1/3 (20 emails)...
✅ Batch 1/3 completed in 1234ms (20 embeddings stored)
📦 Processing batch 2/3 (20 emails)...
✅ Batch 2/3 completed in 1156ms (20 embeddings stored)
...

✅ Backfill completed!
   - Successfully embedded: 50
   - Failed: 0
```

---

### **Step 6: Test Semantic Search**

#### Get Auth Token

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }' | jq

# Copy the access_token and export it
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Test Searches

```bash
# Test 1: Search for "money"
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "money", "limit": 5}' | jq

# Test 2: Search for "urgent meeting"
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "urgent meeting", "limit": 5}' | jq

# Test 3: Search for "vacation"
curl -X POST http://localhost:8080/api/v1/emails/semantic-search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "vacation", "limit": 5}' | jq
```

**Expected results:**
- Results should have `relevanceScore` between 0.5 and 1.0
- "money" → finds invoices, payments, salary, prices
- "urgent" → finds deadlines, important emails
- "vacation" → finds holidays, time off, PTO

---

## 🔍 Troubleshooting

### Issue: AI Service won't start

**Error:** `ModuleNotFoundError: No module named 'app'`

**Solution:**
```bash
cd ai-service

# Make sure you're using the venv Python
source .venv/bin/activate

# Check Python path
which python
# Should show: /Users/.../ai-service/.venv/bin/python

# Try starting again
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Issue: Backend has Redis errors

**Error:** `Cannot find name 'RedisService'`

**Solution:**
```bash
cd backend

# Clean build
rm -rf dist
npm run build

# Restart
npm run start:dev
```

### Issue: No embeddings generated

**Check:**
1. Is AI service running? `curl http://localhost:8000/health`
2. Are emails synced? Check database: `SELECT COUNT(*) FROM email_messages;`
3. Wait for automatic sync (30 seconds) or run backfill

**Monitor logs:**
```
[EmailSyncService] [EMBEDDINGS] Generating embeddings for account: xxx
[EmailSyncService] [EMBEDDINGS] Found 10 messages without embeddings
[EmailSyncService] [EMBEDDINGS] ✓ Batch 1/1 completed (10 embeddings stored)
```

### Issue: Search returns no results

**Check:**
```sql
-- Are there embeddings?
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;

-- Are there emails?
SELECT COUNT(*) FROM email_messages;
```

If 0 embeddings, run backfill or wait for sync.

---

## 📊 Monitor Progress

### Check Database

```sql
-- Connect to database
psql $DATABASE_URL

-- Check embeddings status
SELECT
    (SELECT COUNT(*) FROM email_messages) as total_emails,
    (SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL) as with_embeddings,
    (SELECT COUNT(*) FROM message_bodies WHERE embedding IS NULL) as without_embeddings;
```

### Watch Backend Logs

Look for these logs every 30 seconds:
```
[EmailSyncService] Starting sync for account: xxx
[EmailSyncService] Sync completed: +5 messages
[EmailSyncService] [EMBEDDINGS] Generating embeddings...
[EmailSyncService] [EMBEDDINGS] ✅ Completed
```

---

## ✅ Success Criteria

You know it's working when:

- [x] AI service responds at http://localhost:8000
- [x] Backend starts without Redis errors
- [x] Verification script shows all ✅
- [x] Emails have embeddings in database
- [x] Semantic search returns results
- [x] Results ranked by relevance (0.5-1.0 scores)
- [x] Conceptual queries work (money → invoice)

---

## 🎯 Quick Commands

```bash
# Load helper commands
source RUN_COMMANDS.sh

# Setup (one-time)
full_setup

# Start services
start_ai        # Terminal 1
start_backend   # Terminal 2

# Backfill
backfill 100

# Test
export TOKEN="your-token"
test_semantic_search "money"
test_semantic_search "urgent meeting"

# Check status
check_embeddings
check_pgvector
```

---

## 📝 Daily Workflow

**Start services:**
```bash
# Terminal 1: AI Service
cd ai-service && ./start-ai-service.sh

# Terminal 2: Backend
cd backend && npm run start:dev
```

**Monitor:**
- Watch backend logs for embedding generation
- Check database periodically: `check_embeddings`

**Search:**
- Use semantic search endpoint
- Results improve as more embeddings are generated

---

**Ready?** Start with Step 1 (AI Service) and work through each step! 🚀
