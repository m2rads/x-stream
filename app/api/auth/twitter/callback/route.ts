import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { encryptToken } from '@/lib/encryption'
import { generateRandomString } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/?error=missing_parameters', request.url)
    )
  }

  try {
    // Verify state parameter (handle URL encoding)
    const storedState = request.cookies.get('oauth_state')?.value
    const decodedState = decodeURIComponent(state)
    
    console.log('Stored state:', storedState)
    console.log('Received state:', state)
    console.log('Decoded state:', decodedState)
    
    if (!storedState) {
      throw new Error('Missing stored state parameter - cookies may have expired')
    }
    
    if (storedState !== state && storedState !== decodedState) {
      throw new Error(`Invalid state parameter. Expected: ${storedState}, Received: ${state}, Decoded: ${decodedState}`)
    }

    // Get code verifier from cookies
    const codeVerifier = request.cookies.get('oauth_code_verifier')?.value
    if (!codeVerifier) {
      throw new Error('Missing code verifier - cookies may have expired')
    }

    console.log('Code verifier found, proceeding with token exchange')

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.TWITTER_REDIRECT_URI!,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      throw new Error(`Token exchange failed: ${errorData}`)
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    console.log('Token exchange successful, fetching user info')

    // Get user info from X API
    const userResponse = await fetch('https://api.x.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      const userErrorData = await userResponse.text()
      console.error('User info fetch failed:', userErrorData)
      throw new Error('Failed to fetch user info')
    }

    const userData = await userResponse.json()
    const { id: x_user_id, username: x_username } = userData.data

    console.log('User info fetched successfully:', { x_user_id, x_username })

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(access_token)
    const encryptedRefreshToken = refresh_token ? encryptToken(refresh_token) : null

    // Generate session token
    const sessionToken = generateRandomString(64)
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create admin client for server-side database operations
    const supabaseAdmin = createSupabaseAdmin()

    // Store/update account in database with session token
    const { error: dbError } = await supabaseAdmin
      .from('x_accounts')
      .upsert(
        {
          x_user_id,
          x_username,
          is_connected: true,
          connected_at: new Date().toISOString(),
          encrypted_access_token_id: encryptedAccessToken,
          encrypted_refresh_token_id: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          session_token: sessionToken,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'x_user_id',
        }
      )

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to store account data')
    }

    // Create user session
    const { error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .upsert(
        {
          x_user_id,
          x_username,
          session_token: sessionToken,
          expires_at: sessionExpiresAt.toISOString(),
        },
        {
          onConflict: 'session_token',
        }
      )

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      throw new Error('Failed to create user session')
    }

    console.log('Account and session stored successfully in database')

    // Clear OAuth cookies and set session cookie
    const response = NextResponse.redirect(
      new URL('/?connected=true', request.url)
    )
    
    response.cookies.delete('oauth_code_verifier')
    response.cookies.delete('oauth_state')

    // Set session cookie
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('connection_failed')}`, request.url)
    )
  }
} 