import Link from 'next/link'
import { formatDate } from '@/lib/utils/dates'
import MilestoneDetector from '@/components/milestone/MilestoneDetector'
import CaregiverOnboardingCard from '@/components/feed/CaregiverOnboardingCard'
import CheerBox from '@/components/feed/CheerBox'
import ClubStats from '@/components/feed/ClubStats'
import WeeklyRecapCard from '@/components/feed/WeeklyRecapCard'
import SessionGroup from '@/components/feed/SessionGroup'
import CaregiverSharingControl from '@/components/feed/CaregiverSharingControl'
import BetaBanner from '@/components/feed/BetaBanner'
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
    myKudos,
    clubStats,
    milestonesBySession,
    celebrationMilestones,
    weeklyRecap,
    weeklyStats,
    athleteStreak,
    allowPublicSharing,
    onboarding,
  } = data

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name?.split(' ')[0] ?? 'there'
  const showOnboarding = onboarding != null

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

      {/* Caregiver greeting card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-5 py-5 mb-5 shadow-sm">
        <p className="text-lg font-bold text-gray-900 mb-1">
          {greeting}, {firstName}
        </p>
        {caregiverAthlete ? (
          <>
            {athleteStreak && athleteStreak.current > 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">🔥</span>
                <span className="text-sm font-semibold text-amber-700">
                  {caregiverAthlete.name} is on a {athleteStreak.current}-week streak!
                </span>
                {athleteStreak.longest > athleteStreak.current && (
                  <span className="text-[10px] text-amber-500">Best: {athleteStreak.longest}w</span>
                )}
              </div>
            )}
            {caregiverRecentSessions.length === 0 ? (
              <p className="text-sm text-amber-700 mb-3">
                No runs logged for {caregiverAthlete.name} this month yet — stay tuned!
              </p>
            ) : (
              <>
                <p className="text-sm text-amber-700 mb-3">
                  Here&apos;s how {caregiverAthlete.name} is doing this month
                </p>
                <div className="flex items-center gap-4 bg-white/50 rounded-lg px-4 py-3 mb-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{caregiverRecentSessions.length}</p>
                    <p className="text-xs text-amber-600 font-medium">run{caregiverRecentSessions.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-px self-stretch bg-amber-200/60" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {caregiverRecentSessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-amber-600 font-medium">km</p>
                  </div>
                  <div className="w-px self-stretch bg-amber-200/60" />
                  <div className="text-center">
                    <div className="flex items-center gap-0.5 justify-center">
                      {caregiverRecentSessions.slice(0, 5).map((s, i) => (
                        <span key={i} className="text-lg">{s.feel ? FEEL_EMOJI[s.feel] : '—'}</span>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 font-medium">recent feels</p>
                  </div>
                </div>
              </>
            )}

            {/* Milestones earned */}
            {caregiverMilestones.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Milestones</p>
                <div className="flex flex-wrap gap-1.5">
                  {caregiverMilestones.map(m => (
                    <Link key={m.id} href={`/milestone/${m.id}`}>
                      <span className="inline-flex items-center gap-1 bg-white/70 hover:bg-white border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors">
                        {m.icon ?? '🏆'} {m.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Next milestone progress */}
            {caregiverFocus?.nextMilestone && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Next milestone</p>
                <div className="bg-white/50 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-800">
                      {caregiverFocus.nextMilestone.icon} {caregiverFocus.nextMilestone.label}
                    </span>
                    <span className="text-[10px] text-amber-600 font-medium">
                      {caregiverFocus.nextMilestone.current}/{caregiverFocus.nextMilestone.target}
                    </span>
                  </div>
                  <div className="w-full bg-amber-100 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((caregiverFocus.nextMilestone.current / caregiverFocus.nextMilestone.target) * 100))}%` }}
                    />
                  </div>
                  {(caregiverFocus.nextMilestone.target - caregiverFocus.nextMilestone.current) <= 2 && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Just {caregiverFocus.nextMilestone.target - caregiverFocus.nextMilestone.current} more run{(caregiverFocus.nextMilestone.target - caregiverFocus.nextMilestone.current) !== 1 ? 's' : ''} to go!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recent coach notes */}
            {caregiverRecentNotes.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Coach notes</p>
                <div className="space-y-1.5">
                  {caregiverRecentNotes.map((n, i) => (
                    <p key={i} className="text-xs text-amber-800 bg-white/50 rounded-lg px-3 py-2 italic line-clamp-2">
                      &ldquo;{n.content}&rdquo;
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Journey story link */}
            <div className="mt-3 text-center">
              <Link
                href={`/story/${caregiverAthlete.id}`}
                className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
              >
                View {caregiverAthlete.name?.split(' ')[0]}&apos;s journey story &rarr;
              </Link>
            </div>

            {/* Send a cheer */}
            <div className="mt-3 pt-3 border-t border-amber-200/40">
              <CheerBox
                athleteId={caregiverAthlete.id}
                athleteFirstName={caregiverAthlete.name?.split(' ')[0] ?? 'your athlete'}
                cheersToday={cheersToday}
              />
            </div>

            {/* Sent cheers with read status */}
            {caregiverSentCheers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200/40">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Your cheers</p>
                <div className="space-y-1.5">
                  {caregiverSentCheers.map(c => (
                    <div key={c.id} className="bg-white/50 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-amber-800 truncate">&ldquo;{c.message}&rdquo;</p>
                        <p className="text-[10px] text-amber-400">{formatDate(c.created_at)}</p>
                      </div>
                      {c.viewed_at ? (
                        <span className="text-[10px] text-teal-600 font-medium flex-shrink-0 ml-2">
                          Seen &#10003;
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex-shrink-0 ml-2">
                          Sent
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caregiver sharing control (Feature A) */}
            {allowPublicSharing && (
              <div className="mt-3 pt-3 border-t border-amber-200/40">
                <CaregiverSharingControl
                  athleteId={caregiverAthlete.id}
                  athleteName={caregiverAthlete.name}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-amber-700">
            Welcome to the SOSG Running Club! Your athlete hasn&apos;t been linked yet — please ask a coach.
          </p>
        )}
      </div>

      {/* Weekly club summary */}
      <WeeklyRecapCard weeklyStats={weeklyStats} weeklyRecap={weeklyRecap} />

      {/* Club statistics */}
      <ClubStats stats={clubStats} />

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👟</p>
          <p className="text-base font-semibold text-gray-900 mb-1">The club is quiet today</p>
          <p className="text-sm text-gray-500">Be the first to log a run!</p>
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
          myKudos={myKudos}
          isReadOnly={true}
          userId={userId}
        />
      ))}
    </main>
  )
}
