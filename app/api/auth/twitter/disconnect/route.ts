import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    // First, get the account details to find the x_user_id
    const { data: account, error: accountError } = await supabaseAdmin
      .from('x_accounts')
      .select('x_user_id')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Delete all associated tweets first
    const { error: tweetsError } = await supabaseAdmin
      .from('x_tweets')
      .delete()
      .eq('x_author_id', account.x_user_id)

    if (tweetsError) {
      console.error('Error deleting tweets:', tweetsError)
      // Continue with account deletion even if tweet deletion fails
    }

    // Delete the account record
    const { error: deleteError } = await supabaseAdmin
      .from('x_accounts')
      .delete()
      .eq('id', accountId)

    if (deleteError) {
      console.error('Error deleting account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account disconnected and all data removed successfully' 
    })

  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 