import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import { weeklyDigestEmail, caregiverDigestEmail } from '@/lib/email/templates'
import {
  getPreviousWeekRange,
  getCoachDigests,
  getCaregiverDigests,
} from '@/lib/email/weekly-digest'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { weekStart, weekEnd, label: weekDateRange } = getPreviousWeekRange()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  let coachEmailsSent = 0
  let caregiverEmailsSent = 0
  const errors: string[] = []

  // Send coach digests
  try {
    const coachDigests = await getCoachDigests(weekStart, weekEnd)

    for (const digest of coachDigests) {
      const result = await sendEmail({
        to: digest.coachEmail,
        subject: `Your week: ${digest.totalSessions} session${digest.totalSessions !== 1 ? 's' : ''} logged`,
        html: weeklyDigestEmail({
          coachName: digest.coachName,
          totalSessions: digest.totalSessions,
          athleteNames: digest.athleteNames,
          weekDateRange,
          feedUrl: `${appUrl}/feed`,
        }),
      })

      if (result.success) coachEmailsSent++
      else errors.push(`Coach ${digest.coachEmail}: ${result.error}`)
    }
  } catch (err) {
    errors.push(`Coach digests failed: ${String(err)}`)
  }

  // Send caregiver digests
  try {
    const caregiverDigests = await getCaregiverDigests(weekStart, weekEnd)

    for (const digest of caregiverDigests) {
      const result = await sendEmail({
        to: digest.caregiverEmail,
        subject: `${digest.athleteName}'s week: ${digest.totalSessions} session${digest.totalSessions !== 1 ? 's' : ''}`,
        html: caregiverDigestEmail({
          caregiverName: digest.caregiverName,
          athleteName: digest.athleteName,
          totalSessions: digest.totalSessions,
          totalKm: digest.totalKm,
          milestonesEarned: digest.milestonesEarned,
          nextMilestone: digest.nextMilestone,
          weekDateRange,
          athleteUrl: `${appUrl}/athletes/${digest.athleteId}`,
        }),
      })

      if (result.success) caregiverEmailsSent++
      else errors.push(`Caregiver ${digest.caregiverEmail}: ${result.error}`)
    }
  } catch (err) {
    errors.push(`Caregiver digests failed: ${String(err)}`)
  }

  return NextResponse.json({
    ok: true,
    week: weekDateRange,
    coachEmailsSent,
    caregiverEmailsSent,
    errors: errors.length > 0 ? errors : undefined,
  })
}
