'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MessageCircle, ExternalLink, RotateCcw, Search, X } from 'lucide-react'
import { useXAccounts } from '@/hooks/useXAccounts'

interface Reply {
  id: string
  tweet_id: string
  text: string
  author_username: string
  target_username: string
  tweet_created_at: string
  created_at: string
}

interface RepliesListProps {
  onRefresh?: () => Promise<void>
  timeUntilNextPoll?: string
}

export default function RepliesList({ onRefresh, timeUntilNextPoll }: RepliesListProps) {
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [currentKeyword, setCurrentKeyword] = useState('')
  
  // Get account connection status
  const { accounts, loading: accountsLoading } = useXAccounts()
  const hasConnectedAccounts = accounts.length > 0

  const cleanReplyText = (text: string) => {
    // Remove @username mentions at the beginning of the text
    // This regex matches @username (allowing letters, numbers, underscores) at the start
    // followed by optional whitespace
    return text.replace(/^@\w+\s*/, '').trim()
  }

  // Filter replies based on keywords in real-time
  const filteredReplies = useMemo(() => {
    if (keywords.length === 0) {
      return replies
    }

    return replies.filter(reply => {
      const searchableText = `${cleanReplyText(reply.text)} ${reply.author_username}`.toLowerCase()
      return keywords.some(keyword => 
        searchableText.includes(keyword.toLowerCase())
      )
    })
  }, [replies, keywords])

  const addKeyword = () => {
    const trimmedKeyword = currentKeyword.trim()
    if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
      setKeywords([...keywords, trimmedKeyword])
      setCurrentKeyword('')
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove))
  }

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  useEffect(() => {
    // Only fetch replies if we have connected accounts
    if (hasConnectedAccounts && !accountsLoading) {
      fetchReplies()
    } else if (!accountsLoading) {
      // If no accounts and not loading, clear any existing data
      setReplies([])
      setError(null)
      setLoading(false)
    }
  }, [hasConnectedAccounts, accountsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReplies = async () => {
    // Don't fetch if no accounts connected
    if (!hasConnectedAccounts) {
      setReplies([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/replies')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch replies: ${response.status}`)
      }
      
      const data = await response.json()
      setReplies(data.replies || [])
    } catch (error) {
      console.error('Error fetching replies:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch replies')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      try {
        setRefreshing(true)
        await onRefresh()
        // Refresh the list after polling
        await fetchReplies()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setRefreshing(false)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getTweetUrl = (reply: Reply) => {
    return `https://twitter.com/${reply.author_username}/status/${reply.tweet_id}`
  }

  if (accountsLoading || loading) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Recent Replies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              {accountsLoading ? 'Checking accounts...' : 'Loading replies...'}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Recent Replies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Recent Replies
              </CardTitle>
              <CardDescription>
                {!hasConnectedAccounts 
                  ? 'Connect an account to see replies'
                  : replies.length === 0 
                    ? 'No replies found'
                    : keywords.length === 0
                      ? `${replies.length} replies found`
                      : `${filteredReplies.length} of ${replies.length} replies matching "${keywords.join(', ')}"`
                }
              </CardDescription>
            </div>
            
            {onRefresh && hasConnectedAccounts && (
              <div className="flex items-center gap-3">
                {timeUntilNextPoll && 
                 !timeUntilNextPoll.includes('Connect account') && 
                 !timeUntilNextPoll.includes('Waiting for account') && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    Polling in {timeUntilNextPoll}
                  </span>
                )}
                <Button 
                  onClick={handleRefresh}
                  variant="outline" 
                  size="sm"
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}
          </div>
          
          {/* Keywords filter - only show when we have replies and accounts */}
          {hasConnectedAccounts && replies.length > 0 && (
            <div className="space-y-3">
              {/* Keyword input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Add keyword and press Enter..."
                  value={currentKeyword}
                  onChange={(e) => setCurrentKeyword(e.target.value)}
                  onKeyDown={handleKeywordInputKeyDown}
                  className="pl-10"
                />
              </div>
              
              {/* Active keywords */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <Badge 
                      key={keyword} 
                      variant="secondary" 
                      className="flex items-center gap-1 pr-1"
                    >
                      <span>{keyword}</span>
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        title={`Remove "${keyword}"`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!hasConnectedAccounts ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No account connected</p>
              <p className="text-sm">Connect your X account to start monitoring replies</p>
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No replies yet</p>
              <p className="text-sm">Check for new replies to see them here</p>
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No replies match your keywords</p>
              <p className="text-sm">Try different keywords or clear the filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReplies.map((reply) => (
                <div 
                  key={reply.id} 
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          @{reply.author_username}
                        </Badge>
                        <span className="text-sm text-muted-foreground">→</span>
                        <Badge variant="secondary">
                          @{reply.target_username}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDate(reply.tweet_created_at)}
                        </span>
                      </div>
                      
                      <p className="text-sm leading-relaxed">
                        {cleanReplyText(reply.text)}
                      </p>
                    </div>
                    
                    <a 
                      href={getTweetUrl(reply)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="View on X"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 