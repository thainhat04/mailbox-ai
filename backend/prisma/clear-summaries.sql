-- Clear all cached summaries to force AI regeneration
UPDATE email_messages
SET summary = NULL,
    summary_generated_at = NULL
WHERE summary IS NOT NULL;

-- Show count of emails that will be regenerated
SELECT COUNT(*) as emails_to_regenerate FROM email_messages WHERE summary IS NULL;
