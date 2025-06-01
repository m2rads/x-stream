'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, ExternalLink } from 'lucide-react'

interface Reply {
  id: string
  tweet_id: string
  text: string
  author_username: string
  target_username: string
  tweet_created_at: string
  created_at: string
}

export default function RepliesList() {
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReplies()
  }, [])

  const fetchReplies = async () => {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Recent Replies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading replies...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
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
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Recent Replies
        </CardTitle>
        <CardDescription>
          {replies.length === 0 
            ? 'No replies found yet. Start monitoring to capture new replies.'
            : `${replies.length} replies found`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {replies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No replies yet</p>
            <p className="text-sm">Start monitoring to see new replies here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
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
                      {reply.text}
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
  )
} 