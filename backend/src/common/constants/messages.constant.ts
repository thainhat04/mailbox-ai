import { CODES } from "./error-codes.constant";

export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  [CODES.UNAUTHORIZED]: "Unauthorized access",
  [CODES.FORBIDDEN]: "Access forbidden",
  [CODES.TOKEN_EXPIRED]: "Token has expired",
  [CODES.TOKEN_INVALID]: "Invalid token",
  [CODES.TOKEN_MISSING]: "Token is missing",

  // User
  [CODES.USER_NOT_FOUND]: "User not found",
  [CODES.USER_ALREADY_EXISTS]: "User already exists",
  [CODES.USER_INACTIVE]: "User account is inactive",
  [CODES.INVALID_CREDENTIALS]: "Invalid email or password",

  // Validation
  [CODES.VALIDATION_ERROR]: "Validation error",
  [CODES.INVALID_PROVIDER]: "Invalid provider",
  // Server
  [CODES.INTERNAL_SERVER_ERROR]: "Internal server error",
  [CODES.BAD_REQUEST]: "Bad request",

  // Business Logic
  [CODES.PERMISSION_DENIED]: "Permission denied",
};

export const SUCCESS_MESSAGES = {
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  RETRIEVED: "Resource retrieved successfully",
} as const;
