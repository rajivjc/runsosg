'use server'

import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/resend'
import { getClub } from '@/lib/club'

type InquiryResult = {
  success: boolean
  error?: string
  rateLimited?: boolean
}

export async function submitClubInquiry(formData: {
  clubName: string
  contactName: string
  email: string
  programmeInfo: string
}): Promise<InquiryResult> {
  const { clubName, contactName, email, programmeInfo } = formData

  // Validate
  if (!clubName.trim() || !contactName.trim() || !email.trim()) {
    return { success: false, error: 'Please fill in all required fields.' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  // Rate limit: 3 submissions per email per hour
  const rl = checkRateLimit(`inquiry:${email.toLowerCase()}`, 3, 3600)
  if (!rl.success) {
    return {
      success: false,
      error: 'You\'ve already submitted an inquiry. We\'ll be in touch soon.',
      rateLimited: true,
    }
  }

  // Insert into database
  const { error: dbError } = await adminClient
    .from('club_inquiries')
    .insert({
      club_name: clubName.trim(),
      contact_name: contactName.trim(),
      email: email.trim().toLowerCase(),
      programme_info: programmeInfo.trim() || null,
    })

  if (dbError) {
    console.error('[inquiry] Database error:', dbError)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  // Send notification email to admin (fire-and-forget)
  const club = await getClub()
  sendEmail({
    to: club.contact_email ?? 'hello@kitarun.com',
    subject: `New club inquiry: ${clubName.trim()}`,
    html: `
      <h2>New Club Inquiry</h2>
      <p><strong>Club name:</strong> ${clubName.trim()}</p>
      <p><strong>Contact:</strong> ${contactName.trim()}</p>
      <p><strong>Email:</strong> ${email.trim()}</p>
      ${programmeInfo.trim() ? `<p><strong>About their programme:</strong></p><p>${programmeInfo.trim()}</p>` : ''}
      <hr />
      <p style="color: #6B7280; font-size: 13px;">This inquiry was submitted via the Kita landing page.</p>
    `,
    replyTo: email.trim(),
    clubName: club.name,
  }).catch((err) => console.error('[inquiry] Email notification failed:', err))

  return { success: true }
}
