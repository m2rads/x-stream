import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptToken } from '@/lib/encryption'

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
    // Verify state parameter
    const storedState = request.cookies.get('oauth_state')?.value
    if (!storedState || storedState !== state) {
      throw new Error('Invalid state parameter')
    }

    // Get code verifier from cookies
    const codeVerifier = request.cookies.get('oauth_code_verifier')?.value
    if (!codeVerifier) {
      throw new Error('Missing code verifier')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
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
      throw new Error(`Token exchange failed: ${errorData}`)
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    // Get user info from X API
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const userData = await userResponse.json()
    const { id: x_user_id, username: x_username } = userData.data

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(access_token)
    const encryptedRefreshToken = refresh_token ? encryptToken(refresh_token) : null

    // Store/update account in database
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

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL('/?connected=true', request.url)
    )
    
    response.cookies.delete('oauth_code_verifier')
    response.cookies.delete('oauth_state')

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('connection_failed')}`, request.url)
    )
  }
} 