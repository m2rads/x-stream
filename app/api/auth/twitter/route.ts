import { NextResponse } from 'next/server'
import { generateRandomString, generateCodeChallenge, generateState } from '@/lib/utils'

export async function GET() {
  try {
    // Generate PKCE parameters
    const codeVerifier = generateRandomString(128)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateState()

    console.log('Generated OAuth parameters:', {
      codeVerifier: codeVerifier.substring(0, 10) + '...',
      codeChallenge: codeChallenge.substring(0, 10) + '...',
      state: state
    })

    // Create authorization URL
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      new URLSearchParams({
        response_type: 'code',
        client_id: process.env.TWITTER_CLIENT_ID!,
        redirect_uri: process.env.TWITTER_REDIRECT_URI!,
        scope: 'tweet.read tweet.write users.read offline.access',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      }).toString()

    console.log('Authorization URL created, redirecting to X')

    // Store PKCE parameters in session/cookies for later verification
    const response = NextResponse.redirect(authUrl)

    // Store PKCE parameters in httpOnly cookies for security
    // Using more lenient cookie settings for development
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600, // 10 minutes
      path: '/', // Ensure cookies are available for all paths
    }

    response.cookies.set('oauth_code_verifier', codeVerifier, cookieOptions)
    response.cookies.set('oauth_state', state, cookieOptions)

    console.log('Cookies set, redirecting user to X authorization')

    return response
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
} 