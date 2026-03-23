import { adminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { milestoneEmail } from '@/lib/email/templates'
import { getMilestoneDefinitions } from '@/lib/feed/shared-queries'
import { sendPushToUser } from '@/lib/push'
import { getClub } from '@/lib/club'

export async function checkAndAwardMilestones(
  athleteId: string,
  sessionId: string,
  coachUserId?: string
): Promise<number> {
  try {
    // 1. Fetch all active automatic milestone definitions (cached)
    const definitions = await getMilestoneDefinitions()

    if (definitions.length === 0) return 0

    // 2. Fetch existing milestones for this athlete to avoid duplicates
    const { data: existing } = await adminClient
      .from('milestones')
      .select('milestone_definition_id')
      .eq('athlete_id', athleteId)

    const existingDefinitionIds = new Set(
      (existing ?? [])
        .map((m: any) => m.milestone_definition_id)
        .filter(Boolean)
    )

    // 3. Fetch all completed sessions for this athlete ordered by date
    const { data: sessions } = await adminClient
      .from('sessions')
      .select('id, date, distance_km')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .order('date', { ascending: true })

    const allSessions = sessions ?? []
    const sessionCount = allSessions.length

    // Find the current session
    const currentSession = allSessions.find((s: any) => s.id === sessionId)
    const currentDistanceKm: number | null = currentSession?.distance_km ?? null

    // Check if this session is the athlete's longest run ever
    const previousMax = allSessions.reduce((max: number, s: any) => {
      if (s.id === sessionId) return max
      return (s.distance_km ?? 0) > max ? (s.distance_km as number) : max
    }, 0)

    const isLongestRun =
      currentDistanceKm != null &&
      currentDistanceKm > 0 &&
      currentDistanceKm > previousMax

    // 4. Evaluate each definition condition
    const toAward: typeof definitions = []

    for (const def of definitions) {
      if (existingDefinitionIds.has(def.id)) continue

      const condition = def.condition as { metric?: string; threshold?: number } | null
      if (!condition) continue

      if (
        condition.metric === 'session_count' &&
        condition.threshold != null &&
        sessionCount >= condition.threshold
      ) {
        toAward.push(def)
      } else if (
        condition.metric === 'distance_km' &&
        condition.threshold != null &&
        currentDistanceKm != null &&
        currentDistanceKm >= condition.threshold
      ) {
        toAward.push(def)
      } else if (condition.metric === 'longest_run' && isLongestRun) {
        toAward.push(def)
      }
    }

    if (toAward.length === 0) return 0

    // 5. Insert earned milestones
    const achievedAt = new Date().toISOString()
    const inserts = toAward.map((def) => ({
      athlete_id: athleteId,
      milestone_definition_id: def.id,
      label: def.label,
      achieved_at: achievedAt,
      session_id: sessionId,
      awarded_by: coachUserId ?? null,
      share_image_url: null,
    }))

    const { data: insertedMilestones, error } = await adminClient
      .from('milestones')
      .insert(inserts)
      .select('id')
    if (error) {
      console.error('Failed to insert milestones:', error)
      return 0
    }

    // Fetch athlete once for both email and notification use
    const { data: athlete } = await adminClient
      .from('athletes')
      .select('name, caregiver_user_id')
      .eq('id', athleteId)
      .single()

    const athleteName = athlete?.name ?? 'An athlete'

    // Send milestone email to caregiver (if athlete has one linked)
    try {
      if (athlete?.caregiver_user_id) {
        const { data: { user: caregiverAuth } } = await adminClient.auth.admin.getUserById(athlete.caregiver_user_id)
        const { data: coach } = coachUserId
          ? await adminClient.from('users').select('name').eq('id', coachUserId).single()
          : { data: null }
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        const club = await getClub()

        if (caregiverAuth?.email) {
          for (const def of toAward) {
            const date = new Date().toLocaleDateString('en-SG', {
              day: 'numeric', month: 'long', year: 'numeric',
            })
            const milestoneId = insertedMilestones?.[toAward.indexOf(def)]?.id
            await sendEmail({
              to: caregiverAuth.email,
              subject: `${athleteName} achieved a milestone: ${def.label}!`,
              html: milestoneEmail({
                athleteName,
                milestoneLabel: def.label,
                milestoneIcon: def.icon ?? '🏆',
                coachName: coach?.name ?? null,
                date,
                milestoneUrl: `${appUrl}/milestone/${milestoneId ?? ''}`,
                clubName: club.name,
                tagline: club.tagline ?? undefined,
              }),
            })
          }
        }
      }
    } catch (emailErr) {
      // Email failures should not block milestone creation
      console.warn('Milestone email notification failed:', emailErr)
    }

    // 6. Create milestone notifications for the coach
    if (coachUserId) {
      const notificationInserts = toAward.map((def: any) => ({
        user_id: coachUserId,
        type: 'milestone' as const,
        channel: 'in_app' as const,
        payload: {
          athlete_id: athleteId,
          athlete_name: athleteName,
          session_id: sessionId,
          milestone_label: def.label,
          milestone_icon: def.icon,
          message: `${athleteName} earned a milestone: ${def.label}!`,
        },
        read: false,
      }))

      const { error: notifError } = await adminClient
        .from('notifications')
        .insert(notificationInserts)

      if (notifError) {
        console.error('Failed to insert milestone notifications:', notifError)
      }

      // Web push — batch multiple milestones into one message
      try {
        const pushBody = toAward.length === 1
          ? `${athleteName} earned a milestone: ${toAward[0].label}!`
          : `${athleteName} earned ${toAward.length} milestones!`

        await sendPushToUser(coachUserId, {
          title: 'Milestone earned!',
          body: pushBody,
          url: `/athletes/${athleteId}`,
          tag: `milestone-${sessionId}`,
        })

        // Also push to caregiver if linked
        if (athlete?.caregiver_user_id) {
          await sendPushToUser(athlete.caregiver_user_id, {
            title: 'Milestone earned!',
            body: pushBody,
            url: `/feed`,
            tag: `milestone-${sessionId}`,
          })
        }
      } catch (pushErr) {
        // Push failures should not block milestone creation
        console.warn('Milestone push notification failed:', pushErr)
      }
    }

    return toAward.length
  } catch (err) {
    console.error('checkAndAwardMilestones error:', err)
    return 0
  }
}
