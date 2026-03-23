import Link from 'next/link'
import MilestoneDetector from '@/components/milestone/MilestoneDetector'
import CaregiverOnboardingCard from '@/components/feed/CaregiverOnboardingCard'
import CaregiverMilestoneCard from '@/components/feed/CaregiverMilestoneCard'
import CaregiverNotesCard from '@/components/feed/CaregiverNotesCard'
import CaregiverCheerCard from '@/components/feed/CaregiverCheerCard'
import ClubStats from '@/components/feed/ClubStats'
import WeeklyRecapCard from '@/components/feed/WeeklyRecapCard'
import SessionGroup from '@/components/feed/SessionGroup'
import BetaBanner from '@/components/feed/BetaBanner'
import HintCard from '@/components/ui/HintCard'
import { HINT_KEYS } from '@/lib/hint-keys'
import CaregiverPlanCard from '@/components/feed/CaregiverPlanCard'
import DigestTeaser from '@/components/feed/DigestTeaser'
import { formatPace } from '@/lib/utils/dates'
import type { CaregiverFeedData } from '@/lib/feed/types'

const FEEL_EMOJI: Record<number, string> = {
  1: '😰', 2: '😐', 3: '🙂', 4: '😊', 5: '🔥',
}

interface Props {
  data: CaregiverFeedData
  userId: string
}

export default function CaregiverFeed({ data, userId }: Props) {
  const {
    user,
    athlete: caregiverAthlete,
    recentSessions: caregiverRecentSessions,
    milestones: caregiverMilestones,
    recentNotes: caregiverRecentNotes,
    cheersToday,
    sentCheers: caregiverSentCheers,
    caregiverFocus,
    sessions,
    groups,
    kudosCounts,
    kudosGivers,
    myKudos,
    clubStats,
    milestonesBySession,
    celebrationMilestones,
    weeklyRecap,
    weeklyStats,
    athleteStreak,
    allowPublicSharing,
    onboarding,
    workingOn,
    digestTeaser,
    planData,
    monthlySummary,
  } = data

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name?.split(' ')[0] ?? 'there'
  const showOnboarding = onboarding != null
  const athleteFirstName = caregiverAthlete?.name?.split(' ')[0] ?? 'your athlete'

  // Monthly comparison (absorbed from CaregiverMonthlySummary)
  const avgDistanceThis = monthlySummary.thisMonth.runs > 0
    ? monthlySummary.thisMonth.km / monthlySummary.thisMonth.runs : 0
  const avgDistanceLast = monthlySummary.lastMonth.runs > 0
    ? monthlySummary.lastMonth.km / monthlySummary.lastMonth.runs : 0
  const distanceTrend = monthlySummary.lastMonth.runs > 0
    ? avgDistanceThis - avgDistanceLast : 0
  const trendIcon = distanceTrend > 0.05 ? '↑' : distanceTrend < -0.05 ? '↓' : '→'
  const trendColor = distanceTrend > 0.05
    ? 'text-green-600 dark:text-green-300'
    : distanceTrend < -0.05
      ? 'text-orange-500 dark:text-orange-300'
      : 'text-text-muted'
  const pace = monthlySummary.thisMonth.durationSeconds > 0
    ? formatPace(monthlySummary.thisMonth.km, monthlySummary.thisMonth.durationSeconds)
    : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <BetaBanner />

      {/* Milestone celebration overlay */}
      {celebrationMilestones.length > 0 && (
        <MilestoneDetector recentMilestones={celebrationMilestones} />
      )}

      {/* Onboarding checklist for new caregivers */}
      {showOnboarding && (
        <CaregiverOnboardingCard
          firstName={firstName}
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
        />
      )}

      <HintCard
        storageKey={HINT_KEYS.HINT_CAREGIVER_FEED}
        title="Your athlete's updates"
        description="This is where you'll see sessions, milestones, and weekly recaps. You can send cheers to encourage your athlete before their next run."
        variant="amber"
      />

      {/* Card 1 — Athlete Status */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/15 border border-amber-200 dark:border-amber-400/30 rounded-2xl px-5 py-4 mb-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-text-primary">
            {greeting}, {firstName}
          </p>
          {caregiverAthlete && athleteStreak && athleteStreak.current > 0 && (
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
              🔥 {athleteStreak.current}-week streak
              {athleteStreak.longest > athleteStreak.current && (
                <span className="text-[10px] text-amber-500 ml-1">Best: {athleteStreak.longest}w</span>
              )}
            </span>
          )}
        </div>
        {caregiverAthlete?.avatar && (
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-shrink-0">
              <div className="rounded-full w-10 h-10 bg-white/60 dark:bg-white/8 flex items-center justify-center text-xl">
                {caregiverAthlete.avatar}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-50 dark:bg-amber-900/10 border-[1.5px] border-white flex items-center justify-center text-[8px] leading-none"
                title="Avatar chosen by athlete"
              >
                ✌️
              </span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-300">{athleteFirstName} chose this avatar</p>
          </div>
        )}
        {caregiverAthlete ? (
          <>
            {caregiverRecentSessions.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                No runs logged for {caregiverAthlete.name} this month yet — stay tuned!
              </p>
            ) : (
              <>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 mb-3">
                  Here&apos;s how {caregiverAthlete.name} is doing this month
                </p>
                {/* Stats grid — 3 columns like monthly summary */}
                <div className="grid grid-cols-3 gap-3 bg-white/50 dark:bg-white/8 rounded-lg px-4 py-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{monthlySummary.thisMonth.runs}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">
                      run{monthlySummary.thisMonth.runs !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{monthlySummary.thisMonth.km.toFixed(1)}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">km total</p>
                  </div>
                  {pace && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-text-primary">{pace}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">per km avg</p>
                    </div>
                  )}
                </div>

                {/* Feel emojis */}
                {caregiverRecentSessions.some(s => s.feel) && (
                  <div className="flex items-center gap-1 mt-2 justify-center">
                    {caregiverRecentSessions.slice(0, 5).map((s, i) => (
                      <span key={i} className="text-lg">{s.feel ? FEEL_EMOJI[s.feel] : '—'}</span>
                    ))}
                    <span className="text-xs text-amber-600 dark:text-amber-300 font-medium ml-1">recent feels</span>
                  </div>
                )}

                {/* Monthly comparison — from CaregiverMonthlySummary */}
                {monthlySummary.lastMonth.runs > 0 && (
                  <div className="mt-2 text-xs text-amber-600/80 dark:text-amber-300/80 text-center">
                    vs last month: {avgDistanceLast.toFixed(1)} km → {avgDistanceThis.toFixed(1)} km per run{' '}
                    <span className={`font-semibold ${trendColor}`}>{trendIcon}</span>
                  </div>
                )}
              </>
            )}
            <div className="mt-3 text-center space-y-1">
              <Link
                href={`/story/${caregiverAthlete.id}`}
                className="text-xs text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-300 font-medium transition-colors block"
              >
                View {athleteFirstName}&apos;s journey story &rarr;
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Welcome to the SOSG Running Club! Your athlete hasn&apos;t been linked yet — please ask a coach.
          </p>
        )}
      </div>

      {/* 2. Coach Notes — moved up for trust building */}
      {caregiverAthlete && (
        <CaregiverNotesCard
          notes={caregiverRecentNotes}
          athleteFirstName={athleteFirstName}
        />
      )}

      {/* 3. Digest teaser */}
      {digestTeaser && (
        <DigestTeaser teaserText={digestTeaser.text} weekLabel={digestTeaser.weekLabel} />
      )}

      {/* 4. Coach's Plan */}
      {caregiverAthlete && (
        <CaregiverPlanCard
          athleteFirstName={athleteFirstName}
          focusTitle={planData.focusTitle}
          focusProgressNote={planData.focusProgressNote}
          focusProgressLevel={planData.focusProgressLevel}
          focusUpdatedAt={planData.focusUpdatedAt}
          focusCoachName={planData.focusCoachName}
          runningGoal={planData.runningGoal}
          goalProgress={planData.goalProgress}
          recentAchievement={planData.recentAchievement}
        />
      )}

      {/* 5. Milestones & Progress */}
      {caregiverAthlete && (
        <CaregiverMilestoneCard
          milestones={caregiverMilestones}
          nextMilestone={caregiverFocus?.nextMilestone ?? null}
        />
      )}

      {/* 6. Send Encouragement */}
      {caregiverAthlete && (
        <CaregiverCheerCard
          athleteId={caregiverAthlete.id}
          athleteFirstName={athleteFirstName}
          athleteName={caregiverAthlete.name}
          cheersToday={cheersToday}
          sentCheers={caregiverSentCheers}
          allowPublicSharing={allowPublicSharing}
        />
      )}

      {/* 7. This week at the club */}
      <WeeklyRecapCard weeklyStats={weeklyStats} weeklyRecap={weeklyRecap} />

      {/* 8. Club Stats */}
      <ClubStats stats={clubStats} />

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👟</p>
          <p className="text-base font-semibold text-text-primary mb-1">No sessions yet</p>
          <p className="text-sm text-text-muted">
            {caregiverAthlete
              ? `Sessions will appear here once ${caregiverAthlete.name.split(' ')[0]}'s coach logs a run.`
              : 'Once your athlete is linked, their sessions will appear here.'}
          </p>
        </div>
      )}

      {/* Session groups */}
      {Object.entries(groups).map(([label, items]) => (
        <SessionGroup
          key={label}
          label={label}
          sessions={items}
          milestonesBySession={milestonesBySession}
          kudosCounts={kudosCounts}
          kudosGivers={kudosGivers}
          myKudos={myKudos}
          isReadOnly={true}
          userId={userId}
        />
      ))}
    </main>
  )
}
