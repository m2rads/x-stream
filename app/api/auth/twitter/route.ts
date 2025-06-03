import { NextResponse } from 'next/server'
import { createHash, createHmac } from 'crypto'

export async function GET() {
  try {
    // OAuth 1.0a Step 1: Get request token
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = Math.random().toString(36).substring(2, 15)
    const callbackUrl = process.env.TWITTER_REDIRECT_URI!
    
    // OAuth 1.0a parameters
    const oauthParams = {
      oauth_callback: callbackUrl,
      oauth_consumer_key: process.env.TWITTER_API_KEY!,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0'
    }

    // Create signature base string
    const paramString = Object.entries(oauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    const signatureBase = `POST&${encodeURIComponent('https://api.x.com/oauth/request_token')}&${encodeURIComponent(paramString)}`
    const signingKey = `${encodeURIComponent(process.env.TWITTER_API_SECRET!)}&`
    const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64')

    // Create Authorization header
    const authHeader = 'OAuth ' + Object.entries({
      ...oauthParams,
      oauth_signature: signature
    }).map(([key, value]) => `${key}="${encodeURIComponent(value)}"`).join(', ')

    console.log('Making OAuth 1.0a request token request')

    // Request the request token
    const response = await fetch('https://api.x.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Request token failed:', errorText)
      throw new Error(`Request token failed: ${errorText}`)
    }

    const responseText = await response.text()
    const params = new URLSearchParams(responseText)
    const oauthToken = params.get('oauth_token')
    const oauthTokenSecret = params.get('oauth_token_secret')

    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Invalid response from request token endpoint')
    }

    console.log('Request token obtained, redirecting to authenticate')

    // Redirect to OAuth 1.0a authenticate endpoint
    const authUrl = `https://api.x.com/oauth/authenticate?oauth_token=${oauthToken}&force_login=true`
    
    const redirectResponse = NextResponse.redirect(authUrl)
    
    // Store token secret for later use
    redirectResponse.cookies.set('oauth_token_secret', oauthTokenSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return redirectResponse
  } catch (error) {
    console.error('OAuth 1.0a initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
} 