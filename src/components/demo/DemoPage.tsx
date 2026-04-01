'use client'

import { useState, useEffect } from 'react'
import { ROLES, type RoleId } from './demo-data'
import PhoneFrame from './PhoneFrame'
import CoachFeed from './screens/CoachFeed'
import CoachSessions from './screens/CoachSessions'
import CoachMilestone from './screens/CoachMilestone'
import CaregiverDashboard from './screens/CaregiverDashboard'
import CaregiverSessions from './screens/CaregiverSessions'
import CaregiverDigest from './screens/CaregiverDigest'
import AthleteJourney from './screens/AthleteJourney'
import AthleteGoal from './screens/AthleteGoal'
import AthleteFavourite from './screens/AthleteFavourite'

const SCREENS: Record<RoleId, { id: string; label: string; desc: string; component: React.ComponentType }[]> = {
  coach: [
    { id: 'feed', label: 'Coach feed', desc: 'Priority buckets surface what needs attention now', component: CoachFeed },
    { id: 'sessions', label: 'Session scheduling', desc: 'Create sessions, track RSVPs, manage coach-athlete pairings', component: CoachSessions },
    { id: 'milestone', label: 'Milestone celebration', desc: 'Sensory-safe celebrations with shareable certificates', component: CoachMilestone },
  ],
  caregiver: [
    { id: 'dashboard', label: 'Progress dashboard', desc: 'See your athlete\'s journey without being at the track', component: CaregiverDashboard },
    { id: 'sessions', label: 'Upcoming sessions', desc: 'See when sessions are, who your child is paired with', component: CaregiverSessions },
    { id: 'digest', label: 'Weekly digest', desc: 'Automated summary delivered to your inbox every Monday', component: CaregiverDigest },
  ],
  athlete: [
    { id: 'journey', label: 'My Journey', desc: 'A personal page that\'s truly theirs — avatar, colour, milestones', component: AthleteJourney },
    { id: 'goal', label: 'Choose a goal', desc: 'Simple, literal choices — no jargon, no pressure', component: AthleteGoal },
    { id: 'favourites', label: 'Favourite runs', desc: 'Athletes curate their own highlight reel', component: AthleteFavourite },
  ],
}

export default function DemoPage() {
  const [activeRole, setActiveRole] = useState<RoleId>('coach')
  const [screenIdx, setScreenIdx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => { setScreenIdx(0) }, [activeRole])

  const screens = SCREENS[activeRole]
  const current = screens[screenIdx]

  const goTo = (idx: number) => {
    if (idx === screenIdx || transitioning) return
    setTransitioning(true)
    setTimeout(() => { setScreenIdx(idx); setTransitioning(false) }, 200)
  }

  const CurrentComponent = current.component

  return (
    <div style={{
      fontFamily: "'Nunito Sans', system-ui, sans-serif",
      maxWidth: 680, margin: '0 auto', padding: '20px 16px',
      color: '#2C2C2A',
      paddingBottom: 0,
      marginBottom: -64,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#888780', fontWeight: 600, marginBottom: 6 }}>Interactive demo</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#2C2C2A', lineHeight: 1.2 }}>
          See kita<span style={{ fontWeight: 300 }}>run</span> in action
        </div>
        <div style={{ fontSize: 14, color: '#888780', marginTop: 6 }}>
          Explore the app through each role&apos;s eyes
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20,
        background: '#F1EFE8', borderRadius: 12, padding: 4,
      }}>
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRole(r.id)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: activeRole === r.id ? 'white' : 'transparent',
              color: activeRole === r.id ? r.color : '#888780',
              boxShadow: activeRole === r.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <span style={{ marginRight: 4, fontSize: 14 }}>{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2C2A' }}>{current.label}</div>
        <div style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>{current.desc}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <button
          onClick={() => goTo(Math.max(0, screenIdx - 1))}
          disabled={screenIdx === 0}
          style={{
            width: 36, height: 36, borderRadius: 18, border: '1px solid #E8E6E0',
            background: 'white', cursor: screenIdx === 0 ? 'default' : 'pointer',
            opacity: screenIdx === 0 ? 0.3 : 1, fontSize: 16, color: '#5F5E5A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'opacity 0.2s',
          }}
        >←</button>

        <div style={{
          opacity: transitioning ? 0.4 : 1,
          transform: transitioning ? 'scale(0.97)' : 'scale(1)',
          transition: 'all 0.2s ease',
        }}>
          <PhoneFrame>
            <CurrentComponent />
          </PhoneFrame>
        </div>

        <button
          onClick={() => goTo(Math.min(screens.length - 1, screenIdx + 1))}
          disabled={screenIdx === screens.length - 1}
          style={{
            width: 36, height: 36, borderRadius: 18, border: '1px solid #E8E6E0',
            background: 'white', cursor: screenIdx === screens.length - 1 ? 'default' : 'pointer',
            opacity: screenIdx === screens.length - 1 ? 0.3 : 1, fontSize: 16, color: '#5F5E5A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'opacity 0.2s',
          }}
        >→</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {screens.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            style={{
              width: i === screenIdx ? 24 : 8, height: 8, borderRadius: 4,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: i === screenIdx
                ? ROLES.find(r => r.id === activeRole)!.color
                : '#D3D1C7',
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <a
          href="/#contact"
          style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: 10,
            background: '#0F6E56', color: 'white', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', textDecoration: 'none',
          }}
        >
          Start your club →
        </a>
        <div style={{ fontSize: 12, color: '#888780', marginTop: 8 }}>
          We&apos;ll set you up and walk you through your first session
        </div>
      </div>
    </div>
  )
}
