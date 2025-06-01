import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Client for frontend operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations with service role key
// Only create this on the server side
export const createSupabaseAdmin = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Types for our database tables
export interface XAccount {
  id: number
  x_user_id: string
  x_username: string
  is_connected: boolean
  connected_at: string | null
  encrypted_access_token_id: string | null
  encrypted_refresh_token_id: string | null
  token_expires_at: string | null
  created_at: string
  updated_at: string
} 