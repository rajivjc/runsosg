/**
 * TODO: Caregiver Weekly Digest Email
 *
 * Planned feature: Auto-generated weekly email to caregivers with:
 * - Athlete session stats for the week (count, km, avg feel)
 * - Coach notes excerpts (visibility=all)
 * - Milestones earned this week
 * - Next milestone progress bar
 * - Link to journey story
 *
 * Implementation approach:
 * 1. computeDigestData(athleteId) — fetch last 7 days of sessions/notes/milestones
 *    Reuse calculateGoalProgress() from lib/goals.ts
 *    Reuse getCaregiverFocusData() from lib/feed/today-focus.ts
 * 2. caregiverDigestEmail() template in lib/email/templates.ts
 * 3. API route at /api/digest/caregiver (cron-triggered, Vercel Cron)
 * 4. Skip athletes with 0 sessions that week
 *
 * Dependencies: Existing Resend + email template infrastructure
 */
