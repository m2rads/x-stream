import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    const { data: replies, error } = await supabaseAdmin
      .from('x_tweets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch replies from database' },
        { status: 500 }
      )
    }

    const transformedReplies = (replies || []).map(reply => {
      return {
        id: reply.id,
        tweet_id: reply.x_tweet_id,
        text: reply.encrypted_text || '[No text]',
        author_id: reply.x_author_id,
        author_username: reply.x_author_username,
        target_username: reply.metadata?.target_username || 'unknown',
        conversation_id: reply.metadata?.conversation_id,
        in_reply_to_user_id: reply.in_reply_to_tweet_id,
        tweet_created_at: reply.metadata?.tweet_created_at || reply.created_at,
        created_at: reply.created_at,
        status: reply.status
      }
    })

    return NextResponse.json({
      success: true,
      replies: transformedReplies,
      count: transformedReplies.length
    })

  } catch (error) {
    console.error('Error fetching replies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    )
  }
} 