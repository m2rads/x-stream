'use client'

import { useState, useEffect } from 'react'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AlertTriangle, XCircle } from 'lucide-react'
// import { Play, Square, RotateCcw } from 'lucide-react'

interface PollControlsProps {
  onRepliesUpdate: () => void
}

export default function PollControls({ onRepliesUpdate }: PollControlsProps) {
  const [nextPollTime, setNextPollTime] = useState<Date | null>(null)
  const [timeUntilNextPoll, setTimeUntilNextPoll] = useState<string>('Polling...')
  const [autoPollInterval, setAutoPollInterval] = useState<NodeJS.Timeout | null>(null)
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null)

  // Start auto-polling when component mounts
  useEffect(() => {
    startAutoPoll()
    return () => {
      if (autoPollInterval) clearInterval(autoPollInterval)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [])

  const getRateLimitEndTime = () => {
    const lastRateLimit = localStorage.getItem('lastRateLimit')
    if (!lastRateLimit) return null
    
    const rateLimitTime = new Date(lastRateLimit)
    const endTime = new Date(rateLimitTime.getTime() + 15 * 60 * 1000) // 15 minutes later
    
    // Check if rate limit period has expired
    if (endTime.getTime() <= Date.now()) {
      localStorage.removeItem('lastRateLimit')
      return null
    }
    
    return endTime
  }

  const getRateLimitTimeRemaining = () => {
    const endTime = getRateLimitEndTime()
    if (!endTime) return null
    
    const timeDiff = endTime.getTime() - Date.now()
    if (timeDiff <= 0) return null
    
    const minutes = Math.floor(timeDiff / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const startAutoPoll = () => {
    // First, check if we're in a rate limit period
    const rateLimitEndTime = getRateLimitEndTime()
    let nextPollTime: Date

    if (rateLimitEndTime) {
      // If we're rate limited, next poll should be when rate limit expires
      nextPollTime = rateLimitEndTime
      console.log('Rate limit active, next poll at:', nextPollTime)
    } else {
      // No rate limit, poll in 15 minutes
      nextPollTime = new Date()
      nextPollTime.setMinutes(nextPollTime.getMinutes() + 15)
      console.log('No rate limit, next poll in 15 minutes at:', nextPollTime)
    }

    setNextPollTime(nextPollTime)

    // Clear any existing intervals
    if (autoPollInterval) clearInterval(autoPollInterval)
    if (countdownInterval) clearInterval(countdownInterval)

    // Calculate how long until the next poll
    const timeUntilPoll = nextPollTime.getTime() - Date.now()

    // Set up the auto-poll timer
    const pollTimeout = setTimeout(() => {
      performPoll()
      // After polling, set up regular 15-minute intervals
      const pollInterval = setInterval(() => {
        performPoll()
      }, 15 * 60 * 1000)
      setAutoPollInterval(pollInterval)
    }, timeUntilPoll)

    // Store the timeout as an interval for cleanup
    setAutoPollInterval(pollTimeout as any)

    // Start countdown update interval (every second)
    const countdown = setInterval(updateCountdown, 1000)
    setCountdownInterval(countdown)
    
    // Update countdown immediately
    updateCountdown()
  }

  const updateCountdown = () => {
    // First check if we're in a rate limit period (same logic as toast)
    const rateLimitTime = getRateLimitTimeRemaining()
    if (rateLimitTime) {
      setTimeUntilNextPoll(rateLimitTime)
      return
    }

    // If no rate limit, use the regular nextPollTime
    if (!nextPollTime) {
      setTimeUntilNextPoll('15:00') // Default to 15 minutes
      return
    }

    const now = new Date()
    const timeDiff = nextPollTime.getTime() - now.getTime()

    if (timeDiff <= 0) {
      setTimeUntilNextPoll('Checking now...')
      return
    }

    const minutes = Math.floor(timeDiff / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
    setTimeUntilNextPoll(`${minutes}:${seconds.toString().padStart(2, '0')}`)
  }

  const showRateLimitToast = () => {
    const timeRemaining = getRateLimitTimeRemaining()
    const message = timeRemaining 
      ? `Rate limit: 1 request per 15 minutes. ${timeRemaining} left`
      : 'Rate limit: 1 request per 15 minutes. Try again later'
    
    toast.error(message, {
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      duration: 5000,
    })
  }

  const performPoll = async () => {
    try {
      setTimeUntilNextPoll('Checking now...')
      
      const response = await fetch('/api/poll', {
        method: 'POST',
      })

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          // Store the rate limit time
          localStorage.setItem('lastRateLimit', new Date().toISOString())
          showRateLimitToast()
          
          // Restart auto-poll to sync with rate limit
          startAutoPoll()
          return
        } else if (response.status >= 500) {
          toast.error('Server error. Please try again later.', {
            icon: <XCircle className="h-4 w-4 text-red-500" />,
          })
          return
        } else {
          toast.error(`Request failed (${response.status}). Please try again.`, {
            icon: <XCircle className="h-4 w-4 text-red-500" />,
          })
          return
        }
      }

      const data = await response.json()

      if (data.totalNewReplies > 0) {
        toast.success(`Found ${data.totalNewReplies} new replies!`)
        onRepliesUpdate()
      } else {
        toast.info('No new replies found')
      }

      // After successful poll, set next poll time to 15 minutes from now
      const nextTime = new Date()
      nextTime.setMinutes(nextTime.getMinutes() + 15)
      setNextPollTime(nextTime)

    } catch (error) {
      console.error('Poll error:', error)
      toast.error('Failed to check for new replies. Please check your connection.', {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
      })
    }
  }

  const manualPoll = async () => {
    // Check if we're still in rate limit period
    const timeRemaining = getRateLimitTimeRemaining()
    if (timeRemaining) {
      showRateLimitToast()
      return
    }
    
    await performPoll()
    
    // Restart auto-poll timer after manual poll
    startAutoPoll()
  }

  // Export the manual poll function and countdown for use in other components
  return { manualPoll, timeUntilNextPoll }

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