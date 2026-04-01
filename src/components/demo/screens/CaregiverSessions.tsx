import { DEMO_DATA } from '../demo-data'
import DemoBottomNav from '../DemoBottomNav'

export default function CaregiverSessions() {
  const a = DEMO_DATA.athletes[0]
  return (
    <div style={{ padding: '0 14px 16px' }}>
      <div style={{ padding: '8px 0 14px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2C2C2A' }}>Sessions</div>
        <div style={{ fontSize: 13, color: '#888780' }}>Upcoming sessions for Daniel</div>
      </div>

      <div style={{
        background: 'white', borderRadius: 12, padding: '14px', marginBottom: 8,
        border: '1px solid #E8E6E0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Saturday Training</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Sat, Apr 5 · 8:00 – 9:30 AM</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: '#E8F5EE', color: '#0F6E56' }}>Pairings out</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5F5E5A', marginBottom: 10 }}>
          <span>📍</span><span>Albert Park Lake, Track 2</span>
        </div>
        <div style={{
          background: `${a.color}08`, borderRadius: 8, padding: '10px 12px',
          border: `1px solid ${a.color}15`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: a.color, marginBottom: 4 }}>Daniel&apos;s pairing</div>
          <div style={{ fontSize: 13, color: '#2C2C2A' }}>Running with <b>Coach Sarah</b></div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Paired with Liam</div>
        </div>
      </div>

      <div style={{
        background: 'white', borderRadius: 12, padding: '14px', marginBottom: 8,
        border: '1px solid #E8E6E0',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Wednesday Run</div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Wed, Apr 9 · 5:30 – 6:30 PM</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5F5E5A', marginTop: 8 }}>
          <span>📍</span><span>Albert Park Lake, Track 2</span>
        </div>
        <div style={{ fontSize: 12, color: '#888780', marginTop: 8, fontStyle: 'italic' }}>
          Pairings not published yet
        </div>
      </div>

      <DemoBottomNav active="sessions" role="caregiver" />
    </div>
  )
}
