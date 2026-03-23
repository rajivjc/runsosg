// HTML email templates
// Uses inline styles for maximum email client compatibility

const BRAND_COLOR = '#0D9488'
const BRAND_DARK = '#1A1A2E'
const BG_COLOR = '#FBF9F7'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function layout(content: string, clubName: string = 'Running Club', tagline: string = 'Growing Together'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="font-size:16px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:2px;">
              ${escapeHtml(clubName)}
            </td>
          </tr>
        </table>
        <!-- Content -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 24px;">
              ${content}
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
          <tr>
            <td style="font-size:12px;color:#9CA3AF;text-align:center;">
              ${escapeHtml(clubName)} — ${escapeHtml(tagline)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function milestoneEmail({
  athleteName,
  milestoneLabel,
  milestoneIcon,
  coachName,
  date,
  milestoneUrl,
  clubName,
  tagline,
}: {
  athleteName: string
  milestoneLabel: string
  milestoneIcon: string
  coachName: string | null
  date: string
  milestoneUrl: string
  clubName?: string
  tagline?: string
}): string {
  return layout(`
    <div style="text-align:center;">
      <div style="font-size:64px;line-height:1;margin-bottom:16px;">${milestoneIcon}</div>
      <p style="font-size:12px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0;">
        Milestone Achieved
      </p>
      <h1 style="font-size:28px;font-weight:700;color:${BRAND_DARK};margin:0 0 4px 0;">${escapeHtml(athleteName)}</h1>
      <p style="font-size:20px;font-weight:600;color:${BRAND_COLOR};margin:0 0 16px 0;">${escapeHtml(milestoneLabel)}</p>
      <p style="font-size:14px;color:#9CA3AF;margin:0 0 4px 0;">${date}</p>
      ${coachName ? `<p style="font-size:14px;color:#9CA3AF;margin:0;">Coached by ${escapeHtml(coachName)}</p>` : ''}
      <div style="margin-top:24px;">
        <a href="${milestoneUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
          View Milestone
        </a>
      </div>
    </div>
  `, clubName, tagline)
}

export function weeklyDigestEmail({
  coachName,
  totalSessions,
  athleteNames,
  weekDateRange,
  feedUrl,
  narrativeHtml,
  digestUrl,
  clubName,
  tagline,
}: {
  coachName: string
  totalSessions: number
  athleteNames: string[]
  weekDateRange: string
  feedUrl: string
  narrativeHtml?: string
  digestUrl?: string
  clubName?: string
  tagline?: string
}): string {
  // If narrative HTML is available, use the enhanced email
  if (narrativeHtml) {
    return layout(`
      <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 8px 0;">
        Hey ${escapeHtml(coachName)}, here&rsquo;s your week
      </h1>
      <p style="font-size:14px;color:#6B7280;margin:0 0 20px 0;">${weekDateRange}</p>
      ${narrativeHtml}
      <div style="text-align:center;margin-top:24px;">
        <a href="${digestUrl ?? feedUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
          Read full notes in the app
        </a>
      </div>
    `, clubName, tagline)
  }

  // Fallback: data-forward email
  const athleteList = athleteNames.map(n => `<li style="margin-bottom:4px;">${escapeHtml(n)}</li>`).join('')

  return layout(`
    <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 8px 0;">
      Hey ${escapeHtml(coachName)}, here&rsquo;s your week
    </h1>
    <p style="font-size:14px;color:#6B7280;margin:0 0 20px 0;">${weekDateRange}</p>
    <div style="background-color:#F0FDFA;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="font-size:32px;font-weight:700;color:${BRAND_DARK};margin:0;">${totalSessions}</p>
      <p style="font-size:14px;color:#6B7280;margin:4px 0 0 0;">session${totalSessions !== 1 ? 's' : ''} logged</p>
    </div>
    ${athleteNames.length > 0 ? `
      <p style="font-size:14px;font-weight:600;color:${BRAND_DARK};margin:0 0 8px 0;">Athletes you coached:</p>
      <ul style="font-size:14px;color:#4B5563;margin:0 0 20px 0;padding-left:20px;">${athleteList}</ul>
    ` : ''}
    <div style="text-align:center;">
      <a href="${feedUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
        View Club Feed
      </a>
    </div>
  `, clubName, tagline)
}

export function caregiverDigestEmail({
  caregiverName,
  athleteName,
  totalSessions,
  totalKm,
  milestonesEarned,
  nextMilestone,
  weekDateRange,
  athleteUrl,
  narrativeHtml,
  digestUrl,
  clubName,
  tagline,
}: {
  caregiverName: string | null
  athleteName: string
  totalSessions: number
  totalKm: number
  milestonesEarned: { label: string; icon: string }[]
  nextMilestone: { label: string; current: number; target: number } | null
  weekDateRange: string
  athleteUrl: string
  narrativeHtml?: string
  digestUrl?: string
  clubName?: string
  tagline?: string
}): string {
  const greeting = caregiverName ? `Hi ${escapeHtml(caregiverName)}` : 'Hi there'

  // If narrative HTML is available, use the enhanced email
  if (narrativeHtml) {
    return layout(`
      <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 8px 0;">
        ${greeting}, here&rsquo;s ${escapeHtml(athleteName)}&rsquo;s week
      </h1>
      <p style="font-size:14px;color:#6B7280;margin:0 0 20px 0;">${weekDateRange}</p>
      ${narrativeHtml}
      <div style="text-align:center;margin-top:24px;">
        <a href="${digestUrl ?? athleteUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
          Read full notes in the app
        </a>
      </div>
    `, clubName, tagline)
  }

  const milestoneList = milestonesEarned
    .map(m => `<li style="margin-bottom:4px;">${escapeHtml(m.icon)} ${escapeHtml(m.label)}</li>`)
    .join('')

  const progressPct = nextMilestone
    ? Math.min(100, Math.round((nextMilestone.current / nextMilestone.target) * 100))
    : 0

  return layout(`
    <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 8px 0;">
      ${greeting}, here&rsquo;s ${escapeHtml(athleteName)}&rsquo;s week
    </h1>
    <p style="font-size:14px;color:#6B7280;margin:0 0 20px 0;">${weekDateRange}</p>
    <div style="background-color:#F0FDFA;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;width:50%;">
            <p style="font-size:32px;font-weight:700;color:${BRAND_DARK};margin:0;">${totalSessions}</p>
            <p style="font-size:14px;color:#6B7280;margin:4px 0 0 0;">session${totalSessions !== 1 ? 's' : ''}</p>
          </td>
          <td style="text-align:center;width:50%;">
            <p style="font-size:32px;font-weight:700;color:${BRAND_DARK};margin:0;">${totalKm.toFixed(1)}</p>
            <p style="font-size:14px;color:#6B7280;margin:4px 0 0 0;">km</p>
          </td>
        </tr>
      </table>
    </div>
    ${milestonesEarned.length > 0 ? `
      <p style="font-size:14px;font-weight:600;color:${BRAND_DARK};margin:0 0 8px 0;">Milestones earned this week:</p>
      <ul style="font-size:14px;color:#4B5563;margin:0 0 20px 0;padding-left:20px;">${milestoneList}</ul>
    ` : ''}
    ${nextMilestone ? `
      <div style="background-color:#F9FAFB;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="font-size:13px;font-weight:600;color:${BRAND_DARK};margin:0 0 8px 0;">
          Next milestone: ${escapeHtml(nextMilestone.label)}
        </p>
        <div style="background-color:#E5E7EB;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background-color:${BRAND_COLOR};height:8px;width:${progressPct}%;border-radius:4px;"></div>
        </div>
        <p style="font-size:12px;color:#9CA3AF;margin:6px 0 0 0;">${nextMilestone.current} / ${nextMilestone.target}</p>
      </div>
    ` : ''}
    <div style="text-align:center;">
      <a href="${athleteUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
        View ${escapeHtml(athleteName)}&rsquo;s Journey
      </a>
    </div>
  `, clubName, tagline)
}

export function invitationEmail({
  role,
  inviterName,
  acceptUrl,
  clubName,
  tagline,
}: {
  role: string
  inviterName: string | null
  acceptUrl: string
  clubName?: string
  tagline?: string
}): string {
  const clubDisplayName = clubName ?? 'Running Club'
  return layout(`
    <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 12px 0;">
      You&rsquo;re invited to ${escapeHtml(clubDisplayName)}
    </h1>
    <p style="font-size:15px;color:#4B5563;margin:0 0 8px 0;">
      ${inviterName ? `${escapeHtml(inviterName)} has invited you` : 'You&rsquo;ve been invited'} to join as a <strong>${escapeHtml(role)}</strong>.
    </p>
    <p style="font-size:15px;color:#4B5563;margin:0 0 24px 0;">
      ${role === 'coach'
        ? 'As a coach, you&rsquo;ll be able to log runs, track athlete progress, and record coaching cues.'
        : role === 'caregiver'
        ? 'As a caregiver, you&rsquo;ll have read-only access to see your athlete&rsquo;s sessions and milestones.'
        : 'As an admin, you&rsquo;ll have full access to manage the club.'}
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${acceptUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
        Accept Invitation
      </a>
    </div>
    ${role === 'coach' ? `
    <div style="background-color:#F0FDFA;border-radius:8px;padding:16px 20px;">
      <p style="font-size:14px;font-weight:600;color:${BRAND_DARK};margin:0 0 12px 0;">
        After you&rsquo;re in, here&rsquo;s what to do:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;color:#4B5563;">
        <tr>
          <td style="padding:0 8px 8px 0;vertical-align:top;font-weight:600;color:${BRAND_COLOR};">1.</td>
          <td style="padding-bottom:8px;"><strong>Connect Strava</strong> &mdash; your runs will sync automatically</td>
        </tr>
        <tr>
          <td style="padding:0 8px 0 0;vertical-align:top;font-weight:600;color:${BRAND_COLOR};">2.</td>
          <td><strong>Log your first run</strong> &mdash; pick an athlete and record a session</td>
        </tr>
      </table>
    </div>
    ` : ''}${role === 'caregiver' ? `
    <div style="background-color:#FFFBEB;border-radius:8px;padding:16px 20px;">
      <p style="font-size:14px;font-weight:600;color:${BRAND_DARK};margin:0 0 12px 0;">
        After you&rsquo;re in, here&rsquo;s what to do:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;color:#4B5563;">
        <tr>
          <td style="padding:0 8px 8px 0;vertical-align:top;font-weight:600;color:#D97706;">1.</td>
          <td style="padding-bottom:8px;"><strong>View your athlete&rsquo;s progress</strong> &mdash; see runs, milestones, and coach notes</td>
        </tr>
        <tr>
          <td style="padding:0 8px 0 0;vertical-align:top;font-weight:600;color:#D97706;">2.</td>
          <td><strong>Send your first cheer</strong> &mdash; your encouragement shows up for coaches on run day</td>
        </tr>
      </table>
    </div>
    ` : ''}
    <p style="font-size:12px;color:#9CA3AF;margin:16px 0 0 0;text-align:center;">
      This link expires in 7 days. If it has expired, you can sign in at the login page.
    </p>
  `, clubName, tagline)
}
