import { DEMO_DATA } from '../demo-data'
import DemoBottomNav from '../DemoBottomNav'

export default function CoachFeed() {
  const d = DEMO_DATA
  return (
    <div style={{ padding: '0 14px 16px' }}>
      <div style={{ padding: '8px 0 12px' }}>
        <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>Good morning</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2C2C2A', marginTop: 2 }}>Sarah</div>
      </div>
      <div style={{
        background: '#FFF4EC', borderRadius: 12, padding: '12px 14px', marginBottom: 12,
        borderLeft: '3px solid #D85A30',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#993C1D', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Needs attention</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4A1B0C' }}>
            <span style={{ fontSize: 14 }}>📉</span>
            <span><b>Priya:</b> Feel declining (3→2→😔)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4A1B0C' }}>
            <span style={{ fontSize: 14 }}>🔗</span>
            <span>2 unmatched Strava activities</span>
          </div>
        </div>
      </div>
      <div style={{
        background: '#E8F5EE', borderRadius: 12, padding: '12px 14px', marginBottom: 12,
        borderLeft: '3px solid #0F6E56',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#085041', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Celebrate</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#04342C' }}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <span><b>Liam</b> hit <b>50km total distance!</b></span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8, marginTop: 4 }}>Recent sessions</div>
      {d.athletes.slice(0, 3).map((a, i) => (
        <div key={i} style={{
          background: 'white', borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          border: '1px solid #E8E6E0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: a.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{a.avatar}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{a.name}</div>
                <div style={{ fontSize: 12, color: '#888780' }}>{a.lastRun} · {a.lastFeel}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#888780' }}>Today</div>
          </div>
        </div>
      ))}
      <DemoBottomNav active="feed" role="coach" />
    </div>
  )
}
