import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

export async function GET() {
  const startTime = Date.now()
  console.log('='.repeat(80))
  console.log('🚀 OAUTH INITIATION STARTED')
  console.log('='.repeat(80))
  console.log('Timestamp:', new Date().toISOString())
  console.log('Request URL: /api/auth/twitter')
  
  try {
    // Check environment variables first
    console.log('\n📋 ENVIRONMENT VARIABLES CHECK:')
    console.log('TWITTER_API_KEY present:', !!process.env.TWITTER_API_KEY)
    console.log('TWITTER_API_SECRET present:', !!process.env.TWITTER_API_SECRET)
    console.log('TWITTER_REDIRECT_URI present:', !!process.env.TWITTER_REDIRECT_URI)
    console.log('TWITTER_REDIRECT_URI value:', process.env.TWITTER_REDIRECT_URI)
    console.log('NODE_ENV:', process.env.NODE_ENV)

    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || !process.env.TWITTER_REDIRECT_URI) {
      console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES')
      throw new Error('Missing required Twitter API credentials')
    }

    // OAuth 1.0a Step 1: Get request token
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = Math.random().toString(36).substring(2, 15)
    const callbackUrl = process.env.TWITTER_REDIRECT_URI!
    
    console.log('\n🔐 OAUTH 1.0a PARAMETERS:')
    console.log('oauth_timestamp:', timestamp)
    console.log('oauth_nonce:', nonce)
    console.log('oauth_callback:', callbackUrl)
    console.log('oauth_consumer_key:', process.env.TWITTER_API_KEY?.substring(0, 10) + '...')
    
    // OAuth 1.0a parameters
    const oauthParams = {
      oauth_callback: callbackUrl,
      oauth_consumer_key: process.env.TWITTER_API_KEY!,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_version: '1.0'
    }

    console.log('\n🔧 SIGNATURE GENERATION:')
    
    // Create signature base string
    const paramString = Object.entries(oauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    console.log('Parameter string length:', paramString.length)
    console.log('Parameter string preview:', paramString.substring(0, 100) + '...')
    
    const signatureBase = `POST&${encodeURIComponent('https://api.x.com/oauth/request_token')}&${encodeURIComponent(paramString)}`
    console.log('Signature base length:', signatureBase.length)
    console.log('Signature base preview:', signatureBase.substring(0, 150) + '...')
    
    const signingKey = `${encodeURIComponent(process.env.TWITTER_API_SECRET!)}&`
    console.log('Signing key length:', signingKey.length)
    console.log('Signing key preview:', signingKey.substring(0, 20) + '...')
    
    const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64')
    console.log('Generated signature:', signature.substring(0, 20) + '...')

    // Create Authorization header
    const authHeader = 'OAuth ' + Object.entries({
      ...oauthParams,
      oauth_signature: signature
    }).map(([key, value]) => `${key}="${encodeURIComponent(value)}"`).join(', ')

    console.log('\n📡 X API REQUEST:')
    console.log('URL: https://api.x.com/oauth/request_token')
    console.log('Method: POST')
    console.log('Authorization header length:', authHeader.length)
    console.log('Authorization header preview:', authHeader.substring(0, 100) + '...')

    // Request the request token
    const requestStartTime = Date.now()
    const response = await fetch('https://api.x.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    const requestDuration = Date.now() - requestStartTime

    console.log('\n📥 X API RESPONSE:')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Request duration:', requestDuration + 'ms')
    console.log('Response headers:')
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('\n❌ REQUEST TOKEN FAILED:')
      console.error('Error response body:', errorText)
      console.error('Full response status:', response.status, response.statusText)
      throw new Error(`Request token failed: ${errorText}`)
    }

    const responseText = await response.text()
    console.log('\n✅ REQUEST TOKEN SUCCESS:')
    console.log('Response body:', responseText)
    
    const params = new URLSearchParams(responseText)
    const oauthToken = params.get('oauth_token')
    const oauthTokenSecret = params.get('oauth_token_secret')
    const oauthCallbackConfirmed = params.get('oauth_callback_confirmed')

    console.log('\n🔑 EXTRACTED TOKENS:')
    console.log('oauth_token present:', !!oauthToken)
    console.log('oauth_token value:', oauthToken?.substring(0, 20) + '...')
    console.log('oauth_token_secret present:', !!oauthTokenSecret)
    console.log('oauth_token_secret value:', oauthTokenSecret?.substring(0, 20) + '...')
    console.log('oauth_callback_confirmed:', oauthCallbackConfirmed)

    if (!oauthToken || !oauthTokenSecret) {
      console.error('❌ INVALID RESPONSE: Missing required tokens')
      throw new Error('Invalid response from request token endpoint')
    }

    // Redirect to OAuth 1.0a authenticate endpoint
    const authUrl = `https://api.x.com/oauth/authenticate?oauth_token=${oauthToken}`
    console.log('\n🔄 PREPARING REDIRECT:')
    console.log('Auth URL:', authUrl)
    
    const redirectResponse = NextResponse.redirect(authUrl)
    
    // Store token secret for later use
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600, // 10 minutes
      path: '/',
    }
    
    console.log('\n🍪 SETTING COOKIE:')
    console.log('Cookie name: oauth_token_secret')
    console.log('Cookie value length:', oauthTokenSecret.length)
    console.log('Cookie options:', cookieOptions)
    
    redirectResponse.cookies.set('oauth_token_secret', oauthTokenSecret, cookieOptions)

    const totalDuration = Date.now() - startTime
    console.log('\n✅ OAUTH INITIATION COMPLETED:')
    console.log('Total duration:', totalDuration + 'ms')
    console.log('Redirecting to X authentication page...')
    console.log('='.repeat(80))

    return redirectResponse
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('\n💥 OAUTH INITIATION ERROR:')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Total duration before error:', totalDuration + 'ms')
    console.error('='.repeat(80))
    
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 