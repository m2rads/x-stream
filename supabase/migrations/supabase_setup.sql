-- Create the x_accounts table
CREATE TABLE IF NOT EXISTS x_accounts (
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

-- Create the x_tweets table
CREATE TABLE IF NOT EXISTS x_tweets (
    id BIGSERIAL PRIMARY KEY,
    x_tweet_id TEXT UNIQUE NOT NULL,
    x_author_id TEXT NOT NULL,
    x_author_username TEXT NOT NULL,
    encrypted_text TEXT NOT NULL,
    in_reply_to_tweet_id TEXT,
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    assigned_to_clerk_id TEXT,
    assigned_to_ai BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON x_accounts(x_user_id);
CREATE INDEX IF NOT EXISTS idx_x_accounts_connected ON x_accounts(is_connected);
CREATE INDEX IF NOT EXISTS idx_x_tweets_status ON x_tweets(status);
CREATE INDEX IF NOT EXISTS idx_x_tweets_author ON x_tweets(x_author_id);
CREATE INDEX IF NOT EXISTS idx_x_tweets_created ON x_tweets(created_at); 