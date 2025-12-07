import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration
 * @param logger Optional logger for debugging
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  logger?: Logger,
): Promise<T> {
  const { maxAttempts, delayMs, exponentialBackoff = true, onRetry } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        logger?.error(
          `Failed after ${maxAttempts} attempts: ${lastError.message}`,
        );
        throw lastError;
      }

      const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

      logger?.warn(
        `Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`,
      );

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is a token expiration error
 * @param error Error to check
 * @returns True if error is related to token expiration
 */
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || '';
  const statusCode = error.statusCode || error.status || 0;

  return (
    statusCode === 401 ||
    message.includes('unauthorized') ||
    message.includes('token expired') ||
    message.includes('invalid_grant') ||
    message.includes('invalid credentials')
  );
}

/**
 * Check if error is a rate limit error
 * @param error Error to check
 * @returns True if error is related to rate limiting
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || '';
  const statusCode = error.statusCode || error.status || 0;

  return (
    statusCode === 429 ||
    statusCode === 403 ||
    message.includes('rate limit') ||
    message.includes('quota exceeded') ||
    message.includes('too many requests')
  );
}

/**
 * Check if error is retryable
 * @param error Error to check
 * @returns True if error should be retried
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const statusCode = error.statusCode || error.status || 0;

  // Retry on network errors, timeouts, and 5xx server errors
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    statusCode >= 500 ||
    isRateLimitError(error)
  );
}
