'use client'

import { useState } from 'react'
import XConnectionCard from '@/components/XConnectionCard'
import StreamControls from '@/components/PollControls'
import RepliesList from '@/components/RepliesList'

export default function Home() {
  const [repliesKey, setRepliesKey] = useState(0)

  const handleRepliesUpdate = () => {
    // Force RepliesList to refresh by changing its key
    setRepliesKey(prev => prev + 1)
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            X Monitor Replies
          </h1>
          <p className="text-muted-foreground">
            Connect your X account to start monitoring replies and mentions using polling
          </p>
        </div>
        
        <XConnectionCard />
        
        <StreamControls onRepliesUpdate={handleRepliesUpdate} />
        
        <RepliesList key={repliesKey} />
      </div>
    </main>
  )
}
