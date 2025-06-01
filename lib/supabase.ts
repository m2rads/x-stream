import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface XAccount {
  id: number
  x_user_id: string
  x_username: string
  is_connected: boolean
  connected_at?: string
  encrypted_access_token_id?: string
  encrypted_refresh_token_id?: string
  token_expires_at?: string
  created_at: string
  updated_at: string
}

export interface XTweet {
  id: number
  x_tweet_id: string
  x_author_id: string
  x_author_username: string
  encrypted_text: Uint8Array
  in_reply_to_tweet_id?: string
  status: 'open' | 'closed'
  assigned_to_clerk_id?: string
  assigned_to_ai: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  closed_at?: string
  embedding?: number[]
} 