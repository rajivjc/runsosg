import { DEMO_DATA } from '../demo-data'

export default function AthleteGoal() {
  const a = DEMO_DATA.athletes[0]
  return (
    <div style={{ padding: '12px 14px 16px', background: a.color + '04' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2A' }}>My running goal</div>
        <div style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>What do you want to work toward?</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { icon: '🏃', label: 'Run further', desc: 'Increase my distance each week', active: true },
          { icon: '😊', label: 'Have fun', desc: 'Enjoy every session', active: false },
          { icon: '👥', label: 'Run with friends', desc: 'Keep running with my group', active: false },
          { icon: '🏅', label: 'Earn milestones', desc: 'Collect all the badges', active: false },
        ].map((g, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
            borderRadius: 12, cursor: 'pointer',
            background: g.active ? a.color + '12' : 'white',
            border: g.active ? `2px solid ${a.color}` : '1px solid #E8E6E0',
          }}>
            <div style={{ fontSize: 24 }}>{g.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{g.label}</div>
              <div style={{ fontSize: 12, color: '#888780' }}>{g.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button style={{
        width: '100%', padding: '12px', borderRadius: 10, marginTop: 16,
        background: a.color, color: 'white', border: 'none',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>Save my goal</button>
    </div>
  )
}
