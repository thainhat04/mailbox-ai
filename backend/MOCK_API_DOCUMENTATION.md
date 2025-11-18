# Mock Email API Documentation

This document describes the mock email API endpoints available for testing the email dashboard frontend.

## Base URL

All endpoints are prefixed with `/api` and require JWT authentication (except auth endpoints).

## Authentication

All email endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

## Endpoints

### Mailboxes

#### 1. Get All Mailboxes

Get a list of all available mailboxes for the current user.

**Endpoint:** `GET /api/mailboxes`

**Response:**
```json
{
  "success": true,
  "message": "Mailboxes retrieved successfully",
  "data": [
    {
      "id": "inbox",
      "name": "Inbox",
      "type": "inbox",
      "unreadCount": 12,
      "totalCount": 150,
      "icon": "inbox",
      "color": "#1976d2",
      "order": 1
    },
    {
      "id": "starred",
      "name": "Starred",
      "type": "starred",
      "unreadCount": 3,
      "totalCount": 25,
      "icon": "star",
      "color": "#fbc02d",
      "order": 2
    }
    // ... more mailboxes
  ]
}
```

#### 2. Get Mailbox by ID

Get details of a specific mailbox.

**Endpoint:** `GET /api/mailboxes/:id`

**Parameters:**
- `id` (path) - Mailbox ID (e.g., "inbox", "starred", "sent")

**Response:**
```json
{
  "success": true,
  "message": "Mailbox retrieved successfully",
  "data": {
    "id": "inbox",
    "name": "Inbox",
    "type": "inbox",
    "unreadCount": 12,
    "totalCount": 150,
    "icon": "inbox",
    "color": "#1976d2",
    "order": 1
  }
}
```

#### 3. Get Emails in Mailbox

Get paginated list of emails in a specific mailbox.

**Endpoint:** `GET /api/mailboxes/:id/emails`

**Parameters:**
- `id` (path) - Mailbox ID
- `page` (query, optional) - Page number (default: 1)
- `limit` (query, optional) - Items per page (default: 50)
- `unreadOnly` (query, optional) - Filter unread emails only (boolean)
- `starredOnly` (query, optional) - Filter starred emails only (boolean)

**Example:**
```
GET /api/mailboxes/inbox/emails?page=1&limit=20&unreadOnly=true
```

**Response:**
```json
{
  "success": true,
  "message": "Emails retrieved successfully",
  "data": {
    "emails": [
      {
        "id": "e1",
        "from": {
          "name": "Sarah Chen",
          "email": "sarah.chen@techcorp.com"
        },
        "to": [
          {
            "name": "Me",
            "email": "me@example.com"
          }
        ],
        "cc": [
          {
            "name": "John Smith",
            "email": "john.smith@techcorp.com"
          }
        ],
        "subject": "Q4 Project Roadmap Review - Action Required",
        "body": "<div>...</div>",
        "preview": "Hi Team, I hope this email finds you well...",
        "timestamp": "2024-11-18T09:30:00Z",
        "isRead": false,
        "isStarred": true,
        "isImportant": true,
        "mailboxId": "inbox",
        "attachments": [
          {
            "id": "att1",
            "filename": "Q4_Roadmap_2024.pdf",
            "size": 2458624,
            "mimeType": "application/pdf",
            "url": "/api/attachments/att1/download"
          }
        ],
        "labels": ["work", "important"]
      }
      // ... more emails
    ],
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Emails

#### 4. Get Email by ID

Get full details of a specific email.

**Endpoint:** `GET /api/emails/:id`

**Parameters:**
- `id` (path) - Email ID

**Response:**
```json
{
  "success": true,
  "message": "Email retrieved successfully",
  "data": {
    "id": "e1",
    "from": {
      "name": "Sarah Chen",
      "email": "sarah.chen@techcorp.com"
    },
    "to": [
      {
        "name": "Me",
        "email": "me@example.com"
      }
    ],
    "subject": "Q4 Project Roadmap Review",
    "body": "<div>Full HTML email body...</div>",
    "timestamp": "2024-11-18T09:30:00Z",
    "isRead": false,
    "isStarred": true,
    "attachments": [...]
  }
}
```

#### 5. Mark Email as Read

Mark an email as read.

**Endpoint:** `PATCH /api/emails/:id/read`

**Parameters:**
- `id` (path) - Email ID

**Response:**
```json
{
  "success": true,
  "message": "Email marked as read",
  "data": {
    "id": "e1",
    "isRead": true,
    // ... other email fields
  }
}
```

#### 6. Mark Email as Unread

Mark an email as unread.

**Endpoint:** `PATCH /api/emails/:id/unread`

**Parameters:**
- `id` (path) - Email ID

**Response:**
```json
{
  "success": true,
  "message": "Email marked as unread",
  "data": {
    "id": "e1",
    "isRead": false,
    // ... other email fields
  }
}
```

#### 7. Toggle Star

Toggle the star status of an email.

**Endpoint:** `PATCH /api/emails/:id/star`

**Parameters:**
- `id` (path) - Email ID

**Response:**
```json
{
  "success": true,
  "message": "Email star status toggled",
  "data": {
    "id": "e1",
    "isStarred": true,
    // ... other email fields
  }
}
```

#### 8. Delete Email

Delete an email (moves to trash, or permanently deletes if already in trash).

**Endpoint:** `DELETE /api/emails/:id`

**Parameters:**
- `id` (path) - Email ID

**Response:**
```json
{
  "success": true,
  "message": "Email deleted successfully",
  "data": null
}
```

#### 9. Search Emails

Search emails by subject, body, sender name, or sender email.

**Endpoint:** `GET /api/emails/search`

**Parameters:**
- `q` (query) - Search query string

**Example:**
```
GET /api/emails/search?q=project
```

**Response:**
```json
{
  "success": true,
  "message": "Found 5 matching emails",
  "data": [
    {
      "id": "e1",
      "subject": "Q4 Project Roadmap Review",
      // ... email fields
    }
    // ... more matching emails
  ]
}
```

## Mock Data Details

### Available Mailboxes

1. **Inbox** (`id: inbox`) - 12 unread, 150 total
2. **Starred** (`id: starred`) - 3 unread, 25 total
3. **Sent** (`id: sent`) - 0 unread, 87 total
4. **Drafts** (`id: drafts`) - 0 unread, 8 total
5. **Archive** (`id: archive`) - 1 unread, 342 total
6. **Trash** (`id: trash`) - 0 unread, 15 total
7. **Work** (`id: work`, custom) - 5 unread, 45 total
8. **Personal** (`id: personal`, custom) - 2 unread, 38 total

### Sample Email IDs

Here are some email IDs you can use for testing:

- `e1` - Q4 Project Roadmap (unread, starred, with attachments)
- `e2` - GitHub Pull Request notification
- `e3` - Marketing team brand guidelines
- `e4` - AWS billing alert (important)
- `e5` - LinkedIn connection requests
- `e6` - Calendar reminder
- `e7` - Security alert (critical, starred)
- `e8` - HR performance review reminder
- `e9` - Stack Overflow answer notification
- `e10` - npm package update notification
- `e11` - Jira bug assignment (high priority)
- `e12` - Netlify deploy success
- `e20` - Sent email (in sent mailbox)
- `e21` - Sent email with attachment
- `e30` - Starred authentication architecture email
- `e40` - Draft email

### Email Types in Mock Data

The mock data includes realistic examples of:

1. **Work Emails** - Project updates, team communications
2. **GitHub Notifications** - Pull requests, issues
3. **Service Notifications** - AWS, Netlify, npm
4. **Social Media** - LinkedIn notifications
5. **Calendar Events** - Meeting reminders
6. **Security Alerts** - CVE notifications, security updates
7. **HR Communications** - Performance reviews, company announcements
8. **Developer Resources** - Stack Overflow, technical discussions
9. **Sent Items** - Your sent emails
10. **Drafts** - Incomplete emails

### Features Demonstrated

- HTML email bodies with rich formatting
- Multiple recipients (to, cc, bcc)
- File attachments with metadata
- Read/unread status
- Star/important flags
- Labels/tags
- Timestamps
- Email previews
- Responsive pagination

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "statusCode": 404
  }
}
```

Common error codes:
- `404` - Resource not found (mailbox or email)
- `401` - Unauthorized (invalid or missing JWT token)
- `400` - Bad request (invalid parameters)

## Testing Tips

1. **Authentication Flow:**
   - First login via `/auth/login` or `/auth/signin/google`
   - Use the returned `accessToken` for all email API calls
   - Implement token refresh when access token expires

2. **Mailbox Navigation:**
   - Start by fetching all mailboxes with `GET /api/mailboxes`
   - Select a mailbox and fetch emails with `GET /api/mailboxes/:id/emails`
   - Display email list and handle selection

3. **Email Detail:**
   - When user clicks an email, fetch full details with `GET /api/emails/:id`
   - Automatically mark as read with `PATCH /api/emails/:id/read`
   - Update unread counts in the UI

4. **Interactive Features:**
   - Star/unstar emails with `PATCH /api/emails/:id/star`
   - Delete emails with `DELETE /api/emails/:id`
   - Test search functionality with `GET /api/emails/search?q=term`

5. **Pagination:**
   - Test with different page sizes (10, 20, 50)
   - Implement infinite scroll or page navigation
   - Handle empty states

## Swagger Documentation

When the backend is running, you can access interactive API documentation at:

```
http://localhost:3000/api/docs
```

This provides a UI to test all endpoints directly.
