/**
 * Mail Provider Types
 * Since the schema uses string for provider, we define our own type
 */

export type MailProviderType = 'google' | 'microsoft';

export const MailProvider = {
  GOOGLE: 'google' as MailProviderType,
  MICROSOFT: 'microsoft' as MailProviderType,
} as const;
