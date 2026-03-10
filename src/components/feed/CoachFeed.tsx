import Link from 'next/link'
import MilestoneDetector from '@/components/milestone/MilestoneDetector'
import OnboardingCard from '@/components/feed/OnboardingCard'
import CheerViewTracker from '@/components/feed/CheerViewTracker'
import { formatDate } from '@/lib/utils/dates'
import ClubStats from '@/components/feed/ClubStats'
import CoachSessionFeed from '@/components/feed/CoachSessionFeed'
import BetaBanner from '@/components/feed/BetaBanner'
import type { CoachFeedData } from '@/lib/feed/types'

interface Props {
  data: CoachFeedData
  userId: string
}

export default function CoachFeed({ data, userId }: Props) {
  const {
    user,
    sessions,
    groups,
    milestonesBySession,
    celebrationMilestones,
    kudosCounts,
    myKudos,
    clubStats,
    coachStats,
    coachFocus,
    recentBadge,
    recentCheers,
    onboarding,
    weeklyRecap,
    weeklyStats,
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
        <OnboardingCard
          firstName={firstName}
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
        />
      )}

      {/* Coach greeting card — hidden during onboarding */}
      {!showOnboarding && (
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/60 rounded-2xl px-5 py-4 mb-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">
              {greeting}, {firstName}
            </p>
            {coachFocus && coachFocus.streak.current > 0 && (
              <Link href="/account" className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                🔥 {coachFocus.streak.current}-week streak
              </Link>
            )}
          </div>
          {coachFocus && !coachFocus.streak.activeThisWeek && coachFocus.streak.current > 0 && (
            <p className="text-xs text-teal-500/70 mt-0.5">Log a run to keep your streak!</p>
          )}
          {coachStats.monthSessions === 0 ? (
            <p className="text-sm text-teal-700 mt-1">
              No sessions this month yet — let&apos;s get out there!
            </p>
          ) : (
            <p className="text-sm text-teal-700 mt-1">
              {coachStats.monthSessions} session{coachStats.monthSessions !== 1 ? 's' : ''} coached this month with {coachStats.monthAthletes} athlete{coachStats.monthAthletes !== 1 ? 's' : ''}
            </p>
          )}
          {recentBadge && (
            <div className="mt-2 bg-white/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-xl">{recentBadge.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-teal-800">New badge: {recentBadge.label}!</p>
                <p className="text-[10px] text-teal-600">{recentBadge.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cheers from home */}
      {recentCheers.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
          <CheerViewTracker
            unviewedCheerIds={recentCheers.filter(c => !c.viewed_at).map(c => c.id)}
          />
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2.5">Cheers from home 📣</p>
          <div className="space-y-2">
            {recentCheers.map(c => (
              <Link key={c.id} href={`/athletes/${c.athlete_id}`}>
                <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-amber-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-amber-800">&ldquo;{c.message}&rdquo;</p>
                    <p className="text-[10px] text-amber-400">
                      {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's Focus */}
      {coachFocus && coachFocus.items.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Today&apos;s focus</p>
          <div className="space-y-2">
            {coachFocus.items.map((item, i) => {
              const bgClass = item.type === 'feel_declining' ? 'hover:bg-orange-50 bg-orange-50/40'
                : item.type === 'personal_best' || item.type === 'best_week_ever' ? 'hover:bg-teal-50 bg-teal-50/40'
                : 'hover:bg-gray-50'
              return (
                <Link key={i} href={`/athletes/${item.athleteId}`}>
                  <div className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${bgClass}`}>
                    <span className="text-base flex-shrink-0">{item.type === 'approaching_milestone' ? '⭐' : item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.subtitle}</p>
                    </div>
                    <span className="text-gray-300 flex-shrink-0 text-sm">&#x203A;</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Club statistics (with weekly recap merged in) */}
      <ClubStats stats={clubStats} weeklyStats={weeklyStats} weeklyRecap={weeklyRecap} />

      {/* Session timeline with athlete filtering */}
      <CoachSessionFeed
        sessions={sessions}
        groups={groups}
        milestonesBySession={milestonesBySession}
        kudosCounts={kudosCounts}
        myKudos={myKudos}
        userId={userId}
      />
    </main>
  )
}
