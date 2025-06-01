# X Monitor - Twitter Reply Management Dashboard

A modern web application built with Next.js and shadcn/ui components that allows you to connect your X/Twitter account, monitor replies to your tweets, and respond to them efficiently.

## Features

- 🔐 **OAuth Integration**: Secure Twitter/X account connection using OAuth 2.0
- 📊 **Dashboard**: Beautiful dashboard showing reply statistics and management
- 💬 **Reply Management**: View, filter, and respond to replies directly from the interface
- 🔒 **Secure Storage**: Encrypted token storage in Supabase database
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- 📱 **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui, Tailwind CSS
- **Database**: Supabase
- **Authentication**: Twitter OAuth 2.0
- **Encryption**: CryptoJS for token encryption
- **Icons**: Lucide React

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (version 18 or higher)
2. **npm** or **yarn** package manager
3. **Supabase account** and project
4. **Twitter Developer Account** with API access

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd x-monitor-replies
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Twitter/X API Configuration  
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Encryption key for storing tokens (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 3. Database Setup

Create the following tables in your Supabase database:

```sql
-- X Accounts table
CREATE TABLE x_accounts (
    id BIGSERIAL PRIMARY KEY,
    x_user_id TEXT UNIQUE NOT NULL,
    x_username TEXT NOT NULL,
    is_connected BOOLEAN DEFAULT true,
    connected_at TIMESTAMP WITH TIME ZONE,
    encrypted_access_token_id TEXT,
    encrypted_refresh_token_id TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- X Tweets table
CREATE TABLE x_tweets (
    id BIGSERIAL PRIMARY KEY,
    x_tweet_id TEXT UNIQUE NOT NULL,
    x_author_id TEXT NOT NULL,
    x_author_username TEXT NOT NULL,
    encrypted_text BYTEA NOT NULL,
    in_reply_to_tweet_id TEXT,
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    assigned_to_clerk_id TEXT,
    assigned_to_ai BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    embedding VECTOR(1536) -- For future AI features
);

-- Indexes for better performance
CREATE INDEX idx_x_accounts_user_id ON x_accounts(x_user_id);
CREATE INDEX idx_x_accounts_connected ON x_accounts(is_connected);
CREATE INDEX idx_x_tweets_status ON x_tweets(status);
CREATE INDEX idx_x_tweets_author ON x_tweets(x_author_id);
CREATE INDEX idx_x_tweets_created ON x_tweets(created_at);
```

### 4. Twitter Developer Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or use an existing one
3. Configure OAuth 2.0 settings:
   - **Callback URL**: `http://localhost:3000/api/auth/twitter/callback`
   - **Website URL**: `http://localhost:3000`
   - **Scopes**: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
4. Copy your Client ID and Client Secret to the environment variables

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect Account**: Click "Connect X Account" to authenticate with Twitter
2. **Monitor Replies**: View incoming replies in the dashboard
3. **Respond**: Click "Reply" on any open tweet to respond directly
4. **Manage Accounts**: Use the settings panel to manage multiple connected accounts

## API Endpoints

- `GET /api/auth/twitter` - Initiate Twitter OAuth
- `GET /api/auth/twitter/callback` - Handle OAuth callback
- `GET /api/accounts` - Get connected accounts
- `GET /api/tweets` - Get monitored tweets
- `POST /api/tweets/reply` - Send a reply to a tweet

## Database Schema

### x_accounts
- Stores connected Twitter accounts with encrypted tokens
- Tracks connection status and token expiration

### x_tweets  
- Stores monitored tweets and replies
- Tracks reply status (open/closed)
- Supports AI assignment and metadata

## Security Features

- **Token Encryption**: All access tokens are encrypted before storage
- **State Verification**: OAuth state parameter prevents CSRF attacks
- **Secure Cookies**: HTTP-only cookies for session management
- **Environment Variables**: Sensitive data stored in environment variables

## Development

### Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/
│   ├── ui/            # shadcn/ui components
│   └── TwitterDashboard.tsx
├── lib/
│   ├── crypto.ts      # Encryption utilities
│   ├── supabase.ts    # Database client
│   ├── twitter.ts     # Twitter API utilities
│   └── utils.ts       # General utilities
└── public/            # Static assets
```

### Adding New Features

1. **Stream Monitoring**: Implement real-time tweet monitoring using Twitter's streaming API
2. **AI Responses**: Add AI-powered automatic responses
3. **Analytics**: Add detailed analytics and reporting
4. **Team Management**: Support for team collaboration

## Troubleshooting

### Common Issues

1. **OAuth Errors**: Ensure callback URL matches exactly in Twitter Developer settings
2. **Database Errors**: Check Supabase connection and table structure
3. **Token Encryption**: Verify ENCRYPTION_KEY is exactly 32 characters
4. **CORS Issues**: Ensure proper domain configuration in production

### Logs

Check the browser console and terminal for detailed error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.
