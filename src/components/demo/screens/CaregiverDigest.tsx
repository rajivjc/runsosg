import DemoBottomNav from '../DemoBottomNav'

export default function CaregiverDigest() {
  return (
    <div style={{ padding: '0 14px 16px' }}>
      <div style={{ padding: '8px 0 12px' }}>
        <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>Weekly digest</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#2C2C2A', marginTop: 2 }}>Daniel&apos;s week</div>
        <div style={{ fontSize: 12, color: '#888780' }}>March 24 – 30, 2026</div>
      </div>
      <div style={{
        background: 'linear-gradient(135deg, #E8F5EE, #FBF9F7)', borderRadius: 14,
        padding: 16, marginBottom: 14, border: '1px solid #9FE1CB40',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([['Runs this week', '3'], ['Total distance', '6.8 km'], ['Avg. feel', '😊'], ['Streak', '6 sessions']] as const).map(([l, v], i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F6E56' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#888780' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 13, color: '#2C2C2A', lineHeight: 1.6, padding: '0 4px', marginBottom: 14 }}>
        Daniel ran 3 times this week, totalling 6.8 km. His feel ratings were consistently positive. Coach Sarah noted he&apos;s getting more confident with longer distances.
      </div>
      <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>Highlight</div>
      <div style={{
        background: '#FBF5EC', borderRadius: 12, padding: '12px 14px',
        border: '1px solid #FAC77540',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#854F0B' }}>🎯 Approaching milestone</div>
        <div style={{ fontSize: 13, color: '#633806', marginTop: 4 }}>
          Daniel is 2 sessions away from <b>25 Sessions!</b>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: '#FAC77540', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '92%', borderRadius: 3, background: '#BA7517' }} />
        </div>
      </div>
      <DemoBottomNav active="feed" role="caregiver" />
    </div>
  )
}
