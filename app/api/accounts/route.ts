import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data: accounts, error } = await supabase
      .from('x_accounts')
      .select('id, x_user_id, x_username, is_connected, connected_at, token_expires_at, created_at')
      .eq('is_connected', true)
      .order('connected_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }
    
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 