/**
 * Email Sync Configuration
 * Centralized settings for email synchronization behavior
 */
export const SyncConfig = {
  /**
   * Sync interval in milliseconds (3 minutes)
   * How often the cron job will run to sync emails
   */
  SYNC_INTERVAL_MS: 3 * 60 * 1000,

  /**
   * Initial sync lookback period in days
   * How many days of historical emails to fetch on first sync
   */
  INITIAL_SYNC_DAYS: 30,

  /**
   * Maximum number of messages to fetch per sync operation
   * Prevents overwhelming the database with too many inserts at once
   */
  MAX_MESSAGES_PER_SYNC: 100,

  /**
   * Maximum number of accounts to sync concurrently
   * Prevents API quota exhaustion
   */
  CONCURRENT_ACCOUNTS: 3,

  /**
   * Number of retry attempts for failed operations
   */
  RETRY_ATTEMPTS: 3,

  /**
   * Initial delay in milliseconds for retry backoff (5 seconds)
   * Delay will increase exponentially: 5s, 10s, 20s
   */
  RETRY_DELAY_MS: 5000,

  /**
   * Buffer time before token expiration to trigger refresh (5 minutes)
   * Ensures tokens are refreshed proactively before they expire
   */
  TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000,

  /**
   * Page size for Gmail message list requests
   */
  GMAIL_PAGE_SIZE: 100,

  /**
   * Page size for Outlook message list requests
   */
  OUTLOOK_PAGE_SIZE: 100,
} as const;

export type SyncConfigType = typeof SyncConfig;
