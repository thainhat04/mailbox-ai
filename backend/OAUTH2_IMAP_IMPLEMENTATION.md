# OAuth2 Token Management & IMAP Connector Implementation

## Overview
This document describes the OAuth2 token management system and IMAP connector integration for the mailbox application.

## Database Schema

### OAuth2Token Table
Stores OAuth2 tokens obtained from Google/Microsoft for mail server access:

```prisma
model OAuth2Token {
  id           String       @id @default(uuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider     MailProvider // GOOGLE or MICROSOFT
  email        String       // The email account this token is for

  // OAuth2 token fields
  accessToken  String       @db.Text
  refreshToken String?      @db.Text
  tokenType    String       @default("Bearer")
  expiresAt    DateTime
  scope        String?      @db.Text
  idToken      String?      @db.Text

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@unique([userId, provider, email])
  @@index([userId])
  @@index([email])
  @@index([expiresAt])
  @@map("oauth2_tokens")
}
```

### ImapConfig Table
Stores IMAP/SMTP connection settings for each user/provider:

```prisma
model ImapConfig {
  id           String       @id @default(uuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider     MailProvider
  email        String

  // IMAP settings
  imapHost     String
  imapPort     Int
  imapSecure   Boolean      @default(true)

  // SMTP settings
  smtpHost     String
  smtpPort     Int
  smtpSecure   Boolean      @default(true)

  // Sync settings
  lastSyncAt   DateTime?
  syncEnabled  Boolean      @default(true)

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@unique([userId, provider, email])
  @@index([userId])
  @@index([syncEnabled])
  @@map("imap_configs")
}
```

### MailProvider Enum
```prisma
enum MailProvider {
  GOOGLE
  MICROSOFT
}
```

## OAuth2 Provider Configuration

### Google Mail Scopes
Updated scopes in `src/modules/oidc/providers/google.provider.ts`:
- `openid` - OpenID Connect
- `email` - Email address
- `profile` - Basic profile info
- `https://mail.google.com/` - Full Gmail access (read/send/delete)
- `https://www.googleapis.com/auth/gmail.modify` - Read/send/modify Gmail

### Microsoft Mail Scopes
Updated scopes in `src/modules/oidc/providers/microsoft.provider.ts`:
- `openid` - OpenID Connect
- `email` - Email address
- `profile` - Basic profile info
- `offline_access` - Get refresh token
- `https://outlook.office.com/IMAP.AccessAsUser.All` - IMAP access
- `https://outlook.office.com/SMTP.Send` - SMTP send access
- `https://outlook.office.com/Mail.ReadWrite` - Read/write mail via Graph API
- `https://outlook.office.com/Mail.Send` - Send mail via Graph API

## Implementation

### 1. OAuth2 Token Service
Location: `src/modules/email/services/oauth2-token.service.ts`

Key features:
- Save/retrieve OAuth2 tokens
- Check token expiration
- Refresh expired tokens automatically
- Support for Google and Microsoft providers

### 2. IMAP Service
Location: `src/modules/email/services/imap.service.ts`

Key features:
- Connect to IMAP servers using OAuth2
- Fetch emails from mail servers
- Send emails via SMTP
- Auto-refresh expired tokens
- Support for both Google Gmail and Microsoft Outlook

Connection settings:
- **Google Gmail**:
  - IMAP: imap.gmail.com:993 (TLS)
  - SMTP: smtp.gmail.com:587 (STARTTLS)
- **Microsoft Outlook**:
  - IMAP: outlook.office365.com:993 (TLS)
  - SMTP: smtp.office365.com:587 (STARTTLS)

### 3. Email Service Integration
Location: `src/modules/email/email.service.ts`

The EmailService now:
- Checks if user has OAuth2 tokens when fetching emails
- If tokens exist: Fetches real emails from IMAP server
- If no tokens: Falls back to mock data
- Automatically converts IMAP messages to Email entities

### 4. Automatic Token Saving
Location: `src/modules/oidc/oidc.service.ts`

When users sign in with Google/Microsoft:
1. OAuth2 tokens are automatically saved to the database
2. IMAP configuration is created with proper server settings
3. User can immediately access their mail via IMAP

## Usage Flow

### For Users with OAuth2 Login (Google/Microsoft)
1. User logs in with Google/Microsoft
2. OAuth2 tokens are automatically saved
3. When fetching emails:
   - Backend checks for OAuth2 tokens
   - Connects to actual mail server (Gmail/Outlook)
   - Fetches real emails via IMAP
   - Returns real email data to frontend

### For Users with Password Login
1. User logs in with email/password
2. No OAuth2 tokens available
3. When fetching emails:
   - Backend detects no OAuth2 tokens
   - Falls back to mock data
   - Returns mock emails to frontend

## API Endpoints

The existing email endpoints automatically work with both modes:

```
GET /api/mailboxes/:id/emails
```
- If OAuth2 tokens exist: Returns real emails from IMAP
- If no tokens: Returns mock emails

## Token Refresh Flow

1. Before each IMAP operation, check if access token is expired
2. If expired:
   - Use refresh token to get new access token
   - Update database with new access token
   - Continue with IMAP operation
3. If refresh fails:
   - User needs to re-authenticate

## Security Considerations

1. **Token Storage**: All tokens stored encrypted in database (TEXT fields)
2. **Token Expiration**: Automatic refresh before usage
3. **Scopes**: Minimum required scopes for mail operations
4. **TLS**: All IMAP/SMTP connections use TLS encryption
5. **Cascade Delete**: Tokens deleted when user is deleted

## Migration

Run the migration:
```bash
npm run prisma:migrate
```

This creates:
- `oauth2_tokens` table
- `imap_configs` table
- `MailProvider` enum

## Dependencies

Required npm packages (already installed):
- `imap` - IMAP client library
- `nodemailer` - SMTP client library
- `@types/imap` - TypeScript types for IMAP
- `@types/nodemailer` - TypeScript types for nodemailer

## TODO / Known Issues

1. IMAP service needs TypeScript fixes for:
   - Null handling (convert null to undefined)
   - IMAP library import syntax
   - Nodemailer OAuth2 configuration

2. Consider implementing:
   - Email caching to reduce IMAP calls
   - Webhook support for real-time email updates
   - Multiple email account support per user
   - Email search via IMAP SEARCH command
   - Attachment download handling

## Testing

To test the OAuth2 + IMAP flow:

1. Set up Google/Microsoft OAuth2 credentials in `.env`
2. Add required scopes to OAuth2 app configuration
3. Log in with Google/Microsoft
4. Navigate to inbox - should see real emails
5. Log out and log in with password - should see mock emails

## Provider-Specific Setup

### Google Gmail
1. Enable Gmail API in Google Cloud Console
2. Add OAuth2 scopes in consent screen
3. Add authorized redirect URIs
4. Enable "Less secure app access" OR use App Passwords

### Microsoft Outlook
1. Register app in Azure AD
2. Add API permissions for Mail scopes
3. Grant admin consent if required
4. Configure redirect URIs
