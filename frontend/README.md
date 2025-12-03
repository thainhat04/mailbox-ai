# Mailbox AI - Frontend

A modern, responsive Next.js frontend application for Mailbox AI, providing an intuitive email management interface with OAuth2 authentication, real-time email synchronization, and AI-powered features.

## 🚀 Features

- **Authentication**
  - Email/password login and registration
  - OAuth2 social login (Google, Microsoft)
  - JWT token management
  - Protected routes with automatic redirects
  - Session persistence

- **Email Management**
  - Multi-folder inbox view (Inbox, Sent, Drafts, Trash, etc.)
  - Email list with pagination
  - Email detail view with full content
  - Compose new emails
  - Reply and forward functionality
  - Mark as read/unread
  - Star/unstar emails
  - Delete emails
  - Email search
  - Attachment handling and downloads

- **User Interface**
  - Modern, dark-themed design
  - Responsive layout (mobile and desktop)
  - Three-column layout on desktop (folders, list, detail)
  - Mobile-friendly navigation
  - Real-time updates
  - Optimistic UI updates
  - Loading states and error handling

- **Internationalization**
  - Multi-language support (English, Vietnamese)
  - i18next integration
  - Language detection

- **State Management**
  - Redux Toolkit for global state
  - RTK Query for API calls
  - Jotai for local state
  - Optimistic updates

## 📋 Prerequisites

- Node.js 20+
- npm, yarn, or bun package manager
- Backend API running (see backend README)

## 🛠️ Installation

1. **Install dependencies**
```bash
npm install
# or
yarn install
# or
bun install
```

2. **Setup environment variables**
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:4300
```

3. **Run development server**
```bash
npm run dev
# or
yarn dev
# or
bun dev
```

The application will start on `http://localhost:4300`

## 🚦 Available Scripts

- `npm run dev` - Start development server (port 4300)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── _provider.tsx        # Root providers (Redux, i18n)
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── auth/                # Authentication pages
│   │   ├── login/           # Login page
│   │   ├── sign-up/         # Registration page
│   │   └── callback/        # OAuth callback handler
│   └── inbox/                # Inbox application
│       ├── _components/     # Inbox components
│       │   ├── InboxLayout.tsx
│       │   ├── FolderList.tsx
│       │   ├── EmailList.tsx
│       │   ├── EmailDetail.tsx
│       │   ├── ComposeModal.tsx
│       │   ├── ReplyModal.tsx
│       │   └── ...
│       ├── _services/        # RTK Query API services
│       ├── _types/           # TypeScript types
│       ├── _constants/       # Constants
│       ├── hooks/            # Custom hooks
│       └── page.tsx          # Inbox page
├── components/               # Shared components
│   ├── common/              # Common components
│   ├── layout/              # Layout components
│   ├── provider/            # Context providers
│   ├── routes/              # Route guards
│   └── ui/                  # UI components
├── config/                   # Configuration files
│   └── environment/         # Environment configs
├── constants/                # Application constants
├── services/                 # API service layer
│   ├── baseQuery.ts         # RTK Query base configuration
│   ├── Email/               # Email API services
│   └── User/                # User API services
├── store/                    # Redux store
│   ├── slice/               # Redux slices
│   └── index.ts             # Store configuration
├── hooks/                    # Custom React hooks
├── helper/                   # Helper utilities
│   ├── client-router.ts     # Client-side routing
│   ├── dateFormatter.ts     # Date formatting
│   ├── error/               # Error handling
│   └── toast/               # Toast notifications
├── lib/                      # Library configurations
│   ├── i18n.ts              # i18next configuration
│   ├── lazyload.tsx         # Lazy loading utilities
│   └── utils.ts             # Utility functions
├── types/                    # TypeScript type definitions
├── public/                   # Static assets
│   ├── locales/             # Translation files
│   └── icons/               # Icon assets
└── globals.css               # Global styles
```

## 🎨 UI Components

### Layout Components
- **InboxLayout**: Main three-column layout for inbox
- **AuthLayout**: Authentication page layout
- **HeaderInbox**: Inbox header with user menu

### Email Components
- **FolderList**: Sidebar folder navigation
- **EmailList**: Email list with pagination
- **EmailRow**: Individual email row item
- **EmailDetail**: Full email detail view
- **EmailBody**: Email content renderer
- **EmailToolbar**: Email action toolbar
- **EmailAttachmentItem**: Attachment display and download

### Modal Components
- **ComposeModal**: Compose new email
- **ReplyModal**: Reply to email
- **ForwardModal**: Forward email

### UI Components
- **ButtonAuth**: Authentication buttons
- **ButtonSocial**: Social login buttons
- **InputAuth**: Form input fields
- **CheckBox**: Checkbox component
- **UserMenu**: User dropdown menu
- **LoadingApp**: Loading spinner
- **toast-provider**: Toast notification provider

## 🔌 API Integration

The frontend uses **RTK Query** for API calls with automatic caching and refetching.

### Email Services
Located in `app/inbox/_services/`:
- Email fetching with pagination
- Email detail retrieval
- Email actions (read, unread, star, delete)
- Send, reply, forward emails
- Search functionality

### User Services
Located in `services/User/`:
- Authentication (login, register, logout)
- User profile management
- OAuth2 callback handling

## 🔐 Authentication Flow

1. **Login/Register**: User authenticates via email/password or OAuth2
2. **Token Storage**: JWT tokens stored in Redux state
3. **Protected Routes**: `ProtectRoute` component guards routes
4. **Token Refresh**: Automatic token refresh on expiry
5. **Logout**: Clear tokens and redirect to login

## 🌐 Internationalization

The app supports multiple languages using i18next:

- **English** (`en`)
- **Vietnamese** (`vi`)

Translation files are located in `public/locales/`.

### Usage
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('home.title')}</h1>;
}
```

## 🎯 State Management

### Redux Store
- **Auth Slice**: User authentication state
- **Email Slice**: Email-related state (if needed)
- **RTK Query**: API state and caching

### Local State
- React hooks (`useState`, `useReducer`)
- Jotai atoms for component-level state

## 📱 Responsive Design

- **Desktop (≥768px)**: Three-column layout (folders, list, detail)
- **Mobile (<768px)**: Single-view navigation with back buttons
- Touch-friendly interactions
- Optimized for various screen sizes

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS**: Global styles and animations
- **Dark Theme**: Modern dark color scheme
- **Gradient Backgrounds**: Beautiful gradient overlays

## 🔧 Configuration

### Environment Configuration
Located in `config/environment/`:
- Development settings
- API endpoints
- Feature flags

### API Configuration
Located in `services/baseQuery.ts`:
- Base URL configuration
- Request interceptors
- Error handling
- Token injection

## 🐳 Docker

### Build Image
```bash
docker build -t mailbox-frontend .
```

### Run Container
```bash
docker run -p 4300:4300 --env-file .env.local mailbox-frontend
```

## 📦 Key Dependencies

- **next**: Next.js framework (v16.0.3)
- **react**: React library (v19.2.0)
- **@reduxjs/toolkit**: Redux state management
- **react-redux**: React bindings for Redux
- **axios**: HTTP client
- **i18next**: Internationalization
- **lucide-react**: Icon library
- **tailwindcss**: CSS framework
- **jotai**: Atomic state management

## 🧪 Development Tips

### Adding a New Page
1. Create a new directory in `app/`
2. Add `page.tsx` file
3. Use route guards if needed (`ProtectRoute`, `AuthRoute`)

### Adding API Endpoints
1. Add endpoint in `app/inbox/_services/` or `services/`
2. Use RTK Query `createApi` or extend existing API
3. Export hooks for components

### Adding Translations
1. Add keys to `public/locales/en/translation.json`
2. Add translations to `public/locales/vi/translation.json`
3. Use `useTranslation()` hook in components

### Styling Components
- Use Tailwind utility classes
- Add custom styles in `globals.css` if needed
- Follow existing component patterns

## ⚠️ Important Notes

- The app runs on port **4300** by default (not 3000)
- Backend API must be running and accessible
- OAuth2 callbacks require proper domain configuration
- Protected routes automatically redirect to login
- RTK Query provides automatic caching and refetching
- Optimistic updates are used for better UX

## 🐛 Troubleshooting

### API Connection Issues
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running
- Check CORS configuration in backend

### Authentication Issues
- Clear browser storage
- Check token expiration
- Verify OAuth2 callback URLs

### Build Issues
- Clear `.next` directory
- Reinstall dependencies
- Check Node.js version (20+)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is private and proprietary.
