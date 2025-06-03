import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { encryptToken } from '@/lib/encryption'
import { generateRandomString } from '@/lib/utils'
import { createHmac } from 'crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const oauthToken = searchParams.get('oauth_token')
  const oauthVerifier = searchParams.get('oauth_verifier')
  const denied = searchParams.get('denied')

  console.log('=== OAuth 1.0a Callback Debug Info ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('oauth_token present:', !!oauthToken)
  console.log('oauth_verifier present:', !!oauthVerifier)
  console.log('denied present:', !!denied)

  // Handle user denial
  if (denied) {
    console.log('User denied authorization')
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=access_denied`)
  }

  // Validate required parameters
  if (!oauthToken || !oauthVerifier) {
    console.error('Missing OAuth 1.0a parameters')
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=invalid_request`)
  }

  // Get stored token secret from cookies
  const oauthTokenSecret = request.cookies.get('oauth_token_secret')?.value

  if (!oauthTokenSecret) {
    console.error('Missing OAuth token secret')
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?error=invalid_state`)
  }

  try {
    console.log('Exchanging OAuth 1.0a verifier for access token')

    // OAuth 1.0a Step 3: Exchange verifier for access token
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = Math.random().toString(36).substring(2, 15)
    
    const oauthParams = {
      oauth_consumer_key: process.env.TWITTER_API_KEY!,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
      oauth_version: '1.0'
    }

    // Create signature base string
    const paramString = Object.entries(oauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    const signatureBase = `POST&${encodeURIComponent('https://api.x.com/oauth/access_token')}&${encodeURIComponent(paramString)}`
    const signingKey = `${encodeURIComponent(process.env.TWITTER_API_SECRET!)}&${encodeURIComponent(oauthTokenSecret)}`
    const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64')

    // Create Authorization header
    const authHeader = 'OAuth ' + Object.entries({
      ...oauthParams,
      oauth_signature: signature
    }).map(([key, value]) => `${key}="${encodeURIComponent(value)}"`).join(', ')

    // Exchange for access token
    const tokenResponse = await fetch('https://api.x.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Access token exchange failed:', errorData)
      throw new Error(`Access token exchange failed: ${errorData}`)
    }

    const tokenResponseText = await tokenResponse.text()
    const tokenParams = new URLSearchParams(tokenResponseText)
    
    const accessToken = tokenParams.get('oauth_token')
    const accessTokenSecret = tokenParams.get('oauth_token_secret')
    const userId = tokenParams.get('user_id')
    const screenName = tokenParams.get('screen_name')

    if (!accessToken || !accessTokenSecret || !userId || !screenName) {
      throw new Error('Invalid access token response')
    }

    console.log('Access token obtained, fetching user info')

    // Get user information using OAuth 1.0a
    const userTimestamp = Math.floor(Date.now() / 1000).toString()
    const userNonce = Math.random().toString(36).substring(2, 15)
    
    const userOauthParams = {
      oauth_consumer_key: process.env.TWITTER_API_KEY!,
      oauth_nonce: userNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: userTimestamp,
      oauth_token: accessToken,
      oauth_version: '1.0'
    }

    const userParamString = Object.entries(userOauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    const userSignatureBase = `GET&${encodeURIComponent('https://api.x.com/1.1/account/verify_credentials.json')}&${encodeURIComponent(userParamString)}`
    const userSigningKey = `${encodeURIComponent(process.env.TWITTER_API_SECRET!)}&${encodeURIComponent(accessTokenSecret)}`
    const userSignature = createHmac('sha1', userSigningKey).update(userSignatureBase).digest('base64')

    const userAuthHeader = 'OAuth ' + Object.entries({
      ...userOauthParams,
      oauth_signature: userSignature
    }).map(([key, value]) => `${key}="${encodeURIComponent(value)}"`).join(', ')

    const userResponse = await fetch('https://api.x.com/1.1/account/verify_credentials.json', {
      headers: {
        'Authorization': userAuthHeader
      }
    })

    if (!userResponse.ok) {
      const userError = await userResponse.text()
      console.error('User info fetch failed:', userError)
      throw new Error(`User info fetch failed: ${userError}`)
    }

    const userData = await userResponse.json()
    
    console.log('User data received:', {
      id: userData.id_str,
      username: userData.screen_name,
      name: userData.name
    })

    const supabaseAdmin = createSupabaseAdmin()

    // Check if this X account is already connected
    const { data: existingAccount } = await supabaseAdmin
      .from('x_accounts')
      .select('*')
      .eq('x_user_id', userData.id_str)
      .single()

    if (existingAccount) {
      console.log('Account already exists, updating tokens')
      
      // Update existing account with new tokens
      const { error: updateError } = await supabaseAdmin
        .from('x_accounts')
        .update({
          access_token: encryptToken(accessToken),
          access_token_secret: encryptToken(accessTokenSecret),
          updated_at: new Date().toISOString()
        })
        .eq('x_user_id', userData.id_str)

      if (updateError) {
        console.error('Failed to update existing account:', updateError)
        throw updateError
      }

      // Create/update user session for existing account
      const sessionToken = generateRandomString(32)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      const { error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .upsert({
          user_id: existingAccount.user_id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        })

      if (sessionError) {
        console.error('Failed to create/update session:', sessionError)
        throw sessionError
      }

      const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/`)
      response.cookies.set('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      })

      // Clear OAuth temporary cookies
      response.cookies.delete('oauth_token_secret')

      return response
    }

    // Create new user and account
    console.log('Creating new user and account')

    const userId_new = generateRandomString(16)
    const sessionToken = generateRandomString(32)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Insert new X account
    const { error: accountError } = await supabaseAdmin
      .from('x_accounts')
      .insert({
        user_id: userId_new,
        x_user_id: userData.id_str,
        x_username: userData.screen_name,
        x_display_name: userData.name,
        access_token: encryptToken(accessToken),
        access_token_secret: encryptToken(accessTokenSecret),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (accountError) {
      console.error('Failed to create account:', accountError)
      throw accountError
    }

    // Create user session
    const { error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: userId_new,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      console.error('Failed to create session:', sessionError)
      throw sessionError
    }

    console.log('Account and session created successfully')

    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/`)
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    // Clear OAuth temporary cookies
    response.cookies.delete('oauth_token_secret')

    return response

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/?error=callback_error`
    )
  }
} 