import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/lib/encryption'

export async function POST() {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    const { data: accounts } = await supabaseAdmin
      .from('x_accounts')
      .select('x_username, encrypted_access_token_id')
      .eq('is_connected', true)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No connected accounts found' }, { status: 404 })
    }

    let totalNewReplies = 0
    let rateLimitHit = false
    let rateLimitResetTime = null
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

        // === LOG COMPLETE X API RESPONSE ===
        console.log('='.repeat(50))
        console.log(`X API Response for @${account.x_username}`)
        console.log('='.repeat(50))
        console.log('Status:', response.status)
        console.log('Status Text:', response.statusText)
        console.log('URL:', response.url)
        
        console.log('\n--- ALL RESPONSE HEADERS ---')
        response.headers.forEach((value, key) => {
          console.log(`${key}: ${value}`)
        })
        
        console.log('\n--- RATE LIMIT SPECIFIC HEADERS ---')
        const rateLimitHeaders = [
          'x-rate-limit-limit',
          'x-rate-limit-remaining', 
          'x-rate-limit-reset',
          'x-rate-limit-reset-at',
          'retry-after',
          'x-ratelimit-limit',
          'x-ratelimit-remaining',
          'x-ratelimit-reset',
          'ratelimit-limit',
          'ratelimit-remaining', 
          'ratelimit-reset'
        ]
        
        rateLimitHeaders.forEach(header => {
          const value = response.headers.get(header)
          if (value) {
            console.log(`${header}: ${value}`)
          }
        })
        
        // Clone response to read body without consuming it
        const responseClone = response.clone()
        const responseText = await responseClone.text()
        
        console.log('\n--- RESPONSE BODY ---')
        console.log('Body length:', responseText.length)
        console.log('Body preview (first 500 chars):')
        console.log(responseText.substring(0, 500))
        
        if (responseText.length > 500) {
          console.log('... (truncated)')
        }
        
        console.log('='.repeat(50))

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to search replies for @${account.x_username}:`, errorText)
          
          // Check for rate limit
          if (response.status === 429) {
            rateLimitHit = true
            // Capture the precise reset time from X API
            const resetHeader = response.headers.get('x-rate-limit-reset')
            if (resetHeader) {
              rateLimitResetTime = resetHeader
              console.log('Captured rate limit reset time:', rateLimitResetTime)
            }
          }
          
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

        for (const tweet of tweets) {
          const author = users.find((user: { id: string }) => user.id === tweet.author_id)
          
          const tweetData = {
            x_tweet_id: tweet.id,
            x_author_id: tweet.author_id,
            x_author_username: author?.username || 'unknown',
            encrypted_text: tweet.text,
            in_reply_to_tweet_id: tweet.in_reply_to_user_id,
            status: 'open' as const,
            metadata: {
              target_username: account.x_username,
              conversation_id: tweet.conversation_id,
              tweet_created_at: tweet.created_at,
              raw_data: tweet
            }
          }

          // Store in database using upsert to handle duplicates
          const { error: insertError } = await supabaseAdmin
            .from('x_tweets')
            .upsert(tweetData, { 
              onConflict: 'x_tweet_id',
              ignoreDuplicates: false 
            })

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

    // If rate limit was hit, return 429 status
    if (rateLimitHit) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        totalNewReplies,
        accountResults: results,
        message: 'Rate limit reached. Please wait before checking again.',
        rateLimitResetTime
      }, { status: 429 })
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