-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to message_bodies table (768 dimensions for Gemini embedding-001)
ALTER TABLE message_bodies ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for fast vector similarity search using HNSW (Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS message_bodies_embedding_idx ON message_bodies USING hnsw (embedding vector_cosine_ops);

-- Optional: Create index for IVFFlat (alternative indexing method, faster build time)
-- CREATE INDEX IF NOT EXISTS message_bodies_embedding_ivfflat_idx ON message_bodies USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
