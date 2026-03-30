'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from '@/app/landing.module.css'

const screenshots = [
  { src: '/images/landing/landing-coach-feed.png', alt: 'Coach feed showing priority alerts, RSVP buttons, and weekly digest summary', label: 'Coach feed', desc: 'Priority alerts, RSVP, weekly digest', w: 731, h: 1480 },
  { src: '/images/landing/landing-athlete-journey.png', alt: 'Athlete Journey page with avatar, mood check-in, stats, and coach connection', label: 'Athlete Journey', desc: 'Avatar, mood, stats, coach connection', w: 724, h: 1480 },
  { src: '/images/landing/landing-milestone.png', alt: 'Milestone celebration page with dignified achievement badge and certificate download', label: 'Milestone earned', desc: 'Dignified celebration with certificate', w: 750, h: 1369 },
  { src: '/images/landing/landing-caregiver.png', alt: 'Caregiver view showing athlete progress, encouragement options, and coach notes', label: 'Caregiver view', desc: 'Progress, encouragement, coach notes', w: 750, h: 1432 },
  { src: '/images/landing/landing-session.png', alt: 'Session management showing schedule, RSVP status, and coach-athlete pairings', label: 'Session management', desc: 'Schedule, RSVP, coach-athlete pairings', w: 724, h: 1480 },
  { src: '/images/landing/landing-cues.png', alt: 'Athlete cues page showing helps, avoids, and coaching cues for personalized support', label: 'Athlete cues', desc: 'Helps, avoids, and coaching cues', w: 724, h: 1480 },
  { src: '/images/landing/landing-club-stats.png', alt: 'Club overview showing aggregate stats, recent sessions, and personal bests', label: 'Club overview', desc: 'Stats, sessions, and personal bests', w: 724, h: 1480 },
]

export default function ScreenshotGallery() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const checkWidth = () => setShowHint(window.innerWidth < 1100)
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  return (
    <div>
      <div ref={scrollRef} className={styles.galleryScroll}>
        {screenshots.map((s) => (
          <div key={s.src} className={styles.phoneFrame}>
            <Image
              src={s.src}
              alt={s.alt}
              width={s.w}
              height={s.h}
              loading="lazy"
              className={styles.phoneImage}
            />
            <div className={styles.phoneLabel}>
              <p className={styles.phoneLabelTitle}>{s.label}</p>
              <p className={styles.phoneLabelDesc}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {showHint && (
        <p className={styles.swipeHint}>Swipe to see more &rarr;</p>
      )}
    </div>
  )
}
