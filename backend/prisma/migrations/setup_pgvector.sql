-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for fast cosine similarity search
-- Using IVFFlat index with cosine distance operator
-- Lists parameter set to 100 (good starting point for moderate dataset sizes)
CREATE INDEX IF NOT EXISTS idx_message_bodies_embedding_cosine
ON message_bodies
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: L2 distance index (if needed in future)
-- CREATE INDEX IF NOT EXISTS idx_message_bodies_embedding_l2
-- ON message_bodies
-- USING ivfflat (embedding vector_l2_ops)
-- WITH (lists = 100);

-- Verify the index was created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'message_bodies'
  AND indexname LIKE '%embedding%';
