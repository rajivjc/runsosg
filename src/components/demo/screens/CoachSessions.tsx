import DemoBottomNav from '../DemoBottomNav'

export default function CoachSessions() {
  return (
    <div style={{ padding: '0 14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 14px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2C2C2A' }}>Sessions</div>
        <div style={{
          background: '#0F6E56', color: 'white', fontSize: 12, fontWeight: 600,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
        }}>+ New session</div>
      </div>

      <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>This week</div>

      {/* Upcoming session card */}
      <div style={{
        background: 'white', borderRadius: 12, padding: '14px', marginBottom: 8,
        border: '1px solid #E8E6E0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Saturday Training</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Sat, Apr 5 · 8:00 – 9:30 AM</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10,
            background: '#E8F5EE', color: '#0F6E56',
          }}>Published</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5F5E5A', marginBottom: 8 }}>
          <span>📍</span><span>Albert Park Lake, Track 2</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#5F5E5A' }}>
            <span style={{ fontWeight: 600, color: '#0F6E56' }}>3</span> coaches available
          </div>
          <div style={{ fontSize: 12, color: '#5F5E5A' }}>
            <span style={{ fontWeight: 600, color: '#0F6E56' }}>8</span> athletes attending
          </div>
        </div>
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 8,
          background: '#FBF5EC', border: '1px solid #FAC77530',
          fontSize: 12, color: '#854F0B', fontWeight: 500,
        }}>
          ⚡ Needs pairings — 8 athletes, 3 coaches
        </div>
      </div>

      {/* Second session */}
      <div style={{
        background: 'white', borderRadius: 12, padding: '14px', marginBottom: 8,
        border: '1px solid #E8E6E0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Wednesday Run</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Wed, Apr 9 · 5:30 – 6:30 PM</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10,
            background: '#F1EFE8', color: '#888780',
          }}>Draft</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5F5E5A' }}>
          <span>📍</span><span>Albert Park Lake, Track 2</span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>Completed</div>

      {/* Past session */}
      <div style={{
        background: 'white', borderRadius: 12, padding: '14px', marginBottom: 8,
        border: '1px solid #E8E6E0', opacity: 0.75,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Saturday Training</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>Sat, Mar 29 · 8:00 – 9:30 AM</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10,
            background: '#E8F5EE', color: '#0F6E56',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>✓ Completed</span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#888780' }}>
          <span>3 coaches</span><span>·</span><span>10 athletes</span><span>·</span><span>18.4 km total</span>
        </div>
      </div>

      <DemoBottomNav active="sessions" role="coach" />
    </div>
  )
}
