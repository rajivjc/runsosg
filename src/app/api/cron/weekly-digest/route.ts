import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import { weeklyDigestEmail, caregiverDigestEmail } from '@/lib/email/templates'
import {
  getPreviousWeekRange,
  getCoachDigests,
  getCaregiverDigests,
} from '@/lib/email/weekly-digest'
import { getCoachDigestData, getCaregiverDigestData } from '@/lib/digest/data'
import { generateCoachNarrative, generateCaregiverNarrative, narrativeToEmailHtml } from '@/lib/digest/narrative'
import { getClub } from '@/lib/club'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === 'true'

  const { weekStart, weekEnd, label: weekDateRange } = getPreviousWeekRange()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const club = await getClub()

  let coachEmailsSent = 0
  let caregiverEmailsSent = 0
  const errors: string[] = []
  const dryRunResults: { to: string; subject: string; html: string }[] = []

  // Send coach digests
  try {
    const coachDigests = await getCoachDigests(weekStart, weekEnd)

    for (const digest of coachDigests) {
      let narrativeHtml = ''
      const digestUrl = `${appUrl}/digest`
      try {
        const narrativeData = await getCoachDigestData(digest.coachUserId)
        if (narrativeData) {
          const narrative = generateCoachNarrative(narrativeData)
          narrativeHtml = narrativeToEmailHtml(narrative)
        }
      } catch {
        // Fall back to current email format — narrativeHtml stays empty
      }

      const subject = `Your week: ${digest.totalSessions} session${digest.totalSessions !== 1 ? 's' : ''} logged`
      const html = weeklyDigestEmail({
        coachName: digest.coachName,
        totalSessions: digest.totalSessions,
        athleteNames: digest.athleteNames,
        weekDateRange,
        feedUrl: `${appUrl}/feed`,
        narrativeHtml,
        digestUrl,
        clubName: club.name,
        tagline: club.tagline ?? undefined,
      })

      if (dryRun) {
        dryRunResults.push({ to: digest.coachEmail, subject, html })
      } else {
        const result = await sendEmail({ to: digest.coachEmail, subject, html })

        if (result.success) coachEmailsSent++
        else errors.push(`Coach ${digest.coachEmail}: ${result.error}`)
      }
    }
  } catch (err) {
    errors.push(`Coach digests failed: ${String(err)}`)
  }

  // Send caregiver digests
  try {
    const caregiverDigests = await getCaregiverDigests(weekStart, weekEnd)

    for (const digest of caregiverDigests) {
      let cgNarrativeHtml = ''
      const cgDigestUrl = `${appUrl}/digest`
      try {
        const cgNarrativeData = await getCaregiverDigestData(digest.caregiverUserId)
        if (cgNarrativeData) {
          const cgNarrative = generateCaregiverNarrative(cgNarrativeData)
          cgNarrativeHtml = narrativeToEmailHtml(cgNarrative)
        }
      } catch {
        // Fall back to current email format
      }

      const subject = `${digest.athleteName}'s week: ${digest.totalSessions} session${digest.totalSessions !== 1 ? 's' : ''}`
      const html = caregiverDigestEmail({
        caregiverName: digest.caregiverName,
        athleteName: digest.athleteName,
        totalSessions: digest.totalSessions,
        totalKm: digest.totalKm,
        milestonesEarned: digest.milestonesEarned,
        nextMilestone: digest.nextMilestone,
        weekDateRange,
        athleteUrl: `${appUrl}/athletes/${digest.athleteId}`,
        narrativeHtml: cgNarrativeHtml,
        digestUrl: cgDigestUrl,
        clubName: club.name,
        tagline: club.tagline ?? undefined,
      })

      if (dryRun) {
        dryRunResults.push({ to: digest.caregiverEmail, subject, html })
      } else {
        const result = await sendEmail({ to: digest.caregiverEmail, subject, html })

        if (result.success) caregiverEmailsSent++
        else errors.push(`Caregiver ${digest.caregiverEmail}: ${result.error}`)
      }
    }
  } catch (err) {
    errors.push(`Caregiver digests failed: ${String(err)}`)
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      week: weekDateRange,
      emails: dryRunResults,
    })
  }

  return NextResponse.json({
    ok: true,
    week: weekDateRange,
    coachEmailsSent,
    caregiverEmailsSent,
    errors: errors.length > 0 ? errors : undefined,
  })
}
