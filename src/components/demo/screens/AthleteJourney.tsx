import { DEMO_DATA } from '../demo-data'

export default function AthleteJourney() {
  const a = DEMO_DATA.athletes[0]
  return (
    <div style={{ background: a.color + '08' }}>
      <div style={{
        background: `linear-gradient(135deg, ${a.color}, ${a.color}CC)`,
        borderRadius: '0 0 24px 24px', padding: '20px 16px 24px', color: 'white',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34,
          margin: '0 auto 8px', border: '2px solid rgba(255,255,255,0.3)',
        }}>{a.avatar}</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Daniel</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Sunrise Running Club</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14 }}>
          {([['23', 'Runs'], ['38.4', 'Total km'], ['6', 'Streak']] as const).map(([v, l], i) => (
            <div key={i}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '16px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 10 }}>How are you feeling today?</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          {['😔', '😐', '🙂', '😊', '😄'].map((e, i) => (
            <div key={i} style={{
              width: 48, height: 48, borderRadius: 14,
              background: i === 3 ? a.color + '18' : 'white',
              border: i === 3 ? `2px solid ${a.color}` : '1px solid #E8E6E0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              cursor: 'pointer',
            }}>{e}</div>
          ))}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 10 }}>My milestones</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 18 }}>
          {[
            { icon: '👟', name: 'First Run', done: true },
            { icon: '⭐', name: '5 Sessions', done: true },
            { icon: '🎯', name: '10km', done: true },
            { icon: '🏆', name: '25 Sessions', done: false },
          ].map((m, i) => (
            <div key={i} style={{
              minWidth: 80, padding: '10px 8px', borderRadius: 12, textAlign: 'center',
              background: m.done ? a.color + '12' : '#F1EFE8',
              border: m.done ? `1px solid ${a.color}30` : '1px solid #E8E6E0',
            }}>
              <div style={{ fontSize: 22, marginBottom: 2, opacity: m.done ? 1 : 0.4 }}>{m.icon}</div>
              <div style={{ fontSize: 11, color: m.done ? a.color : '#B4B2A9', fontWeight: m.done ? 600 : 400 }}>{m.name}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A', marginBottom: 10 }}>From Mum 💚</div>
        <div style={{
          background: 'white', borderRadius: 12, padding: '12px 14px',
          border: '1px solid #E8E6E0',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>💚</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>Great job today!</div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>From Mum · 2 hours ago</div>
        </div>
      </div>
    </div>
  )
}
