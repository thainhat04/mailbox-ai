# Local Embeddings Setup Guide

This guide explains how the system has been configured to use local embeddings with the `all-MiniLM-L6-v2` model instead of external APIs.

## Overview

The system now uses **sentence-transformers** with the `all-MiniLM-L6-v2` model to generate embeddings locally. This eliminates the need for external API keys and provides:

- **Cost savings**: No API calls required
- **Privacy**: All data processing happens locally
- **Speed**: No network latency for embedding generation
- **Reliability**: No dependency on external services

## Model Details

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Embedding Dimension**: 384 (down from 768 with Gemini)
- **Performance**: Optimized for semantic search and similarity tasks
- **Size**: ~80MB (automatically downloaded on first use)

## Installation

### 1. Install Python Dependencies

Navigate to the `ai-service` directory and install dependencies:

```bash
cd ai-service
uv sync
# or
pip install -e .
```

This will install:
- `sentence-transformers>=2.2.2`
- `torch>=2.0.0`

### 2. Database Migration

The embedding vector dimension has changed from 768 to 384. You need to update your database:

```bash
cd backend
npx prisma migrate dev --name update_embedding_dimension_to_384
```

**Important**: This will require regenerating embeddings for existing emails. If you have existing embeddings, you have two options:

#### Option A: Drop and recreate embeddings (Recommended)
```sql
-- Clear existing embeddings
UPDATE message_bodies SET embedding = NULL;

-- Or drop and recreate the column
ALTER TABLE message_bodies DROP COLUMN embedding;
ALTER TABLE message_bodies ADD COLUMN embedding vector(384);
```

#### Option B: Migrate existing embeddings
If you need to preserve your data, you'll need to regenerate embeddings for all existing emails using the backend API.

### 3. Environment Configuration

Update your `.env` files:

**ai-service/.env:**
```bash
# No GOOGLE_API_KEY required for embeddings!
USE_LOCAL_EMBEDDINGS=true
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Still needed if you use Gemini for other features (like summarization)
GOOGLE_API_KEY=your_key_here_if_needed
```

**backend/.env:**
```bash
AI_SERVICE_URL=http://localhost:8000
```

## First Run

On the first run, the sentence-transformers library will automatically download the `all-MiniLM-L6-v2` model (~80MB) to your local cache directory:

- **Linux/Mac**: `~/.cache/torch/sentence_transformers/`
- **Windows**: `C:\Users\<username>\.cache\torch\sentence_transformers\`

This is a one-time download. Subsequent runs will use the cached model.

## Usage

### Starting the AI Service

```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

### API Endpoints

The API endpoints remain the same:

**Single Embedding:**
```bash
POST http://localhost:8000/api/v1/search/vector/embeddings
Content-Type: application/json

{
  "text": "Your email content here"
}
```

**Batch Embeddings:**
```bash
POST http://localhost:8000/api/v1/search/vector/embeddings/batch
Content-Type: application/json

{
  "texts": ["Email 1 content", "Email 2 content"]
}
```

## Performance Comparison

| Metric | Gemini API (768d) | Local all-MiniLM-L6-v2 (384d) |
|--------|-------------------|-------------------------------|
| Embedding Size | 768 dimensions | 384 dimensions |
| API Calls | Required | None |
| Latency | Network dependent (~100-500ms) | Local only (~10-50ms) |
| Cost | Per-API-call pricing | Free |
| Rate Limits | Yes | None |
| Batch Size | Limited | Limited by RAM only |

## Troubleshooting

### Issue: Model download fails

**Solution**: Ensure you have internet connection for the first run. The model needs to be downloaded once.

### Issue: Out of memory errors

**Solution**: The model requires ~1GB RAM. For large batch operations, reduce batch size:

```python
# In search_vector_service.py, you can process in smaller chunks
MAX_BATCH_SIZE = 32  # Adjust based on your system
```

### Issue: Slow embedding generation

**Solution**:
1. Enable GPU acceleration if available (PyTorch will automatically use CUDA if available)
2. Increase batch size for batch operations
3. Consider using a smaller model if 384 dimensions are still too large

### Issue: Existing embeddings not working

**Solution**: You need to regenerate all embeddings with the new model. Run the migration script or use the backend API to regenerate embeddings for all emails.

## Technical Details

### How It Works

1. **Model Loading**: On service startup, the `SentenceTransformer` model is loaded into memory
2. **Text Processing**: Input text is cleaned (HTML removed, whitespace normalized)
3. **Encoding**: Text is encoded into a 384-dimensional vector using the transformer model
4. **Batch Processing**: Multiple texts can be processed efficiently in batches
5. **Storage**: Vectors are stored in PostgreSQL using the pgvector extension

### Code Changes Summary

- **ai-service/app/services/search_vector_service.py**: Replaced Gemini API calls with sentence-transformers
- **ai-service/pyproject.toml**: Added sentence-transformers and torch dependencies
- **ai-service/app/core/config.py**: Added local embedding configuration options
- **backend/prisma/schema.prisma**: Updated vector dimension from 768 to 384

## Alternative Models

If you need different capabilities, you can easily switch to other sentence-transformers models:

### For better quality (larger, slower):
```bash
EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2  # 768 dimensions
EMBEDDING_DIMENSION=768
```

### For faster speed (smaller, faster):
```bash
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L12-v2  # 384 dimensions
EMBEDDING_DIMENSION=384
```

### For multilingual support:
```bash
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2  # 384 dimensions
EMBEDDING_DIMENSION=384
```

Just update the schema and migrations accordingly if you change the dimension size.

## Migration Checklist

- [ ] Install new Python dependencies (`sentence-transformers`, `torch`)
- [ ] Update database schema (change vector dimension to 384)
- [ ] Run database migration
- [ ] Clear or regenerate existing embeddings
- [ ] Update `.env` files with new configuration
- [ ] Restart AI service
- [ ] Test embedding generation with sample emails
- [ ] Verify semantic search functionality

## References

- [Sentence Transformers Documentation](https://www.sbert.net/)
- [all-MiniLM-L6-v2 Model Card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
