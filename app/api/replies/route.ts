import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { decryptText } from '@/lib/encryption'

export async function GET() {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // Get all replies, ordered by most recent first
    const { data: replies, error } = await supabaseAdmin
      .from('x_tweets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) // Limit to 50 most recent replies

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch replies from database' },
        { status: 500 }
      )
    }

    // Transform the data to match the expected format and decrypt text
    const transformedReplies = (replies || []).map(reply => {
      try {
        const decryptedText = decryptText(reply.encrypted_text)
        return {
          id: reply.id,
          tweet_id: reply.x_tweet_id,
          text: decryptedText,
          author_id: reply.x_author_id,
          author_username: reply.x_author_username,
          target_username: reply.metadata?.target_username || 'unknown',
          conversation_id: reply.metadata?.conversation_id,
          in_reply_to_user_id: reply.in_reply_to_tweet_id,
          tweet_created_at: reply.metadata?.tweet_created_at || reply.created_at,
          created_at: reply.created_at,
          status: reply.status
        }
      } catch (decryptError) {
        console.error('Error decrypting tweet text:', decryptError)
        return {
          id: reply.id,
          tweet_id: reply.x_tweet_id,
          text: '[Decryption failed]',
          author_id: reply.x_author_id,
          author_username: reply.x_author_username,
          target_username: reply.metadata?.target_username || 'unknown',
          conversation_id: reply.metadata?.conversation_id,
          in_reply_to_user_id: reply.in_reply_to_tweet_id,
          tweet_created_at: reply.metadata?.tweet_created_at || reply.created_at,
          created_at: reply.created_at,
          status: reply.status
        }
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