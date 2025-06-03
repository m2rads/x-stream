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
    
    // Get replies only for the current user (using the target_user_id we now store in metadata)
    const { data: replies, error } = await supabaseAdmin
      .from('x_tweets')
      .select('*')
      .eq('metadata->>target_user_id', currentUser.x_user_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch replies from database' },
        { status: 500 }
      )
    }

    // Transform the data for the frontend
    const transformedReplies = (replies || []).map(reply => ({
      id: reply.id,
      tweet_id: reply.x_tweet_id,
      text: reply.encrypted_text,
      author_username: reply.x_author_username,
      target_username: reply.metadata?.target_username || 'unknown',
      tweet_created_at: reply.metadata?.tweet_created_at || reply.created_at,
      created_at: reply.created_at
    }))

    return NextResponse.json({
      success: true,
      replies: transformedReplies,
      count: transformedReplies.length,
      user: currentUser.x_username
    })

  } catch (error) {
    console.error('Error fetching replies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 