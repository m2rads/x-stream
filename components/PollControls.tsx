'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Play, Square, RotateCcw } from 'lucide-react'

interface PollControlsProps {
  onRepliesUpdate: () => void
}

export default function PollControls({ onRepliesUpdate }: PollControlsProps) {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)
  const [totalReplies, setTotalReplies] = useState(0)

  const POLL_INTERVAL_MS = 30000 // Poll every 30 seconds

  const startMonitoring = async () => {
    try {
      setIsMonitoring(true)
      
      // Do initial poll
      await performPoll()
      
      // Set up interval for regular polling
      const interval = setInterval(async () => {
        await performPoll()
      }, POLL_INTERVAL_MS)
      
      setPollInterval(interval)
      toast.success('Started monitoring for replies (polling every 30 seconds)')
      
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      toast.error('Failed to start monitoring')
      setIsMonitoring(false)
    }
  }

  const stopMonitoring = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      setPollInterval(null)
    }
    setIsMonitoring(false)
    toast.info('Stopped monitoring for replies')
  }

  const performPoll = async () => {
    try {
      console.log('Polling for new replies...')
      setLastPollTime(new Date())
      
      const response = await fetch('/api/poll', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('Poll result:', data)

      if (data.totalNewReplies > 0) {
        setTotalReplies(prev => prev + data.totalNewReplies)
        toast.success(`Found ${data.totalNewReplies} new replies!`)
        onRepliesUpdate() // Refresh the replies list
      }

    } catch (error) {
      console.error('Poll error:', error)
      toast.error('Failed to check for new replies')
    }
  }

  const manualPoll = async () => {
    if (!isMonitoring) {
      await performPoll()
    }
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  const formatLastPollTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reply Monitoring</h3>
        <Badge variant={isMonitoring ? "default" : "secondary"}>
          {isMonitoring ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Using polling-based monitoring (compatible with X API Free tier)
        </p>
        <div className="flex items-center gap-4">
          <span>
            Status: {isMonitoring ? 'Checking every 30 seconds' : 'Stopped'}
          </span>
          {lastPollTime && (
            <span>
              Last check: {formatLastPollTime(lastPollTime)}
            </span>
          )}
        </div>
        {totalReplies > 0 && (
          <div className="text-green-600 dark:text-green-400">
            Total replies found: {totalReplies}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isMonitoring ? (
          <Button onClick={startMonitoring} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start Monitoring
          </Button>
        ) : (
          <Button 
            onClick={stopMonitoring} 
            variant="destructive" 
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Monitoring
          </Button>
        )}
        
        <Button 
          onClick={manualPoll} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={isMonitoring}
        >
          <RotateCcw className="h-4 w-4" />
          Check Now
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Note: Polling uses your X API quota (Free tier: 100 posts/month). 
        Each poll checks up to 10 recent replies per connected account.
      </div>
    </div>
  )
} 