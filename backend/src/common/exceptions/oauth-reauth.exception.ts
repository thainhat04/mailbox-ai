import { HttpStatus } from "@nestjs/common";
import { BaseException } from "./base.exception";
import { CODES } from "../constants";

/**
 * Exception thrown when OAuth token has been permanently revoked
 * and the user needs to re-authenticate their account.
 *
 * This is different from a normal token expiration - the refresh token
 * itself is invalid and cannot be used to obtain new access tokens.
 */
export class OAuthReauthRequiredException extends BaseException {
  constructor(
    public readonly accountId: string,
    public readonly provider: string,
    message?: string,
  ) {
    super(
      message ||
        `Your ${provider} account needs to be reconnected. Please re-authenticate.`,
      CODES.OAUTH_REAUTH_REQUIRED,
      HttpStatus.UNAUTHORIZED,
      {
        accountId,
        provider,
        action: "reauth_required",
      },
    );
  }
}

/**
 * List of OAuth error codes that indicate permanent token revocation
 * and require user re-authentication.
 */
export const PERMANENT_OAUTH_ERRORS = [
  "unauthorized_client", // Token revoked or client ID changed
  "invalid_grant", // Refresh token expired or revoked
  "invalid_client", // Client credentials invalid
  "access_denied", // User denied access
] as const;

/**
 * Check if an error message indicates a permanent OAuth failure
 */
export function isPermanentOAuthError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase();
  return PERMANENT_OAUTH_ERRORS.some((code) => lowerMessage.includes(code));
}
