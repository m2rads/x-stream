'use client'

import { useState } from 'react'
import XConnectionCard from '@/components/XConnectionCard'
import PollControls from '@/components/PollControls'
import RepliesList from '@/components/RepliesList'

export default function Home() {
  const [repliesKey, setRepliesKey] = useState(0)

  const handleRepliesUpdate = () => {
    setRepliesKey(prev => prev + 1)
  }

  const { manualPoll, timeUntilNextPoll, onAccountConnected, onAccountDisconnected } = PollControls({ onRepliesUpdate: handleRepliesUpdate })

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Monitor X Replies
          </h1>
          <p className="text-muted-foreground">
            Connect your X account to start monitoring replies
          </p>
        </div>
        
        <XConnectionCard 
          onAccountConnected={onAccountConnected}
          onAccountDisconnected={onAccountDisconnected} 
        />
        
        <RepliesList 
          key={repliesKey} 
          onRefresh={manualPoll} 
          timeUntilNextPoll={timeUntilNextPoll}
        />
      </div>
    </main>
  )
}
