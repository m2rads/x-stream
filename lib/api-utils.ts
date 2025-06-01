import { RETRY_CONFIG, ERROR_MESSAGES } from './constants'

// Generic retry function
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxAttempts: number = RETRY_CONFIG.MAX_ATTEMPTS,
  delay: number = RETRY_CONFIG.DELAY_MS
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxAttempts) {
        throw lastError
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError!
}

// API call wrapper with proper error handling
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    let errorMessage = ERROR_MESSAGES.NETWORK_ERROR
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // If parsing JSON fails, use the default error message
    }
    
    throw new Error(errorMessage)
  }

  return response.json()
}

// Clean URL parameters
export function cleanUrlParams(params: string[]): void {
  const url = new URL(window.location.href)
  params.forEach(param => url.searchParams.delete(param))
  window.history.replaceState({}, document.title, url.pathname)
} 