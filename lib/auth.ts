import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export interface CurrentUser {
  x_user_id: string
  x_username: string
  session_token: string
}

export async function getCurrentUser(request: NextRequest): Promise<CurrentUser | null> {
  try {
    const sessionToken = request.cookies.get('session_token')?.value
    
    if (!sessionToken) {
      return null
    }

    const supabaseAdmin = createSupabaseAdmin()
    
    // Get session and verify it's not expired
    const { data: session, error } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !session) {
      return null
    }

    return {
      x_user_id: session.x_user_id,
      x_username: session.x_username,
      session_token: session.session_token
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<CurrentUser> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
} 