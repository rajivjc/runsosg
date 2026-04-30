import type { Metadata } from 'next'
import DemoPage from '@/components/demo/DemoPage'
import LandingNav from '@/components/landing/LandingNav'

export const metadata: Metadata = {
  title: 'See Kita in action — Interactive demo',
  description:
    'Explore the coach, caregiver, and athlete experience in Kita — the running app where every athlete belongs.',
  openGraph: {
    title: 'See Kita in action — Interactive demo',
    description:
      'Explore the coach, caregiver, and athlete experience. Built for inclusive running clubs.',
    url: 'https://kitarun.com/demo',
    siteName: 'Kita',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'See Kita in action — Interactive demo',
    description:
      'Explore the coach, caregiver, and athlete experience. Built for inclusive running clubs.',
  },
}

export default function DemoPageRoute() {
  return (
    <>
      <LandingNav />
      <div style={{ paddingTop: 64 }}>
        <DemoPage />
      </div>
    </>
  )
}
