import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { decryptToken, encryptText } from '@/lib/encryption'

export async function POST() {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // Get all connected accounts
    const { data: accounts } = await supabaseAdmin
      .from('x_accounts')
      .select('x_username, encrypted_access_token_id')
      .eq('is_connected', true)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No connected accounts found' }, { status: 404 })
    }

    let totalNewReplies = 0
    const results = []

    for (const account of accounts) {
      try {
        const accessToken = decryptToken(account.encrypted_access_token_id!)
        
        // Get the most recent tweet we've stored for this account to avoid duplicates
        const { data: lastTweet } = await supabaseAdmin
          .from('x_tweets')
          .select('x_tweet_id')
          .eq('x_author_username', account.x_username)
          .order('created_at', { ascending: false })
          .limit(1)

        // Search for replies to this user (using free tier search API)
        const searchQuery = `to:${account.x_username}`
        const url = new URL('https://api.twitter.com/2/tweets/search/recent')
        url.searchParams.set('query', searchQuery)
        url.searchParams.set('max_results', '10')
        url.searchParams.set('tweet.fields', 'created_at,author_id,conversation_id,in_reply_to_user_id')
        url.searchParams.set('user.fields', 'username')
        url.searchParams.set('expansions', 'author_id')
        
        // If we have a last tweet, only get newer tweets
        if (lastTweet && lastTweet.length > 0) {
          url.searchParams.set('since_id', lastTweet[0].x_tweet_id)
        }

        console.log(`Searching for replies to @${account.x_username}:`, url.toString())

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to search replies for @${account.x_username}:`, errorText)
          results.push({
            username: account.x_username,
            success: false,
            error: `Search failed: ${response.status}`
          })
          continue
        }

        const data = await response.json()
        const tweets = data.data || []
        const users = data.includes?.users || []

        console.log(`Found ${tweets.length} new replies for @${account.x_username}`)

        // Process and store new replies
        for (const tweet of tweets) {
          // Find the author info
          const author = users.find((user: { id: string }) => user.id === tweet.author_id)
          
          // Encrypt the tweet text
          const encryptedText = encryptText(tweet.text)
          
          // Prepare tweet data for storage (matching existing schema)
          const tweetData = {
            x_tweet_id: tweet.id,
            x_author_id: tweet.author_id,
            x_author_username: author?.username || 'unknown',
            encrypted_text: encryptedText,
            in_reply_to_tweet_id: tweet.in_reply_to_user_id,
            status: 'open' as const,
            metadata: {
              target_username: account.x_username,
              conversation_id: tweet.conversation_id,
              tweet_created_at: tweet.created_at,
              raw_data: tweet
            }
          }

          // Store in database
          const { error: insertError } = await supabaseAdmin
            .from('x_tweets')
            .insert(tweetData)

          if (insertError) {
            console.error('Error storing tweet:', insertError)
          } else {
            totalNewReplies++
          }
        }

        results.push({
          username: account.x_username,
          success: true,
          newReplies: tweets.length
        })

      } catch (error) {
        console.error(`Error processing account @${account.x_username}:`, error)
        results.push({
          username: account.x_username,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalNewReplies,
      accountResults: results,
      message: `Poll completed. Found ${totalNewReplies} new replies across ${accounts.length} accounts.`
    })

  } catch (error) {
    console.error('Polling error:', error)
    return NextResponse.json(
      { error: `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 