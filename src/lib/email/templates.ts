// HTML email templates for SOSG Running Club
// Uses inline styles for maximum email client compatibility

const BRAND_COLOR = '#0D9488'
const BRAND_DARK = '#1A1A2E'
const BG_COLOR = '#FBF9F7'

function layout(content: string): string {
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
              SOSG Running Club
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
              SOSG Running Club — Growing Together
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
}: {
  athleteName: string
  milestoneLabel: string
  milestoneIcon: string
  coachName: string | null
  date: string
  milestoneUrl: string
}): string {
  return layout(`
    <div style="text-align:center;">
      <div style="font-size:64px;line-height:1;margin-bottom:16px;">${milestoneIcon}</div>
      <p style="font-size:12px;font-weight:700;color:${BRAND_COLOR};text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0;">
        Milestone Achieved
      </p>
      <h1 style="font-size:28px;font-weight:700;color:${BRAND_DARK};margin:0 0 4px 0;">${athleteName}</h1>
      <p style="font-size:20px;font-weight:600;color:${BRAND_COLOR};margin:0 0 16px 0;">${milestoneLabel}</p>
      <p style="font-size:14px;color:#9CA3AF;margin:0 0 4px 0;">${date}</p>
      ${coachName ? `<p style="font-size:14px;color:#9CA3AF;margin:0;">Coached by ${coachName}</p>` : ''}
      <div style="margin-top:24px;">
        <a href="${milestoneUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
          View Milestone
        </a>
      </div>
    </div>
  `)
}

export function weeklyDigestEmail({
  coachName,
  totalSessions,
  athleteNames,
  weekDateRange,
  feedUrl,
}: {
  coachName: string
  totalSessions: number
  athleteNames: string[]
  weekDateRange: string
  feedUrl: string
}): string {
  const athleteList = athleteNames.map(n => `<li style="margin-bottom:4px;">${n}</li>`).join('')

  return layout(`
    <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 8px 0;">
      Hey ${coachName}, here&rsquo;s your week
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
  `)
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
}: {
  caregiverName: string | null
  athleteName: string
  totalSessions: number
  totalKm: number
  milestonesEarned: { label: string; icon: string }[]
  nextMilestone: { label: string; current: number; target: number } | null
  weekDateRange: string
  athleteUrl: string
}): string {
  const greeting = caregiverName ? `Hi ${caregiverName}` : 'Hi there'
  const milestoneList = milestonesEarned
    .map(m => `<li style="margin-bottom:4px;">${m.icon} ${m.label}</li>`)
    .join('')

  const progressPct = nextMilestone
    ? Math.min(100, Math.round((nextMilestone.current / nextMilestone.target) * 100))
    : 0

  return layout(`
    <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 8px 0;">
      ${greeting}, here&rsquo;s ${athleteName}&rsquo;s week
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
          Next milestone: ${nextMilestone.label}
        </p>
        <div style="background-color:#E5E7EB;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background-color:${BRAND_COLOR};height:8px;width:${progressPct}%;border-radius:4px;"></div>
        </div>
        <p style="font-size:12px;color:#9CA3AF;margin:6px 0 0 0;">${nextMilestone.current} / ${nextMilestone.target}</p>
      </div>
    ` : ''}
    <div style="text-align:center;">
      <a href="${athleteUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
        View ${athleteName}&rsquo;s Journey
      </a>
    </div>
  `)
}

export function invitationEmail({
  role,
  inviterName,
  loginUrl,
}: {
  role: string
  inviterName: string | null
  loginUrl: string
}): string {
  return layout(`
    <h1 style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin:0 0 12px 0;">
      You&rsquo;re invited to SOSG Running Club
    </h1>
    <p style="font-size:15px;color:#4B5563;margin:0 0 8px 0;">
      ${inviterName ? `${inviterName} has invited you` : 'You&rsquo;ve been invited'} to join as a <strong>${role}</strong>.
    </p>
    <p style="font-size:15px;color:#4B5563;margin:0 0 24px 0;">
      ${role === 'coach'
        ? 'As a coach, you&rsquo;ll be able to log runs, track athlete progress, and record coaching cues.'
        : role === 'caregiver'
        ? 'As a caregiver, you&rsquo;ll have read-only access to see your athlete&rsquo;s sessions and milestones.'
        : 'As an admin, you&rsquo;ll have full access to manage the club.'}
    </p>
    <div style="text-align:center;">
      <a href="${loginUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:24px;">
        Accept Invitation
      </a>
    </div>
  `)
}
