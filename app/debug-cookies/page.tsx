'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugCookiesPage() {
  const [cookies, setCookies] = useState<string>('')
  const [urlParams, setUrlParams] = useState<Record<string, string>>({})

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie)
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search)
    const paramsObj: Record<string, string> = {}
    params.forEach((value, key) => {
      paramsObj[key] = value
    })
    setUrlParams(paramsObj)
  }, [])

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">OAuth Debug Information</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Browser Cookies</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded overflow-auto">
            {cookies || 'No cookies found'}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>URL Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(urlParams, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current URL</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded overflow-auto">
            {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
} 