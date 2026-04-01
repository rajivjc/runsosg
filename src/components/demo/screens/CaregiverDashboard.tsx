import { DEMO_DATA } from '../demo-data'
import DemoBottomNav from '../DemoBottomNav'

export default function CaregiverDashboard() {
  const a = DEMO_DATA.athletes[0]
  return (
    <div style={{ padding: '0 14px 16px' }}>
      <div style={{ padding: '8px 0 12px' }}>
        <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>Your athlete</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2C2C2A', marginTop: 2 }}>Daniel&apos;s progress</div>
      </div>
      <div style={{
        background: `linear-gradient(135deg, ${a.color}12, ${a.color}08)`,
        borderRadius: 14, padding: '16px', marginBottom: 14, border: `1px solid ${a.color}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: a.color + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>{a.avatar}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2C2C2A' }}>Daniel</div>
            <div style={{ fontSize: 13, color: '#888780' }}>6-session streak 🔥</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([['This month', '8 runs'], ['Distance', '14.2 km'], ['Avg. feel', '😊 Happy'], ['Next milestone', '25 Sessions']] as const).map(([l, v], i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 11, color: '#888780' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>Coach Sarah&apos;s latest note</div>
      <div style={{
        background: 'white', borderRadius: 12, padding: '12px 14px', marginBottom: 14,
        border: '1px solid #E8E6E0',
      }}>
        <div style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 1.6 }}>
          &ldquo;Daniel had a great session today. Ran the full 2.3km without stopping — that&apos;s a first! He was really proud. Working toward 25 sessions next week.&rdquo;
        </div>
        <div style={{ fontSize: 12, color: '#888780', marginTop: 6 }}>Coach Sarah · Today, 10:15 AM</div>
      </div>
      <button style={{
        width: '100%', padding: '12px', borderRadius: 10,
        background: a.color, color: 'white', border: 'none',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        Send Daniel a cheer 💚
      </button>
      <DemoBottomNav active="feed" role="caregiver" />
    </div>
  )
}
