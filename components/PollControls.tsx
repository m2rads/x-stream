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
  const [timeUntilNextPoll, setTimeUntilNextPoll] = useState<string>('Waiting for account...')
  const [autoPollInterval, setAutoPollInterval] = useState<NodeJS.Timeout | null>(null)
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null)
  const [pollCompleted, setPollCompleted] = useState<number>(0)
  const [hasConnectedAccount, setHasConnectedAccount] = useState<boolean | null>(null)

  // Check if accounts are connected by trying a poll
  const checkAccountConnection = async () => {
    try {
      // Just try the poll endpoint - it will tell us if there are connected accounts
      const response = await fetch('/api/poll', {
        method: 'POST',
      })
      
      if (response.status === 404) {
        // 404 means "No connected accounts found"
        console.log('No connected accounts found')
        setHasConnectedAccount(false)
        return false
      } else if (response.status === 429 || response.ok) {
        // Rate limited or successful = we have connected accounts
        console.log('Connected accounts detected')
        setHasConnectedAccount(true)
        return true
      } else {
        // Other errors might be temporary
        console.log('Unknown status, assuming no connection:', response.status)
        setHasConnectedAccount(false)
        return false
      }
    } catch (error) {
      console.error('Error checking account connection:', error)
      setHasConnectedAccount(false)
      return false
    }
  }

  // Effect to check account connection and start polling
  useEffect(() => {
    const initializePolling = async () => {
      console.log('Checking account connection on mount...')
      setTimeUntilNextPoll('Checking connection...')
      
      // The check itself is a poll, so if it succeeds, we've done our initial poll
      const connected = await checkAccountConnection()
      
      if (connected) {
        console.log('Account connected, starting countdown...')
        // We already polled during the check, so just start the countdown
        setPollCompleted(prev => prev + 1)
      } else {
        console.log('No connected account, waiting...')
        setTimeUntilNextPoll('Connect account to start monitoring')
      }
    }

    initializePolling()
    
    return () => {
      if (autoPollInterval) clearInterval(autoPollInterval)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Effect to restart countdown when polling completes
  useEffect(() => {
    if (pollCompleted > 0 && hasConnectedAccount) {
      console.log('Poll completed, restarting countdown')
      startAutoPoll()
    }
  }, [pollCompleted, hasConnectedAccount]) // eslint-disable-line react-hooks/exhaustive-deps

  const getRateLimitEndTime = () => {
    // First check if we have a precise reset time from API headers
    const resetTime = localStorage.getItem('rateLimitResetTime')
    if (resetTime) {
      const resetDate = new Date(resetTime)
      // Check if reset time has passed
      if (resetDate.getTime() <= Date.now()) {
        localStorage.removeItem('rateLimitResetTime')
        localStorage.removeItem('lastRateLimit')
        return null
      }
      return resetDate
    }
    
    // Fallback to calculated time from lastRateLimit
    const lastRateLimit = localStorage.getItem('lastRateLimit')
    if (!lastRateLimit) return null
    
    const rateLimitTime = new Date(lastRateLimit)
    const endTime = new Date(rateLimitTime.getTime() + 15 * 60 * 1000)
    
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
    console.log('startAutoPoll called')
    
    // Clean up any stale rate limit data on startup
    const lastRateLimit = localStorage.getItem('lastRateLimit')
    if (lastRateLimit) {
      const rateLimitTime = new Date(lastRateLimit)
      const endTime = new Date(rateLimitTime.getTime() + 15 * 60 * 1000)
      if (endTime.getTime() <= Date.now()) {
        console.log('Cleaning up expired rate limit data')
        localStorage.removeItem('lastRateLimit')
      }
    }
    
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
    console.log('Time until next poll (ms):', timeUntilPoll)

    // Set up the auto-poll timer
    const pollTimeout = setTimeout(() => {
      performPoll().then(() => {
        // Trigger countdown restart via state update
        setPollCompleted(prev => prev + 1)
      })
    }, timeUntilPoll)

    // Store the timeout as an interval for cleanup
    setAutoPollInterval(pollTimeout)

    // Start countdown update interval (every second)
    const countdown = setInterval(updateCountdown, 1000)
    setCountdownInterval(countdown)
    
    // Update countdown immediately to show current state
    updateCountdown()
    console.log('Auto-poll setup complete')
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
      console.log('No nextPollTime set, defaulting to 15:00')
      setTimeUntilNextPoll('15:00')
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
    const countdown = `${minutes}:${seconds.toString().padStart(2, '0')}`
    setTimeUntilNextPoll(countdown)
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
    // Don't poll if no account connected
    if (hasConnectedAccount === false) {
      console.log('No connected account, skipping poll')
      setTimeUntilNextPoll('Connect account to start monitoring')
      return
    }

    try {
      setTimeUntilNextPoll('Checking now...')
      
      const response = await fetch('/api/poll', {
        method: 'POST',
      })

      // Log all rate limit related headers
      console.log('=== API Response Headers ===')
      console.log('Status:', response.status)
      console.log('x-rate-limit-limit:', response.headers.get('x-rate-limit-limit'))
      console.log('x-rate-limit-remaining:', response.headers.get('x-rate-limit-remaining'))
      console.log('x-rate-limit-reset:', response.headers.get('x-rate-limit-reset'))
      console.log('x-rate-limit-reset-at:', response.headers.get('x-rate-limit-reset-at'))
      console.log('retry-after:', response.headers.get('retry-after'))
      
      // Log all headers for debugging
      console.log('All headers:')
      response.headers.forEach((value, key) => {
        if (key.includes('rate') || key.includes('limit') || key.includes('retry')) {
          console.log(`  ${key}: ${value}`)
        }
      })
      console.log('========================')

      if (!response.ok) {
        if (response.status === 429) {
          // Store the rate limit time
          localStorage.setItem('lastRateLimit', new Date().toISOString())
          
          // Try to get the response data for precise reset time
          try {
            const errorData = await response.json()
            if (errorData.rateLimitResetTime) {
              const resetTime = new Date(parseInt(errorData.rateLimitResetTime) * 1000)
              localStorage.setItem('rateLimitResetTime', resetTime.toISOString())
              console.log('Using precise X API reset time:', resetTime)
            }
          } catch (e) {
            console.log('Could not parse error response for reset time')
          }
          
          showRateLimitToast()
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
      console.log('Poll response data:', data)

      if (data.totalNewReplies > 0) {
        toast.success(`Found ${data.totalNewReplies} new replies!`)
        onRepliesUpdate()
      } else {
        toast.info('No new replies found')
      }

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
    
    // Trigger countdown restart via state update
    setPollCompleted(prev => prev + 1)
  }

  // Method to call when account gets connected
  const onAccountConnected = async () => {
    console.log('Account connected, starting polling...')
    setHasConnectedAccount(true)
    setTimeUntilNextPoll('Starting initial check...')
    await performPoll()
    setPollCompleted(prev => prev + 1)
  }

  // Export the manual poll function and countdown for use in other components
  return { manualPoll, timeUntilNextPoll, onAccountConnected }

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