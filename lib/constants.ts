// API Endpoints
export const API_ENDPOINTS = {
  TWITTER_AUTH: '/api/auth/twitter',
  TWITTER_DISCONNECT: '/api/auth/twitter/disconnect',
} as const

// URL Parameters
export const URL_PARAMS = {
  CONNECTED: 'connected',
  ERROR: 'error',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  FETCH_ACCOUNTS_FAILED: 'Failed to fetch connected accounts',
  CONNECTION_FAILED: 'Failed to connect X account',
  DISCONNECT_FAILED: 'Failed to disconnect X account',
  NETWORK_ERROR: 'Network error occurred. Please try again.',
  ACCOUNT_NOT_FOUND: 'Account not found',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  ACCOUNT_CONNECTED: 'X account connected successfully!',
  ACCOUNT_DISCONNECTED: 'X account disconnected and all data removed',
} as const

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1000,
} as const

// Loading States
export const LOADING_STATES = {
  CONNECTING: 'Connecting...',
  DISCONNECTING: 'Disconnecting...',
  LOADING: 'Loading...',
  RETRY: 'Retrying...',
} as const 