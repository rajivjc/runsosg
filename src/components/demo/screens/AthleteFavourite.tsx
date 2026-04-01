import { DEMO_DATA } from '../demo-data'

export default function AthleteFavourite() {
  const a = DEMO_DATA.athletes[0]
  return (
    <div style={{ padding: '12px 14px 16px', background: a.color + '04' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2A', marginBottom: 12 }}>My favourite runs ❤️</div>
      {[
        { date: 'Mar 28', dist: '2.3 km', feel: '😊', note: 'Ran the whole way!' },
        { date: 'Mar 15', dist: '2.1 km', feel: '😄', note: 'Best time ever' },
        { date: 'Feb 22', dist: '1.8 km', feel: '😊', note: 'Ran with Liam' },
      ].map((r, i) => (
        <div key={i} style={{
          background: 'white', borderRadius: 12, padding: '14px', marginBottom: 8,
          border: '1px solid #E8E6E0', position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 16, color: '#D85A30' }}>❤️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 22 }}>{r.feel}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2A' }}>{r.dist}</div>
              <div style={{ fontSize: 12, color: '#888780' }}>{r.date}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#5F5E5A', fontStyle: 'italic' }}>&ldquo;{r.note}&rdquo;</div>
        </div>
      ))}
      <div style={{ fontSize: 13, color: '#888780', textAlign: 'center', padding: '12px', fontStyle: 'italic' }}>
        Tap ❤️ on any run to add it here
      </div>
    </div>
  )
}
