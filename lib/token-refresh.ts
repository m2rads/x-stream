import { createSupabaseAdmin } from '@/lib/supabase'
import { encryptToken, decryptToken } from '@/lib/encryption'

interface RefreshTokenResult {
  success: boolean
  accessToken?: string
  error?: string
}

export async function refreshAccessToken(xUserId: string): Promise<RefreshTokenResult> {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // Get the account with refresh token
    const { data: account, error: accountError } = await supabaseAdmin
      .from('x_accounts')
      .select('encrypted_refresh_token_id, x_username')
      .eq('x_user_id', xUserId)
      .single()

    if (accountError || !account) {
      return { success: false, error: 'Account not found' }
    }

    if (!account.encrypted_refresh_token_id) {
      return { success: false, error: 'No refresh token available' }
    }

    // Decrypt the refresh token
    const refreshToken = decryptToken(account.encrypted_refresh_token_id)

    console.log(`Refreshing access token for @${account.x_username}`)

    // Call X API to refresh the token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token refresh failed:', errorData)
      return { success: false, error: `Token refresh failed: ${errorData}` }
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token: newRefreshToken, expires_in } = tokens

    // Calculate new expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Encrypt new tokens
    const encryptedAccessToken = encryptToken(access_token)
    const encryptedRefreshToken = newRefreshToken ? encryptToken(newRefreshToken) : account.encrypted_refresh_token_id

    // Update the database with new tokens
    const { error: updateError } = await supabaseAdmin
      .from('x_accounts')
      .update({
        encrypted_access_token_id: encryptedAccessToken,
        encrypted_refresh_token_id: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('x_user_id', xUserId)

    if (updateError) {
      console.error('Failed to update tokens in database:', updateError)
      return { success: false, error: 'Failed to save new tokens' }
    }

    console.log(`Successfully refreshed access token for @${account.x_username}`)
    return { success: true, accessToken: access_token }

  } catch (error) {
    console.error('Token refresh error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getValidAccessToken(xUserId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // Get the account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('x_accounts')
      .select('encrypted_access_token_id, token_expires_at, x_username')
      .eq('x_user_id', xUserId)
      .single()

    if (accountError || !account) {
      console.error('Account not found for token validation')
      return null
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(account.token_expires_at)
    const now = new Date()
    const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds

    if (expiresAt.getTime() - now.getTime() < bufferTime) {
      console.log(`Access token for @${account.x_username} is expired or expiring soon, refreshing...`)
      
      const refreshResult = await refreshAccessToken(xUserId)
      if (!refreshResult.success) {
        console.error(`Failed to refresh token for @${account.x_username}:`, refreshResult.error)
        return null
      }
      
      return refreshResult.accessToken!
    }

    // Token is still valid, decrypt and return
    return decryptToken(account.encrypted_access_token_id)

  } catch (error) {
    console.error('Error getting valid access token:', error)
    return null
  }
} 