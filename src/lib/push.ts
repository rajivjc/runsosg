import webpush from 'web-push'
import { adminClient } from '@/lib/supabase/admin'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Check if current time is within quiet hours (10pm–7am SGT).
 * During quiet hours, push notifications are silently skipped.
 */
function isQuietHours(): boolean {
  const sgtHour = new Date().toLocaleString('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'Asia/Singapore',
  })
  const hour = parseInt(sgtHour, 10)
  return hour >= 22 || hour < 7
}

/**
 * Send push notification to a specific user (all their subscriptions).
 * Silently skips during quiet hours and if VAPID keys are not configured.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured — skipping push for user', userId)
    return
  }
  if (isQuietHours()) {
    const sgtHour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Singapore' })
    console.log('[push] Quiet hours (SGT hour:', sgtHour, ') — skipping push for user', userId)
    return
  }

  const { data: subscriptions } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) {
    console.log('[push] No subscriptions found for user', userId)
    return
  }

  console.log('[push] Sending to user', userId, '—', subscriptions.length, 'subscription(s), title:', payload.title)

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag: payload.tag,
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        )
        return 'sent'
      } catch (err: any) {
        // 410 Gone or 404 = subscription expired, clean up
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          console.warn('[push] Subscription expired (status', err.statusCode, ') for user', userId, '— removing')
          await adminClient
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
          return 'expired'
        }
        console.error('[push] Failed to send to user', userId, '— status:', err?.statusCode, 'message:', err?.message)
        return 'error'
      }
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled' && r.value === 'sent').length
  const expired = results.filter(r => r.status === 'fulfilled' && r.value === 'expired').length
  const errors = results.filter(r => r.status === 'fulfilled' && r.value === 'error').length
  console.log('[push] Results for user', userId, '— sent:', sent, 'expired:', expired, 'errors:', errors)
}

/**
 * Send push notification to all active users with a given role.
 * Silently skips during quiet hours and if VAPID keys are not configured.
 */
export async function sendPushToRole(
  role: 'admin' | 'coach' | 'caregiver',
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured — skipping push for role', role)
    return
  }
  if (isQuietHours()) {
    const sgtHour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Singapore' })
    console.log('[push] Quiet hours (SGT hour:', sgtHour, ') — skipping push for role', role)
    return
  }

  const { data: users } = await adminClient
    .from('users')
    .select('id')
    .eq('role', role)
    .eq('active', true)

  if (!users || users.length === 0) {
    console.log('[push] No active users with role', role)
    return
  }

  console.log('[push] Sending to role', role, '—', users.length, 'user(s), title:', payload.title)

  await Promise.allSettled(
    users.map((u) => sendPushToUser(u.id, payload))
  )
}
