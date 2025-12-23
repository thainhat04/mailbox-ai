-- Update embedding dimension from 768 (Gemini) to 384 (all-MiniLM-L6-v2)
-- This migration changes the vector dimension for local embeddings

-- Step 1: Drop the existing index
DROP INDEX IF EXISTS message_bodies_embedding_idx;

-- Step 2: Drop the existing embedding column
ALTER TABLE message_bodies DROP COLUMN IF EXISTS embedding;

-- Step 3: Add the new embedding column with 384 dimensions
ALTER TABLE message_bodies ADD COLUMN embedding vector(384);

-- Step 4: Recreate the HNSW index for fast vector similarity search
CREATE INDEX message_bodies_embedding_idx ON message_bodies USING hnsw (embedding vector_cosine_ops);

-- Note: All existing embeddings have been cleared.
-- You will need to regenerate embeddings for existing emails using the new model.
