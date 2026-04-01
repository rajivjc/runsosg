import { IconHome, IconCalendar, IconUsers, IconBell, IconUser } from './DemoIcons'

interface DemoBottomNavProps {
  active: string
  role?: 'coach' | 'caregiver'
}

export default function DemoBottomNav({ active, role = 'coach' }: DemoBottomNavProps) {
  const coachTabs = [
    { id: 'feed', icon: IconHome, label: 'Feed' },
    { id: 'sessions', icon: IconCalendar, label: 'Sessions' },
    { id: 'athletes', icon: IconUsers, label: 'Athletes' },
    { id: 'alerts', icon: IconBell, label: 'Alerts' },
    { id: 'account', icon: IconUser, label: 'Account' },
  ]
  const caregiverTabs = [
    { id: 'feed', icon: IconHome, label: 'Feed' },
    { id: 'sessions', icon: IconCalendar, label: 'Sessions' },
    { id: 'athletes', icon: IconUsers, label: 'Athletes' },
    { id: 'account', icon: IconUser, label: 'Account' },
  ]
  const tabs = role === 'caregiver' ? caregiverTabs : coachTabs

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', padding: '8px 2px 6px',
      borderTop: '1px solid #E8E6E0', marginTop: 12, background: '#FBF9F7',
    }}>
      {tabs.map((it) => {
        const Icon = it.icon
        const isActive = active === it.id
        return (
          <div key={it.id} style={{
            textAlign: 'center', fontSize: 10, cursor: 'pointer',
            color: isActive ? '#0F6E56' : '#B4B2A9',
            fontWeight: isActive ? 600 : 400,
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '4px 2px', borderRadius: 8,
            background: isActive ? '#E8F5EE' : 'transparent',
          }}>
            <Icon size={18} stroke={isActive ? 2.5 : 2} />
            <span>{it.label}</span>
          </div>
        )
      })}
    </div>
  )
}
