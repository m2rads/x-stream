'use client'

// import { useState, useEffect } from 'react'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
// import { Play, Square, RotateCcw } from 'lucide-react'

interface PollControlsProps {
  onRepliesUpdate: () => void
}

export default function PollControls({ onRepliesUpdate }: PollControlsProps) {
  // const [isMonitoring, setIsMonitoring] = useState(false)
  // const [lastPollTime, setLastPollTime] = useState<Date | null>(null)
  // const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)
  // const [totalReplies, setTotalReplies] = useState(0)

  // const POLL_INTERVAL_MS = 30000 

  // const startMonitoring = async () => {
  //   try {
  //     // setIsMonitoring(true)
  //     await performPoll()
      
  //     const interval = setInterval(async () => {
  //       await performPoll()
  //     }, POLL_INTERVAL_MS)
      
  //     setPollInterval(interval)
  //     toast.success('Started monitoring for replies')
      
  //   } catch (error) {
  //     console.error('Failed to start monitoring:', error)
  //     toast.error('Failed to start monitoring')
  //     // setIsMonitoring(false)
  //   }
  // }

  // const stopMonitoring = () => {
  //   if (pollInterval) {
  //     clearInterval(pollInterval)
  //     setPollInterval(null)
  //   }
  //   setIsMonitoring(false)
  //   toast.info('Stopped monitoring')
  // }

  const performPoll = async () => {
    try {
      // setLastPollTime(new Date())
      
      const response = await fetch('/api/stream/poll', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.totalNewReplies > 0) {
        // setTotalReplies(prev => prev + data.totalNewReplies)
        toast.success(`Found ${data.totalNewReplies} new replies!`)
        onRepliesUpdate()
      }

    } catch (error) {
      console.error('Poll error:', error)
      toast.error('Failed to check for new replies')
    }
  }

  const manualPoll = async () => {
    // if (!isMonitoring) {
      await performPoll()
    // }
  }

  // useEffect(() => {
  //   return () => {
  //     if (pollInterval) {
  //       clearInterval(pollInterval)
  //     }
  //   }
  // }, [pollInterval])

  // Export the manual poll function for use in other components
  return { manualPoll }

  // Commented out UI - keeping for later use
  /*
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={isMonitoring ? "default" : "secondary"} className="text-xs">
          {isMonitoring ? 'Monitoring' : 'Stopped'}
        </Badge>
        {totalReplies > 0 && (
          <Badge variant="outline" className="text-xs">
            {totalReplies} replies
          </Badge>
        )}
      </div>
      
      <div className="flex gap-1">
        {!isMonitoring ? (
          <Button onClick={startMonitoring} size="sm" className="h-8 px-3">
            <Play className="h-3 w-3 mr-1" />
            Start
          </Button>
        ) : (
          <Button 
            onClick={stopMonitoring} 
            variant="destructive" 
            size="sm"
            className="h-8 px-3"
          >
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
        )}
        
        <Button 
          onClick={manualPoll} 
          variant="outline" 
          size="sm"
          className="h-8 px-3"
          disabled={isMonitoring}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
  */
} 