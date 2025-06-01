'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Twitter, MessageCircle, Send, Settings, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface XAccount {
  id: number
  x_user_id: string
  x_username: string
  is_connected: boolean
  connected_at?: string
  token_expires_at?: string
  created_at: string
}

interface XTweet {
  id: number
  x_tweet_id: string
  x_author_id: string
  x_author_username: string
  encrypted_text: Uint8Array
  in_reply_to_tweet_id?: string
  status: 'open' | 'closed'
  assigned_to_clerk_id?: string
  assigned_to_ai: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  closed_at?: string
}

export default function TwitterDashboard() {
  const [accounts, setAccounts] = useState<XAccount[]>([])
  const [tweets, setTweets] = useState<XTweet[]>([])
  const [selectedAccount, setSelectedAccount] = useState<XAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyingToTweet, setReplyingToTweet] = useState<XTweet | null>(null)

  useEffect(() => {
    fetchAccounts()
    fetchTweets()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      if (data.accounts) {
        setAccounts(data.accounts)
        if (data.accounts.length > 0) {
          setSelectedAccount(data.accounts[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Failed to fetch connected accounts')
    }
  }

  const fetchTweets = async () => {
    try {
      const response = await fetch('/api/tweets')
      const data = await response.json()
      if (data.tweets) {
        setTweets(data.tweets)
      }
    } catch (error) {
      console.error('Failed to fetch tweets:', error)
      toast.error('Failed to fetch tweets')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAccount = () => {
    window.location.href = '/api/auth/twitter'
  }

  const handleReply = async (tweet: XTweet) => {
    if (!replyText.trim() || !selectedAccount) {
      toast.error('Please enter a reply message')
      return
    }

    try {
      const response = await fetch('/api/tweets/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetId: tweet.x_tweet_id,
          replyText: replyText.trim(),
          xUserId: selectedAccount.x_user_id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Reply sent successfully!')
        setReplyText('')
        setReplyingToTweet(null)
        // Refresh tweets to update status
        fetchTweets()
      } else {
        toast.error(data.error || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
      toast.error('Failed to send reply')
    }
  }

  const decryptText = (): string => {
    // For demo purposes, we'll just show placeholder text
    // In a real app, you'd decrypt this properly
    return "This is a sample tweet reply that needs a response..."
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Twitter className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">X Monitor</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {selectedAccount && (
            <Badge variant="secondary" className="text-sm">
              @{selectedAccount.x_username}
            </Badge>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Connected Accounts</SheetTitle>
                <SheetDescription>
                  Manage your connected X/Twitter accounts
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-4 mt-6">
                {accounts.map((account) => (
                  <Card key={account.id} className={`cursor-pointer transition-colors ${
                    selectedAccount?.id === account.id ? 'ring-2 ring-blue-500' : ''
                  }`} onClick={() => setSelectedAccount(account)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">@{account.x_username}</div>
                          <div className="text-sm text-muted-foreground">
                            Connected {new Date(account.connected_at!).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={account.is_connected ? 'default' : 'secondary'}>
                          {account.is_connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button 
                  onClick={handleConnectAccount}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect New Account
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <Twitter className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No Connected Accounts</h2>
            <p className="text-muted-foreground mb-4">
              Connect your X/Twitter account to start monitoring replies
            </p>
            <Button onClick={handleConnectAccount}>
              <Twitter className="h-4 w-4 mr-2" />
              Connect X Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Replies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tweets.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open Replies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {tweets.filter(t => t.status === 'open').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Closed Replies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {tweets.filter(t => t.status === 'closed').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tweets List */}
      {tweets.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Replies</CardTitle>
            <CardDescription>
              Monitor and respond to replies to your tweets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {tweets.map((tweet) => (
                  <Card key={tweet.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">@{tweet.x_author_username}</Badge>
                          <Badge variant={tweet.status === 'open' ? 'destructive' : 'secondary'}>
                            {tweet.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(tweet.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mb-3">{decryptText()}</p>
                        
                        {tweet.status === 'open' && (
                          <Dialog open={replyingToTweet?.id === tweet.id} onOpenChange={(open) => {
                            if (!open) {
                              setReplyingToTweet(null)
                              setReplyText('')
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setReplyingToTweet(tweet)}
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Reply
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reply to @{tweet.x_author_username}</DialogTitle>
                                <DialogDescription>
                                  Write your reply to this tweet
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="p-3 bg-muted rounded-lg">
                                  <p className="text-sm">{decryptText()}</p>
                                </div>
                                
                                <Textarea
                                  placeholder="Write your reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={4}
                                />
                                
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setReplyingToTweet(null)
                                      setReplyText('')
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button onClick={() => handleReply(tweet)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Reply
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {tweet.status === 'closed' && tweet.closed_at && (
                          <p className="text-sm text-muted-foreground">
                            Replied on {new Date(tweet.closed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 