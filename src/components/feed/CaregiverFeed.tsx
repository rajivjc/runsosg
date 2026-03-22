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
import CaregiverWorkingOnCard from '@/components/feed/CaregiverWorkingOnCard'
import CaregiverMonthlySummary from '@/components/feed/CaregiverMonthlySummary'
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
    monthlySummary,
  } = data

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name?.split(' ')[0] ?? 'there'
  const showOnboarding = onboarding != null
  const athleteFirstName = caregiverAthlete?.name?.split(' ')[0] ?? 'your athlete'

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
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-400/60 rounded-2xl px-5 py-4 mb-5 shadow-sm">
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
              <div className="rounded-full w-10 h-10 bg-white/60 dark:bg-white/5 flex items-center justify-center text-xl">
                {caregiverAthlete.avatar}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-50 dark:bg-amber-900/20 border-[1.5px] border-white flex items-center justify-center text-[8px] leading-none"
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
                <div className="flex items-center gap-4 bg-white/50 rounded-lg px-4 py-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{caregiverRecentSessions.length}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">run{caregiverRecentSessions.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-px self-stretch bg-amber-200/60" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">
                      {caregiverRecentSessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">km</p>
                  </div>
                  <div className="w-px self-stretch bg-amber-200/60" />
                  <div className="text-center">
                    <div className="flex items-center gap-0.5 justify-center">
                      {caregiverRecentSessions.slice(0, 5).map((s, i) => (
                        <span key={i} className="text-lg">{s.feel ? FEEL_EMOJI[s.feel] : '—'}</span>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">recent feels</p>
                  </div>
                </div>
              </>
            )}
            <div className="mt-3 text-center">
              <Link
                href={`/story/${caregiverAthlete.id}`}
                className="text-xs text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-300 font-medium transition-colors"
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

      {/* Card 1.5 — Working On status */}
      {caregiverAthlete && workingOn.text && (
        <CaregiverWorkingOnCard
          athleteFirstName={athleteFirstName}
          workingOn={workingOn.text}
          recentProgress={workingOn.recentProgress}
          updatedAt={workingOn.updatedAt}
          coachName={workingOn.coachName}
        />
      )}

      {/* Card 1.75 — Auto-generated monthly summary */}
      {caregiverAthlete && (
        <CaregiverMonthlySummary
          athleteFirstName={athleteFirstName}
          thisMonth={monthlySummary.thisMonth}
          lastMonth={monthlySummary.lastMonth}
        />
      )}

      {/* Card 2 — Milestones & Progress */}
      {caregiverAthlete && (
        <CaregiverMilestoneCard
          milestones={caregiverMilestones}
          nextMilestone={caregiverFocus?.nextMilestone ?? null}
        />
      )}

      {/* Card 3 — Coach Notes */}
      {caregiverAthlete && (
        <CaregiverNotesCard
          notes={caregiverRecentNotes}
          athleteFirstName={athleteFirstName}
        />
      )}

      {/* Card 4 — Cheer Box */}
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

      {/* Weekly club summary */}
      <WeeklyRecapCard weeklyStats={weeklyStats} weeklyRecap={weeklyRecap} />

      {/* Club statistics */}
      <ClubStats stats={clubStats} />

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👟</p>
          <p className="text-base font-semibold text-text-primary mb-1">The club is quiet today</p>
          <p className="text-sm text-text-muted">Be the first to log a run!</p>
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
