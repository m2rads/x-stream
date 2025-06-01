import { NextRequest, NextResponse } from 'next/server'
import { TwitterAPI } from '@/lib/twitter'
import { supabase } from '@/lib/supabase'
import { encryptToken } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    console.log('OAuth callback received:', { code: code ? 'present' : 'missing', state, error })
    
    if (error) {
      console.error('OAuth error from X:', error)
      return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
    }
    
    if (!code || !state) {
      console.error('Missing code or state in callback')
      return NextResponse.redirect(new URL('/?error=missing_code', request.url))
    }
    
    // Verify state and get code verifier
    const storedState = request.cookies.get('twitter_oauth_state')?.value
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value
    
    console.log('Stored state:', storedState, 'Received state:', state)
    console.log('Code verifier available:', codeVerifier ? 'yes' : 'no')
    
    if (!storedState || storedState !== state) {
      console.error('State mismatch:', { stored: storedState, received: state })
      return NextResponse.redirect(new URL('/?error=invalid_state', request.url))
    }
    
    if (!codeVerifier) {
      console.error('Code verifier not found in cookies')
      return NextResponse.redirect(new URL('/?error=missing_verifier', request.url))
    }
    
    console.log('Attempting to exchange code for tokens...')
    
    // Exchange code for tokens using PKCE
    const tokenResponse = await TwitterAPI.exchangeCodeForTokens(code, codeVerifier)
    console.log('Token exchange successful, got access token')
    
    // Get user info
    const twitterAPI = new TwitterAPI(tokenResponse.access_token)
    const user = await twitterAPI.getUser()
    console.log('Got user info:', { id: user.id, username: user.username })
    
    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokenResponse.access_token)
    const encryptedRefreshToken = encryptToken(tokenResponse.refresh_token)
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
    
    console.log('Storing user data in database...')
    
    // Store in database
    const { error: dbError } = await supabase
      .from('x_accounts')
      .upsert({
        x_user_id: user.id,
        x_username: user.username,
        is_connected: true,
        connected_at: new Date().toISOString(),
        encrypted_access_token_id: encryptedAccessToken,
        encrypted_refresh_token_id: encryptedRefreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'x_user_id'
      })
    
    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(new URL('/?error=database_error', request.url))
    }
    
    console.log('User successfully stored in database')
    
    // Clear cookies and redirect to success page
    const response = NextResponse.redirect(new URL('/?connected=true', request.url))
    response.cookies.delete('twitter_oauth_state')
    response.cookies.delete('twitter_code_verifier')
    
    return response
  } catch (error) {
    console.error('Twitter callback error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.redirect(new URL('/?error=callback_failed', request.url))
  }
} 