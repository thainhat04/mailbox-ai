# Email Module - Provider-Agnostic Architecture

This module provides a scalable, provider-agnostic email system that supports multiple email providers (Gmail, Outlook) through a unified interface.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Email Controller                         │
│                  (HTTP API Endpoints)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Email Service                            │
│           (Business Logic + Provider Routing)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 MailProviderRegistry                         │
│         (Provider Management + Token Handling)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 MailProviderFactory                          │
│              (Creates Provider Instances)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  GmailProvider   │          │ OutlookProvider  │
│  (Gmail API)     │          │  (Graph API)     │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ GmailApiClient   │          │OutlookGraphClient│
│  (HTTP Client)   │          │  (HTTP Client)   │
└──────────────────┘          └──────────────────┘
```

## Key Components

### 1. **Provider Interface** (`IMailProvider`)
- Defines the contract all email providers must implement
- Located in: `interfaces/mail-provider.interface.ts`
- Operations include:
  - Message operations (list, get, send, modify, trash, delete)
  - Thread operations (get, modify, trash)
  - Label operations (list, create, update, delete)
  - Attachment operations (get)
  - Sync operations (watch, sync changes)
  - Profile operations (get profile)

### 2. **Base Provider** (`BaseMailProvider`)
- Abstract base class with common functionality
- Located in: `providers/base-mail.provider.ts`
- Features:
  - Credential validation
  - Token expiry checking
  - Email address parsing/formatting
  - Initialization state management

### 3. **Provider Implementations**

#### Gmail Provider
- Location: `providers/gmail/gmail.provider.ts`
- API Client: `providers/gmail/gmail-api.client.ts`
- Uses: Gmail API v1
- Base URL: `https://gmail.googleapis.com/gmail/v1`

#### Outlook Provider
- Location: `providers/outlook/outlook.provider.ts`
- API Client: `providers/outlook/outlook-graph.client.ts`
- Uses: Microsoft Graph API v1.0
- Base URL: `https://graph.microsoft.com/v1.0`

### 4. **Provider Factory** (`MailProviderFactory`)
- Creates provider instances based on `MailProvider` enum
- Maintains registry of available providers
- Location: `providers/provider.factory.ts`

### 5. **Provider Registry** (`MailProviderRegistry`)
- Manages provider instances with credentials
- Handles token refresh
- Caches initialized providers
- Location: `providers/provider.registry.ts`

### 6. **Email Service** (`EmailService`)
- High-level business logic
- Routes operations to correct provider via registry
- Location: `email.service.new.ts`

## Database Schema

### Core Models

```prisma
User
├── Session (auth tokens)
├── Account (OAuth credentials)
└── EmailAccount (mailbox identity)
    ├── EmailMessage (message metadata)
    │   ├── MessageBody (full content)
    │   └── Attachment (attachments)
    └── Label (labels/categories)
```

### Key Relationships

- **User** ↔ **Account**: One user can have multiple OAuth accounts (Gmail, Outlook)
- **Account** ↔ **EmailAccount**: One-to-one relationship (OAuth credentials to mailbox)
- **EmailAccount** ↔ **EmailMessage**: One-to-many (one mailbox has many messages)
- **EmailMessage** ↔ **MessageBody**: One-to-one (message metadata + full body)

## Usage Examples

### 1. List Messages

```typescript
const messages = await emailService.listMessages(userId, emailAccountId, {
  maxResults: 50,
  labelIds: ['INBOX'],
  query: 'subject:invoice',
});
```

### 2. Send Email

```typescript
const message = await emailService.sendEmail(userId, emailAccountId, {
  to: [{ email: 'user@example.com', name: 'John Doe' }],
  subject: 'Hello',
  bodyHtml: '<p>Hello World</p>',
  bodyText: 'Hello World',
});
```

### 3. Modify Labels

```typescript
await emailService.modifyMessage(userId, emailAccountId, messageId, {
  addLabelIds: ['IMPORTANT'],
  removeLabelIds: ['UNREAD'],
});
```

### 4. Get Provider Directly

```typescript
// Get provider for specific account
const provider = await providerRegistry.getProvider(emailAccountId);

// Use provider methods directly
const profile = await provider.getProfile();
const labels = await provider.listLabels();
```

## Adding New Providers

To add support for a new email provider (e.g., Yahoo Mail, ProtonMail):

1. **Create Provider Class**
   ```typescript
   // providers/yahoo/yahoo.provider.ts
   export class YahooProvider extends BaseMailProvider {
     constructor() {
       super(MailProvider.YAHOO);
     }

     // Implement all IMailProvider methods
   }
   ```

2. **Create API Client**
   ```typescript
   // providers/yahoo/yahoo-api.client.ts
   export class YahooApiClient {
     // HTTP client for Yahoo Mail API
   }
   ```

3. **Register in Factory**
   ```typescript
   // providers/provider.factory.ts
   this.providers.set(MailProvider.YAHOO, () => new YahooProvider());
   ```

4. **Add to Enum**
   ```prisma
   // prisma/schema.prisma
   enum MailProvider {
     GOOGLE
     MICROSOFT
     YAHOO  // Add new provider
   }
   ```

5. **Register in Module**
   ```typescript
   // email.module.ts
   providers: [
     GmailProvider,
     OutlookProvider,
     YahooProvider,  // Add provider
     // ...
   ]
   ```

## Provider Mapping

### Gmail ↔ Outlook Equivalents

| Feature | Gmail | Outlook |
|---------|-------|---------|
| **Labels** | Labels | Categories |
| **Folders** | Labels (system) | Mail Folders |
| **Read Status** | UNREAD label | isRead property |
| **Starred** | STARRED label | flag property |
| **Thread ID** | threadId | conversationId |
| **Sync** | History API | Delta Query |
| **Watch** | Push notifications | Webhooks (subscriptions) |

## DTOs (Data Transfer Objects)

All DTOs are provider-agnostic and located in `dto/provider-agnostic.dto.ts`:

- `ListMessagesDto` - Pagination and filtering
- `SendEmailDto` - Send email request
- `ModifyEmailDto` - Modify labels
- `MarkReadDto` - Mark as read/unread
- `MarkStarredDto` - Star/unstar
- `CreateLabelDto` - Create label
- `UpdateLabelDto` - Update label
- `EmailMessageResponseDto` - Message response
- `LabelResponseDto` - Label response

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Run specific test suite
npm test -- email.service.spec.ts
```

## Future Enhancements

### Phase 1 (Current)
- ✅ Provider abstraction layer
- ✅ Gmail and Outlook skeleton
- ✅ Provider factory and registry
- ✅ Database schema

### Phase 2 (Next)
- [ ] Implement Gmail API methods
- [ ] Implement Outlook Graph API methods
- [ ] OAuth2 token refresh
- [ ] Error handling and retry logic

### Phase 3
- [ ] Message synchronization (incremental sync)
- [ ] Push notifications (Gmail watch, Outlook webhooks)
- [ ] Full-text search
- [ ] Attachment handling

### Phase 4
- [ ] Draft management
- [ ] Smart categorization
- [ ] Email templates
- [ ] Batch operations

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mailbox"

# Google OAuth2
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Microsoft OAuth2
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"

# Gmail Push Notifications
GMAIL_PUBSUB_TOPIC="projects/your-project/topics/gmail"

# Outlook Webhooks
OUTLOOK_WEBHOOK_URL="https://your-domain.com/webhooks/outlook"
```

## API Endpoints

All endpoints require authentication (`@UseGuards(JwtAuthGuard)`).

### Messages
- `GET /api/emails/accounts/:accountId/messages` - List messages
- `GET /api/emails/accounts/:accountId/messages/:id` - Get message
- `POST /api/emails/accounts/:accountId/messages` - Send email
- `PATCH /api/emails/accounts/:accountId/messages/:id` - Modify message
- `POST /api/emails/accounts/:accountId/messages/:id/read` - Mark as read
- `POST /api/emails/accounts/:accountId/messages/:id/star` - Star message
- `DELETE /api/emails/accounts/:accountId/messages/:id` - Delete message

### Threads
- `GET /api/emails/accounts/:accountId/threads/:id` - Get thread
- `DELETE /api/emails/accounts/:accountId/threads/:id` - Delete thread

### Labels
- `GET /api/emails/accounts/:accountId/labels` - List labels
- `POST /api/emails/accounts/:accountId/labels` - Create label
- `PATCH /api/emails/accounts/:accountId/labels/:id` - Update label
- `DELETE /api/emails/accounts/:accountId/labels/:id` - Delete label

### Attachments
- `GET /api/emails/accounts/:accountId/messages/:messageId/attachments/:id` - Get attachment

## License

MIT
