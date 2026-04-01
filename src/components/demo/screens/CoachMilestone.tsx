import DemoBottomNav from '../DemoBottomNav'

export default function CoachMilestone() {
  return (
    <div style={{ padding: '0 14px 16px' }}>
      <div style={{
        marginTop: 12, borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 50%, #5DCAA5 100%)',
        padding: '28px 20px', textAlign: 'center', color: 'white',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏅</div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85, marginBottom: 4 }}>Milestone achieved</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>50km Total Distance</div>
        <div style={{ fontSize: 15, opacity: 0.9 }}>Liam · March 28, 2026</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Share</div>
          <div style={{
            background: 'white', color: '#0F6E56', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Print certificate</div>
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>Liam&apos;s milestones</div>
      {[
        { name: 'First Run', date: 'Nov 2025', icon: '👟' },
        { name: '5 Sessions', date: 'Dec 2025', icon: '⭐' },
        { name: '10km Total', date: 'Jan 2026', icon: '🎯' },
        { name: '25 Sessions', date: 'Feb 2026', icon: '🏆' },
        { name: '50km Total', date: 'Mar 2026', icon: '🏅' },
      ].map((m, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
          borderBottom: i < 4 ? '1px solid #F1EFE8' : 'none',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: i === 4 ? '#E8F5EE' : '#F1EFE8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>{m.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{m.name}</div>
            <div style={{ fontSize: 12, color: '#888780' }}>{m.date}</div>
          </div>
          {i === 4 && <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#0F6E56', background: '#E8F5EE', padding: '3px 8px', borderRadius: 6 }}>New!</div>}
        </div>
      ))}
      <DemoBottomNav active="feed" role="coach" />
    </div>
  )
}
