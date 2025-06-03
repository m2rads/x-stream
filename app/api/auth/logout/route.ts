import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    
    if (currentUser) {
      const supabaseAdmin = createSupabaseAdmin()
      
      // Delete the current session
      await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('session_token', currentUser.session_token)
      
      console.log(`User @${currentUser.x_username} logged out`)
    }

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    response.cookies.delete('session_token')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    
    // Still clear the cookie even if there's an error
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
    
    response.cookies.delete('session_token')
    return response
  }
} 