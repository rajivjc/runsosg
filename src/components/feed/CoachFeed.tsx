import Link from 'next/link'
import MilestoneDetector from '@/components/milestone/MilestoneDetector'
import OnboardingCard from '@/components/feed/OnboardingCard'
import AppContextCard from '@/components/feed/AppContextCard'
import CheerViewTracker from '@/components/feed/CheerViewTracker'
import { formatDate } from '@/lib/utils/dates'
import ThisWeekStory from '@/components/feed/ThisWeekStory'
import CoachSessionFeed from '@/components/feed/CoachSessionFeed'
import BetaBanner from '@/components/feed/BetaBanner'
import HintCard from '@/components/ui/HintCard'
import { HINT_KEYS } from '@/lib/hint-keys'
import PrioritySummary from '@/components/feed/PrioritySummary'
import PriorityBucket from '@/components/feed/PriorityBucket'
import AthleteStatusCard from '@/components/feed/AthleteStatusCard'
import OnTrackCloud from '@/components/feed/OnTrackCloud'
import FeelTrendBars from '@/components/feed/FeelTrendBars'
import DigestTeaser from '@/components/feed/DigestTeaser'
import type { CoachFeedData } from '@/lib/feed/types'
import type { CoachPriorities } from '@/lib/feed/coach-priorities'

interface Props {
  data: CoachFeedData
  userId: string
  priorities?: CoachPriorities
}

export default function CoachFeed({ data, userId, priorities }: Props) {
  const {
    user,
    sessions,
    groups,
    milestonesBySession,
    celebrationMilestones,
    kudosCounts,
    kudosGivers,
    myKudos,
    clubStats,
    coachStats,
    coachFocus,
    recentBadge,
    recentCheers,
    athleteMessages,
    onboarding,
    weeklyRecap,
    weeklyStats,
    digestTeaser,
  } = data

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name?.split(' ')[0] ?? 'Coach'
  const showOnboarding = onboarding != null

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <BetaBanner />

      {/* Milestone celebration overlay */}
      {celebrationMilestones.length > 0 && (
        <MilestoneDetector recentMilestones={celebrationMilestones} />
      )}

      {/* Onboarding checklist for new coaches */}
      {showOnboarding && (
        <>
          <AppContextCard />
          <OnboardingCard
            firstName={firstName}
            steps={onboarding.steps}
            completedCount={onboarding.completedCount}
            totalCount={onboarding.totalCount}
          />
        </>
      )}

      {/* Coach greeting card — hidden during onboarding */}
      {!showOnboarding && (
        <>
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-200 dark:border-teal-400/30 rounded-2xl px-5 py-4 mb-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-text-primary">
              {greeting}, {firstName}
            </p>
            {coachFocus && coachFocus.streak.current > 0 && (
              <Link href="/account" className="flex items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-300">
                🔥 {coachFocus.streak.current}-week streak
              </Link>
            )}
          </div>
          {coachFocus && !coachFocus.streak.activeThisWeek && coachFocus.streak.current > 0 && (
            <p className="text-xs text-teal-500/70 mt-0.5">Log a run to keep your streak!</p>
          )}
          {coachStats.monthSessions === 0 ? (
            <p className="text-sm text-teal-700 dark:text-teal-300 mt-1">
              No sessions this month yet — let&apos;s get out there!
            </p>
          ) : (
            <p className="text-sm text-teal-700 dark:text-teal-300 mt-1">
              {coachStats.monthSessions} session{coachStats.monthSessions !== 1 ? 's' : ''} coached this month with {coachStats.monthAthletes} athlete{coachStats.monthAthletes !== 1 ? 's' : ''}
            </p>
          )}
          {recentBadge && (
            <div className="mt-2 bg-white/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-xl">{recentBadge.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">New badge: {recentBadge.label}!</p>
                <p className="text-[10px] text-teal-600 dark:text-teal-300">{recentBadge.description}</p>
              </div>
            </div>
          )}
        </div>
        <HintCard
          storageKey={HINT_KEYS.HINT_FEED_POST_ONBOARDING}
          title="Your coaching feed"
          description="New sessions, milestones, and alerts from all athletes show up here. Tap any session card for details."
        />
        </>
      )}

      {/* Digest teaser card */}
      {!showOnboarding && digestTeaser && (
        <DigestTeaser teaserText={digestTeaser.text} weekLabel={digestTeaser.weekLabel} />
      )}

      {/* Priority status dashboard */}
      {priorities && priorities.totalAthletes > 0 && (
        <>
          <PrioritySummary
            needsAttentionCount={priorities.needsAttention.length}
            goingQuietCount={priorities.goingQuiet.length}
            nearMilestoneCount={priorities.nearMilestone.length}
            onTrackCount={priorities.onTrack.length}
            totalAthletes={priorities.totalAthletes}
          />

          {priorities.needsAttention.length > 0 && (
            <PriorityBucket variant="danger" label="Needs attention" isFirst>
              {priorities.needsAttention.map((a) => (
                <AthleteStatusCard
                  key={a.athleteId}
                  athleteId={a.athleteId}
                  athleteName={a.athleteName}
                  avatar={a.avatar}
                  detail={a.detail}
                  variant="danger"
                  rightContent={<FeelTrendBars ratings={a.recentFeelRatings} />}
                />
              ))}
            </PriorityBucket>
          )}

          {priorities.goingQuiet.length > 0 && (
            <PriorityBucket variant="warning" label="Going quiet" isFirst={priorities.needsAttention.length === 0}>
              {priorities.goingQuiet.map((a) => (
                <AthleteStatusCard
                  key={a.athleteId}
                  athleteId={a.athleteId}
                  athleteName={a.athleteName}
                  avatar={a.avatar}
                  detail={`No sessions in ${a.daysSinceLastSession} days · Was averaging every ${a.averageCadenceDays} days`}
                  variant="warning"
                />
              ))}
            </PriorityBucket>
          )}

          {priorities.nearMilestone.length > 0 && (
            <PriorityBucket variant="info" label="Approaching milestone" isFirst={priorities.needsAttention.length === 0 && priorities.goingQuiet.length === 0}>
              {priorities.nearMilestone.map((a) => {
                const remaining = Math.round((a.target - a.current) * 10) / 10
                return (
                  <AthleteStatusCard
                    key={a.athleteId}
                    athleteId={a.athleteId}
                    athleteName={a.athleteName}
                    avatar={a.avatar}
                    detail={`${remaining} ${a.unit} away from ${a.milestoneName}`}
                    variant="info"
                    rightContent={
                      <span className="text-[13px] font-semibold text-blue-600">
                        {a.current} / {a.target} {a.unit}
                      </span>
                    }
                  />
                )
              })}
            </PriorityBucket>
          )}

          {priorities.onTrack.length > 0 && (
            <PriorityBucket variant="success" label={`On track · ${priorities.onTrack.length} athletes`} isFirst={priorities.needsAttention.length === 0 && priorities.goingQuiet.length === 0 && priorities.nearMilestone.length === 0}>
              <OnTrackCloud athletes={priorities.onTrack} />
            </PriorityBucket>
          )}

          {priorities.unmatchedStravaCount > 0 && (
            <Link
              href="/notifications"
              className="block rounded-xl px-4 py-3 mb-4 min-h-[44px] bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-500"
            >
              <p className="text-sm font-medium text-text-primary">
                {priorities.unmatchedStravaCount} unmatched Strava activit{priorities.unmatchedStravaCount === 1 ? 'y' : 'ies'} — tap to resolve
              </p>
            </Link>
          )}

        </>
      )}

      {/* Cheers from home */}
      {recentCheers.length > 0 && (
        <div className="bg-amber-50/40 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-400/20 rounded-xl px-4 py-3 mb-5 shadow-sm">
          <CheerViewTracker
            unviewedCheerIds={recentCheers.filter(c => !c.viewed_at).map(c => c.id)}
          />
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2.5">Cheers from home 📣</p>
          <div className="space-y-2">
            {recentCheers.map(c => (
              <Link key={c.id} href={`/athletes/${c.athlete_id}`}>
                <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/12 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-amber-800 dark:text-amber-300">&ldquo;{c.message}&rdquo;</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-300">
                      {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Messages from athletes — moved up for emotional pull */}
      {athleteMessages.length > 0 && (() => {
        const uniqueAthletes = new Set(athleteMessages.map(m => m.athlete_name))
        const names = Array.from(uniqueAthletes)
        const nameText = names.length <= 2
          ? names.join(' and ')
          : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
        return (
          <div className="bg-teal-50/40 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-400/20 rounded-xl px-4 py-3 mb-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-widest">Messages from athletes ✉️</p>
              <span className="bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {athleteMessages.length}
              </span>
            </div>
            <p className="text-sm text-teal-800 dark:text-teal-300 mt-1.5">
              {athleteMessages.length === 1
                ? `${athleteMessages[0].athlete_name} sent a message`
                : `${athleteMessages.length} new messages from ${nameText}`}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {names.map(name => {
                const athleteMsg = athleteMessages.find(m => m.athlete_name === name)!
                return (
                  <Link
                    key={name}
                    href={`/athletes/${athleteMsg.athlete_id}`}
                    className="inline-flex items-center gap-1 bg-white/70 dark:bg-white/10 hover:bg-surface text-teal-700 dark:text-teal-300 text-xs font-medium px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-400/20 transition-colors"
                  >
                    {name}
                    <span className="text-teal-400">&#x203A;</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* This Week's Story — unified weekly card */}
      {!showOnboarding && (
        <ThisWeekStory
          weeklyStats={weeklyStats}
          weeklyRecap={weeklyRecap}
          celebrations={coachFocus?.items.filter(
            i => i.type === 'personal_best' || i.type === 'best_week_ever'
          ) ?? []}
          clubStats={clubStats}
        />
      )}

      {/* Recent sessions label */}
      <p className="text-[11px] font-semibold text-text-hint uppercase tracking-wide mb-3" style={{ letterSpacing: '0.5px' }}>
        Recent sessions
      </p>

      {/* Session timeline with athlete filtering */}
      <CoachSessionFeed
        sessions={sessions}
        groups={groups}
        milestonesBySession={milestonesBySession}
        kudosCounts={kudosCounts}
        kudosGivers={kudosGivers}
        myKudos={myKudos}
        userId={userId}
      />
    </main>
  )
}
