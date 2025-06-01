import { NextRequest, NextResponse } from 'next/server'
import { TwitterAPI, generateCodeVerifier, generateCodeChallenge } from '@/lib/twitter'

export async function GET(request: NextRequest) {
  try {
    const state = Math.random().toString(36).substring(2, 15)
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    
    console.log('Generated OAuth state:', state)
    console.log('Generated code verifier length:', codeVerifier.length)
    console.log('Generated code challenge length:', codeChallenge.length)
    
    const authUrl = TwitterAPI.generateAuthUrl(state, codeChallenge)
    console.log('Generated auth URL:', authUrl)
    
    // Store state and code verifier in cookies for verification
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('twitter_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    response.cookies.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    
    return response
  } catch (error) {
    console.error('Twitter auth error:', error)
    return NextResponse.json({ error: 'Failed to initiate Twitter authentication', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
} 