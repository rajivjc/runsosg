export type RoleId = 'coach' | 'caregiver' | 'athlete'

export interface Athlete {
  name: string
  avatar: string
  color: string
  feel: number
  lastRun: string
  lastFeel: string
  streak: number
}

export interface Role {
  id: RoleId
  label: string
  icon: string
  color: string
}

export const DEMO_DATA = {
  club: { name: 'Sunrise Running Club', location: 'Melbourne, Australia' },
  athletes: [
    { name: 'Daniel', avatar: '🏃', color: '#0F6E56', feel: 4, lastRun: '2.3 km', lastFeel: '😊', streak: 6 },
    { name: 'Aisha', avatar: '⭐', color: '#534AB7', feel: 3, lastRun: '1.8 km', lastFeel: '😐', streak: 3 },
    { name: 'Liam', avatar: '🌊', color: '#185FA5', feel: 5, lastRun: '3.1 km', lastFeel: '😄', streak: 12 },
    { name: 'Priya', avatar: '🌻', color: '#BA7517', feel: 2, lastRun: '1.2 km', lastFeel: '😔', streak: 1 },
  ] as Athlete[],
}

export const ROLES: Role[] = [
  { id: 'coach', label: 'Coach', icon: '📋', color: '#0F6E56' },
  { id: 'caregiver', label: 'Caregiver', icon: '💚', color: '#534AB7' },
  { id: 'athlete', label: 'Athlete', icon: '🏅', color: '#BA7517' },
]
