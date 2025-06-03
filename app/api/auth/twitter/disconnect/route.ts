import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    // First, verify that this account belongs to the current user
    const { data: account, error: accountError } = await supabaseAdmin
      .from('x_accounts')
      .select('x_username, x_user_id')
      .eq('id', accountId)
      .eq('x_user_id', currentUser.x_user_id) // Only allow users to disconnect their own accounts
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or not authorized' },
        { status: 404 }
      )
    }

    console.log(`User @${currentUser.x_username} disconnecting account: @${account.x_username}`)

    // Delete all tweets that are replies TO this account (where this account is the target)
    const { error: repliesError, count: repliesCount } = await supabaseAdmin
      .from('x_tweets')
      .delete({ count: 'exact' })
      .eq('metadata->>target_username', account.x_username)

    if (repliesError) {
      console.error('Error deleting reply tweets:', repliesError)
    } else {
      console.log(`Deleted ${repliesCount} reply tweets for @${account.x_username}`)
    }

    // Also delete any tweets authored BY this account (if any exist)
    const { error: authoredError, count: authoredCount } = await supabaseAdmin
      .from('x_tweets')
      .delete({ count: 'exact' })
      .eq('x_author_id', account.x_user_id)

    if (authoredError) {
      console.error('Error deleting authored tweets:', authoredError)
    } else {
      console.log(`Deleted ${authoredCount} authored tweets for @${account.x_username}`)
    }

    // Delete the account record
    const { error: deleteError } = await supabaseAdmin
      .from('x_accounts')
      .delete()
      .eq('id', accountId)
      .eq('x_user_id', currentUser.x_user_id) // Double-check user ownership

    if (deleteError) {
      console.error('Error deleting account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      )
    }

    // If this was the user's only account, also delete their session
    const { data: remainingAccounts } = await supabaseAdmin
      .from('x_accounts')
      .select('id')
      .eq('x_user_id', currentUser.x_user_id)
      .eq('is_connected', true)

    if (!remainingAccounts || remainingAccounts.length === 0) {
      // Delete all sessions for this user
      await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('x_user_id', currentUser.x_user_id)
      
      console.log(`Deleted all sessions for user @${currentUser.x_username} (no accounts remaining)`)
    }

    console.log(`Successfully disconnected account @${account.x_username} for user @${currentUser.x_username}`)

    return NextResponse.json({
      success: true,
      message: 'Account disconnected successfully'
    })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 