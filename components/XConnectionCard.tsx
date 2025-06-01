'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { XAccount } from '@/lib/supabase'

export default function XConnectionCard() {
  const [accounts, setAccounts] = useState<XAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  // Fetch connected accounts on component mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  // Check for connection success/error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('connected') === 'true') {
      // Refresh accounts list after successful connection
      fetchAccounts()
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('x_accounts')
        .select('*')
        .eq('is_connected', true)
        .order('connected_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    try {
      // Redirect to OAuth flow
      window.location.href = '/api/auth/twitter'
    } catch (error) {
      console.error('Connection error:', error)
      setConnecting(false)
    }
  }

  const handleDisconnect = async (accountId: number) => {
    try {
      const { error } = await supabase
        .from('x_accounts')
        .update({ is_connected: false })
        .eq('id', accountId)

      if (error) throw error
      await fetchAccounts()
    } catch (error) {
      console.error('Disconnect error:', error)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          X Account Connection
        </CardTitle>
        <CardDescription>
          Connect your X account to monitor replies and mentions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              No X accounts connected
            </p>
            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="w-full"
            >
              {connecting ? 'Connecting...' : 'Connect X Account'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div 
                key={account.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">@{account.x_username}</p>
                    <p className="text-xs text-muted-foreground">
                      Connected {new Date(account.connected_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Connected</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(account.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              variant="outline"
              className="w-full"
            >
              {connecting ? 'Connecting...' : 'Connect Another Account'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 