-- Enable pg_trgm extension for fuzzy text search
-- This extension provides similarity() and word_similarity() functions
-- Required for fuzzy search functionality
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Create GIN indexes on text columns for better fuzzy search performance
-- These indexes speed up similarity() and word_similarity() queries
CREATE INDEX IF NOT EXISTS email_messages_subject_trgm_idx ON email_messages USING gin (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS email_messages_from_trgm_idx ON email_messages USING gin ("from" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS email_messages_fromname_trgm_idx ON email_messages USING gin ("fromName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS email_messages_snippet_trgm_idx ON email_messages USING gin (snippet gin_trgm_ops);