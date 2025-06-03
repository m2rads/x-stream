import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    
    // Get only the current user's accounts
    const { data: accounts, error } = await supabaseAdmin
      .from('x_accounts')
      .select('*')
      .eq('x_user_id', currentUser.x_user_id)
      .eq('is_connected', true)
      .order('connected_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || []
    })
  } catch (error) {
    console.error('Error fetching user accounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 