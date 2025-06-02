'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { useXAccounts } from '@/hooks/useXAccounts'
import { XAccount } from '@/lib/supabase'
import { LOADING_STATES } from '@/lib/constants'

// Loading spinner component
function LoadingSpinner() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">{LOADING_STATES.LOADING}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Empty state component
function EmptyState({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">No X accounts connected</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Connect your X account to start monitoring replies and mentions
      </p>
      <Button 
        onClick={onConnect} 
        disabled={connecting}
        className="w-full"
        size="lg"
      >
        {connecting ? LOADING_STATES.CONNECTING : 'Connect X Account'}
      </Button>
    </div>
  )
}

// Account item component
function AccountItem({ 
  account, 
  onDisconnect, 
  disconnecting 
}: { 
  account: XAccount
  onDisconnect: (account: XAccount) => void
  disconnecting: boolean
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <div>
          <p className="font-semibold">@{account.x_username}</p>
          <p className="text-xs text-muted-foreground">
            Connected {new Date(account.connected_at!).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          Connected
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDisconnect(account)}
          disabled={disconnecting}
        >
          {disconnecting ? LOADING_STATES.DISCONNECTING : 'Disconnect'}
        </Button>
      </div>
    </div>
  )
}

// Disconnect confirmation dialog component
function DisconnectDialog({
  open,
  onOpenChange,
  account,
  onConfirm,
  disconnecting
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: XAccount | null
  onConfirm: () => void
  disconnecting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect X Account</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to disconnect <strong>@{account?.x_username}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will permanently delete:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                <li>All stored tweets and replies</li>
                <li>Account connection data</li>
                <li>Access tokens</li>
              </ul>
              <p className="text-sm font-medium text-destructive">
                This action cannot be undone.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disconnecting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={disconnecting}
          >
            {disconnecting ? LOADING_STATES.DISCONNECTING : 'Disconnect Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main component
export default function XConnectionCard() {
  const {
    accounts,
    loading,
    error,
    connecting,
    disconnecting,
    retrying,
    connectAccount,
    disconnectAccount,
    clearError,
    retryLastOperation,
  } = useXAccounts()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [accountToDisconnect, setAccountToDisconnect] = useState<XAccount | null>(null)

  const handleDisconnectClick = (account: XAccount) => {
    setAccountToDisconnect(account)
    setDialogOpen(true)
  }

  const handleDisconnectConfirm = async () => {
    if (!accountToDisconnect) return
    
    await disconnectAccount(accountToDisconnect.id)
    setDialogOpen(false)
    setAccountToDisconnect(null)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={retryLastOperation}
            onDismiss={clearError}
            retrying={retrying}
          />
        )}

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Account Connection
            </CardTitle>
            <CardDescription>
              Monitor replies to your posts periodically
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <EmptyState onConnect={connectAccount} connecting={connecting} />
            ) : (
              <div className="space-y-4">
                {/* Connected Accounts */}
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <AccountItem
                      key={account.id}
                      account={account}
                      onDisconnect={handleDisconnectClick}
                      disconnecting={disconnecting === account.id}
                    />
                  ))}
                </div> 
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <DisconnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={accountToDisconnect}
        onConfirm={handleDisconnectConfirm}
        disconnecting={disconnecting !== null}
      />
    </>
  )
} 