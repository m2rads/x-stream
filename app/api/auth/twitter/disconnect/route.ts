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

    // First, get the account details to find the x_username
    const { data: account, error: accountError } = await supabaseAdmin
      .from('x_accounts')
      .select('x_username, x_user_id')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    console.log(`Disconnecting account: ${account.x_username}`)

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

    if (deleteError) {
      console.error('Error deleting account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      )
    }

    const totalDeleted = (repliesCount || 0) + (authoredCount || 0)
    console.log(`Account @${account.x_username} disconnected successfully. Deleted ${totalDeleted} total tweets.`)

    return NextResponse.json({ 
      success: true, 
      message: `Account disconnected and all data removed successfully. Deleted ${totalDeleted} tweets.`
    })

  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 