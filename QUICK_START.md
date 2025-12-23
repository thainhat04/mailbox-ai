# 🚀 Semantic Search - Quick Start

## One-Time Setup (3 steps)

### 1️⃣ Setup Database
```bash
cd backend
npx ts-node src/scripts/run-pgvector-setup.ts
```
✅ Enables pgvector extension and creates vector indexes

### 2️⃣ Start AI Service
```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
✅ Starts the embedding generation service

### 3️⃣ Backfill Embeddings (optional)
```bash
cd backend
npx ts-node src/scripts/backfill-embeddings.ts
```
✅ Generates embeddings for existing emails

## Daily Usage

### Start Services
```bash
# Terminal 1: AI Service
cd ai-service && source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2: Backend
cd backend && npm run start:dev
```

## Test Semantic Search

### Via cURL
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

### Test Queries
| Query | Expected Matches |
|-------|-----------------|
| `money` | invoice, payment, salary, price, budget |
| `urgent` | deadline, important, ASAP, critical |
| `vacation` | holiday, time off, PTO, leave |
| `meeting` | conference, discussion, call, gathering |

## How It Works

1. **Email arrives** → Synced to database
2. **Every 30s** → Auto-generate embeddings for new emails
3. **User searches** → Find semantically similar emails
4. **Results** → Ranked by relevance, not just keywords

## Key Features

✅ **No Redis** - Simplified architecture
✅ **Automatic** - Embeddings generated during sync
✅ **Fast** - <100ms search with index
✅ **Smart** - Finds meaning, not just keywords
✅ **Local** - No external API costs

## Troubleshooting

**No results?**
```sql
-- Check embeddings exist
SELECT COUNT(*) FROM message_bodies WHERE embedding IS NOT NULL;
```

**AI service down?**
```bash
curl http://localhost:8000/api/v1/search/vector/embeddings \
  -d '{"text": "test"}'
```

**Slow search?**
```sql
-- Check index exists
SELECT * FROM pg_indexes WHERE tablename = 'message_bodies';
```

## 📚 Full Documentation

- [SEMANTIC_SEARCH_SETUP.md](backend/SEMANTIC_SEARCH_SETUP.md) - Complete setup guide
- [IMPLEMENTATION_SUMMARY.md](backend/IMPLEMENTATION_SUMMARY.md) - Technical details

---

**Ready?** Run the 3 setup steps above and start searching! 🎉
