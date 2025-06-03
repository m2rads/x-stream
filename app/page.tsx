'use client'

import { useState } from 'react'
import XConnectionCard from '@/components/XConnectionCard'
import PollControls from '@/components/PollControls'
import RepliesList from '@/components/RepliesList'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const [repliesKey, setRepliesKey] = useState(0)
  const { user, loading } = useAuth()

  const handleRepliesUpdate = () => {
    setRepliesKey(prev => prev + 1)
  }

  const { manualPoll, timeUntilNextPoll, onAccountConnected, onAccountDisconnected } = PollControls({ onRepliesUpdate: handleRepliesUpdate })

  const handleAccountDisconnected = () => {
    // Reset polling state
    onAccountDisconnected()
    // Force replies list to refresh/clear
    setRepliesKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Monitor <span className="inline-block"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg></span> Replies
          </h1>
          <p className="text-muted-foreground">
            {user ? `Welcome back, @${user.x_username}` : 'Connect your X account to start monitoring replies'}
          </p>
        </div>
        
        <XConnectionCard 
          onAccountConnected={onAccountConnected}
          onAccountDisconnected={handleAccountDisconnected} 
        />
        
        {user && (
          <RepliesList 
            key={repliesKey} 
            onRefresh={manualPoll} 
            timeUntilNextPoll={timeUntilNextPoll}
          />
        )}
      </div>
    </main>
  )
}
