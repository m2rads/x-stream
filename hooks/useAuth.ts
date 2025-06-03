import { useState, useEffect, useCallback } from 'react'

interface User {
  x_user_id: string
  x_username: string
}

interface UseAuthReturn {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      
      if (response.ok) {
        const data = await response.json()
        setUser({
          x_user_id: data.user.x_user_id,
          x_username: data.user.x_username
        })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      // Redirect to home or refresh
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout on client side anyway
      setUser(null)
      window.location.href = '/'
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return {
    user,
    loading,
    logout,
    checkAuth
  }
} 