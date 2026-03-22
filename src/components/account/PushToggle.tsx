'use client'

import { useState, useEffect, useCallback } from 'react'

type Props = {
  vapidPublicKey: string
}

type Status = 'loading' | 'unsupported' | 'denied' | 'enabled' | 'disabled'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export default function PushToggle({ vapidPublicKey }: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [isPending, setIsPending] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setStatus(subscription ? 'enabled' : 'disabled')
    } catch {
      setStatus('disabled')
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  async function handleEnable() {
    setIsPending(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const json = subscription.toJSON()
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })

      if (response.ok) {
        setStatus('enabled')
      }
    } catch (err) {
      console.error('Push subscription failed:', err)
    } finally {
      setIsPending(false)
    }
  }

  async function handleDisable() {
    setIsPending(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus('disabled')
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setIsPending(false)
    }
  }

  if (status === 'loading') return null

  if (status === 'unsupported') {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Push Notifications</p>
          <p className="text-xs text-text-hint">Not supported on this browser</p>
        </div>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Push Notifications</p>
          <p className="text-xs text-text-hint">Blocked — enable in browser settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">Push Notifications</p>
        <p className="text-xs text-text-muted">
          {status === 'enabled' ? 'Milestones, alerts & cheers' : 'Get notified for milestones & alerts'}
        </p>
      </div>
      <button
        onClick={status === 'enabled' ? handleDisable : handleEnable}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
          status === 'enabled' ? 'bg-teal-600' : 'bg-surface-alt'
        }`}
        role="switch"
        aria-checked={status === 'enabled'}
        aria-label="Toggle push notifications"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            status === 'enabled' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
