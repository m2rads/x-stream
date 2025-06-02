# X Monitor Replies

Monitor replies to your X (Twitter) posts with OAuth 2.0 authentication and real-time polling.

# Features

- **OAuth 2.0 PKCE Authentication** - Secure X account connection
- **Reply Monitoring** - Tracks replies to your posts
- **Rate Limit Handling** - Respects X API limits (1 request/15min)
- **Auto Polling** - Checks for new replies every 15 minutes
- **Privacy Focused** - Complete data deletion on disconnect
- **Real-time UI** - Live countdown and status updates

## Quick Setup

### 1. Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- X Developer account

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp env.example .env.local
```

### 4. Supabase Setup
1. Create new project at [supabase.com](https://supabase.com)
2. Go to Settings → API → Copy your URL and anon key
3. Go to Settings → API → Copy your service role key  
4. Update `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 5. Database Schema
Run these SQL commands in Supabase SQL Editor:

```sql
-- Create x_accounts table
CREATE TABLE x_accounts (
  id SERIAL PRIMARY KEY,
  x_user_id TEXT UNIQUE NOT NULL,
  x_username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  is_connected BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create x_tweets table  
CREATE TABLE x_tweets (
  id SERIAL PRIMARY KEY,
  x_tweet_id TEXT UNIQUE NOT NULL,
  x_author_id TEXT NOT NULL,
  x_author_username TEXT NOT NULL,
  encrypted_text TEXT,
  in_reply_to_tweet_id TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. X API Setup
1. Go to [developer.x.com](https://developer.x.com/en/portal/dashboard)
2. Create new app with OAuth 2.0 enabled
3. Set redirect URI: `http://localhost:3000/api/auth/twitter/callback`
4. Copy Client ID and Client Secret to `.env.local`:
```
TWITTER_CLIENT_ID=your-oauth-client-id
TWITTER_CLIENT_SECRET=your-oauth-client-secret  
TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback
```

### 7. Generate Encryption Key
```bash
openssl rand -hex 32
```
Add to `.env.local`:
```
ENCRYPTION_KEY=your-generated-32-character-key
```

### 8. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Usage

1. Connect your X account
2. App automatically polls for new replies every 15 minutes
3. Manual refresh available anytime (rate limit permitting)
4. View replies with direct links to original posts
5. Disconnect to remove all data completely

## Rate Limits

X API Free Tier: **1 request per 15 minutes**
- Auto-polling respects this limit
- Countdown shows exact time remaining
- Manual polling blocked during rate limit