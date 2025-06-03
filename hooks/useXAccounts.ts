import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase, XAccount } from '@/lib/supabase'
import { retryAsync, apiCall, cleanUrlParams } from '@/lib/api-utils'
import { 
  API_ENDPOINTS, 
  URL_PARAMS, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  LOADING_STATES 
} from '@/lib/constants'

interface UseXAccountsReturn {
  accounts: XAccount[]
  loading: boolean
  error: string | null
  connecting: boolean
  disconnecting: number | null
  retrying: boolean
  fetchAccounts: () => Promise<void>
  connectAccount: () => Promise<void>
  disconnectAccount: (accountId: number) => Promise<void>
  clearError: () => void
  retryLastOperation: () => Promise<void>
}

export function useXAccounts(): UseXAccountsReturn {
  const [accounts, setAccounts] = useState<XAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<number | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [lastFailedOperation, setLastFailedOperation] = useState<(() => Promise<void>) | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchAccounts = useCallback(async () => {
    try {
      setError(null)
      
      // Fetch user's accounts via API (which will check session)
      const response = await fetch('/api/accounts')
      
      if (response.status === 401) {
        // Not authenticated, clear accounts
        setAccounts([])
        return
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }
      
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.FETCH_ACCOUNTS_FAILED
      setError(errorMessage)
      setLastFailedOperation(() => fetchAccounts)
      console.error('Error fetching accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const connectAccount = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      // Redirect to OAuth flow
      window.location.href = API_ENDPOINTS.TWITTER_AUTH
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.CONNECTION_FAILED
      setError(errorMessage)
      setLastFailedOperation(() => connectAccount)
      setConnecting(false)
      toast.error(errorMessage)
    }
  }, [])

  const disconnectAccount = useCallback(async (accountId: number) => {
    setDisconnecting(accountId)
    setError(null)
    
    try {
      await retryAsync(async () => {
        await apiCall(API_ENDPOINTS.TWITTER_DISCONNECT, {
          method: 'POST',
          body: JSON.stringify({ accountId }),
        })
      })

      // Refresh accounts list
      await fetchAccounts()
      
      // Check if user still has accounts - if not, they've been logged out
      const accountsResponse = await fetch('/api/accounts')
      if (accountsResponse.status === 401) {
        // User has been logged out (no remaining accounts)
        toast.success('Account disconnected and logged out successfully')
        // Refresh the page to reset the app state
        window.location.href = '/'
        return
      }
      
      toast.success(SUCCESS_MESSAGES.ACCOUNT_DISCONNECTED)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.DISCONNECT_FAILED
      setError(errorMessage)
      setLastFailedOperation(() => disconnectAccount(accountId))
      toast.error(errorMessage)
    } finally {
      setDisconnecting(null)
    }
  }, [fetchAccounts])

  const retryLastOperation = useCallback(async () => {
    if (!lastFailedOperation) return
    
    setRetrying(true)
    setError(null)
    
    try {
      await lastFailedOperation()
      setLastFailedOperation(null)
    } catch (err) {
      // Error handling is already done in the individual operations
    } finally {
      setRetrying(false)
    }
  }, [lastFailedOperation])

  // Handle OAuth success/error from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const connected = urlParams.get(URL_PARAMS.CONNECTED)
    const error = urlParams.get(URL_PARAMS.ERROR)

    if (connected === 'true') {
      toast.success(SUCCESS_MESSAGES.ACCOUNT_CONNECTED)
      fetchAccounts()
      cleanUrlParams([URL_PARAMS.CONNECTED, URL_PARAMS.ERROR])
    } else if (error) {
      const errorMessage = decodeURIComponent(error)
      setError(errorMessage)
      toast.error(errorMessage)
      cleanUrlParams([URL_PARAMS.CONNECTED, URL_PARAMS.ERROR])
    }
  }, [fetchAccounts])

  // Initial fetch
  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    accounts,
    loading,
    error,
    connecting,
    disconnecting,
    retrying,
    fetchAccounts,
    connectAccount,
    disconnectAccount,
    clearError,
    retryLastOperation,
  }
} 