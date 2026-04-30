'use client'

import { useState } from 'react'
import styles from '@/app/landing.module.css'

const VIDEO_SRC = 'https://odqxyrel4xyhql1d.public.blob.vercel-storage.com/kita-overview-2026.mp4'
const POSTER_SRC = '/images/landing/kita-overview-poster.jpg'

export default function HeroVideo() {
  const [playing, setPlaying] = useState(false)

  return (
    <>
      <div className={styles.heroVideoFrame}>
        {playing ? (
          <video
            controls
            autoPlay
            playsInline
            poster={POSTER_SRC}
            className={styles.heroVideo}
            aria-label="Kita overview video, 4 minutes 12 seconds, silent walkthrough with captions"
          >
            <source src={VIDEO_SRC} type="video/mp4" />
            Your browser does not support video playback.{' '}
            <a href={VIDEO_SRC}>Download the video</a>.
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className={styles.heroVideoPlayButton}
            aria-label="Play overview video, 4 minutes 12 seconds"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={POSTER_SRC}
              alt=""
              className={styles.heroVideo}
              loading="eager"
            />
            <span className={styles.heroVideoPlayCircle} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M8 5l11 7-11 7V5z" fill="#0F766E" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <p className={styles.heroVideoCaption}>Watch overview &middot; 4:12</p>
      <details className={styles.heroVideoDetails}>
        <summary className={styles.heroVideoDetailsSummary}>What&apos;s in the video</summary>
        <div className={styles.heroVideoDetailsBody}>
          <p>A 4-minute silent walkthrough with background music. On-screen captions appear for each section.</p>
          <p>The video shows four perspectives: the coach view (club feed, athlete profiles, weekly summaries), coaching tools (planning sessions, pairing coaches with athletes), Strava integration (@-mentioning athletes in activity titles to sync runs into Kita), the caregiver view (progress and cheers from anywhere), and the athlete view (their personal QR-coded Journey page with stats and milestones).</p>
        </div>
      </details>
    </>
  )
}
