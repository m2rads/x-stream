interface TwitterTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface TwitterUser {
  id: string
  username: string
  name: string
}

interface TwitterTweet {
  id: string
  text: string
  author_id: string
  created_at: string
  in_reply_to_user_id?: string
  referenced_tweets?: Array<{
    type: string
    id: string
  }>
}

export class TwitterAPI {
  private accessToken: string
  private bearerToken: string

  constructor(accessToken?: string, bearerToken?: string) {
    this.accessToken = accessToken || ''
    this.bearerToken = bearerToken || process.env.TWITTER_BEARER_TOKEN || ''
  }

  // Generate OAuth 2.0 with PKCE authorization URL - following X API documentation
  static generateAuthUrl(state: string, codeChallenge: string): string {
    const apiKey = process.env.TWITTER_API_KEY! // This is your client_id
    const redirectUri = process.env.TWITTER_REDIRECT_URI!
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: apiKey,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    // Using correct X API URL as per documentation
    return `https://x.com/i/oauth2/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token (OAuth 2.0 with PKCE) - following X API documentation
  static async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TwitterTokenResponse> {
    const apiKey = process.env.TWITTER_API_KEY!
    const redirectUri = process.env.TWITTER_REDIRECT_URI!

    // Using correct X API token endpoint as per documentation
    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        client_id: apiKey
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange error:', errorText)
      throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  // Get authenticated user info
  async getUser(): Promise<TwitterUser> {
    const response = await fetch('https://api.x.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Get user error:', errorText)
      throw new Error(`Failed to get user: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return data.data
  }

  // Create a tweet or reply
  async createTweet(text: string, replyToTweetId?: string): Promise<TwitterTweet> {
    const body: any = { text }
    
    if (replyToTweetId) {
      body.reply = { in_reply_to_tweet_id: replyToTweetId }
    }

    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Create tweet error:', errorText)
      throw new Error(`Failed to create tweet: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return data.data
  }

  // Start filtered stream (requires Bearer token or user access token)
  async createFilteredStream(rules: string[]): Promise<ReadableStream> {
    // First, add rules to the stream
    await this.addStreamRules(rules)

    const response = await fetch('https://api.x.com/2/tweets/search/stream?tweet.fields=created_at,author_id,in_reply_to_user_id,referenced_tweets&expansions=author_id', {
      headers: {
        'Authorization': `Bearer ${this.bearerToken || this.accessToken}`,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Create stream error:', errorText)
      throw new Error(`Failed to create stream: ${response.statusText} - ${errorText}`)
    }

    return response.body!
  }

  // Add rules to the filtered stream
  async addStreamRules(rules: string[]): Promise<void> {
    const rulesData = {
      add: rules.map((rule, index) => ({
        value: rule,
        tag: `rule_${index}`
      }))
    }

    const response = await fetch('https://api.x.com/2/tweets/search/stream/rules', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken || this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rulesData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Add stream rules error:', errorText)
      throw new Error(`Failed to add stream rules: ${response.statusText} - ${errorText}`)
    }
  }

  // Get current stream rules
  async getStreamRules(): Promise<any> {
    const response = await fetch('https://api.x.com/2/tweets/search/stream/rules', {
      headers: {
        'Authorization': `Bearer ${this.bearerToken || this.accessToken}`,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Get stream rules error:', errorText)
      throw new Error(`Failed to get stream rules: ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  // Refresh access token using refresh token
  static async refreshAccessToken(refreshToken: string): Promise<TwitterTokenResponse> {
    const apiKey = process.env.TWITTER_API_KEY!

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: apiKey
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Refresh token error:', errorText)
      throw new Error(`Failed to refresh token: ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  // Revoke access token
  static async revokeToken(token: string): Promise<void> {
    const apiKey = process.env.TWITTER_API_KEY!

    const response = await fetch('https://api.x.com/2/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: token,
        client_id: apiKey
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Revoke token error:', errorText)
      throw new Error(`Failed to revoke token: ${response.statusText} - ${errorText}`)
    }
  }
}

// Utility functions for PKCE - following X API documentation
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(hash))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
} 