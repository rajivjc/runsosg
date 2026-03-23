import { Resend } from 'resend'

// Resend client for sending branded transactional emails.
// Requires RESEND_API_KEY environment variable.
// Falls back gracefully when not configured (dev/preview environments).

let resendClient: Resend | null = null

export function getResend(): Resend | null {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resendClient = new Resend(apiKey)
  return resendClient
}

// TODO: Per-club sender for multi-tenancy
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'Running Club <noreply@example.com>'

type SendEmailParams = {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] Resend not configured — skipping email:', subject)
    return { success: false, error: 'Email not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    })

    if (error) {
      console.error('[email] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[email] Failed to send:', err)
    return { success: false, error: String(err) }
  }
}
