import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { TwitterAPI } from '@/lib/twitter'
import { decryptToken } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const { tweetId, replyText, xUserId } = await request.json()
    
    if (!tweetId || !replyText || !xUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Get user's access token
    const { data: account, error: accountError } = await supabase
      .from('x_accounts')
      .select('encrypted_access_token_id')
      .eq('x_user_id', xUserId)
      .single()
    
    if (accountError || !account?.encrypted_access_token_id) {
      return NextResponse.json({ error: 'Account not found or not connected' }, { status: 404 })
    }
    
    // Decrypt access token
    const accessToken = decryptToken(account.encrypted_access_token_id)
    
    // Create Twitter API instance and send reply
    const twitterAPI = new TwitterAPI(accessToken)
    const reply = await twitterAPI.createTweet(replyText, tweetId)
    
    // Update tweet status to closed
    const { error: updateError } = await supabase
      .from('x_tweets')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('x_tweet_id', tweetId)
    
    if (updateError) {
      console.error('Failed to update tweet status:', updateError)
    }
    
    return NextResponse.json({ 
      success: true, 
      reply: {
        id: reply.id,
        text: reply.text
      }
    })
  } catch (error) {
    console.error('Reply error:', error)
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
  }
} 