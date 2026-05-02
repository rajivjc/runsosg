import type { Metadata } from 'next'
import Link from 'next/link'
import KitaLogo from '@/components/ui/KitaLogo'
import LandingNav from '@/components/landing/LandingNav'
import styles from '@/app/landing.module.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://kitarun.com'),
  title: 'Why I Built Kita',
  description: 'An athlete finished a 5km run and looked around to see if anyone was watching. We were. So I built Kita.',
  openGraph: {
    title: 'Why I Built Kita',
    description: 'An athlete finished a 5km run and looked around to see if anyone was watching. We were. So I built Kita.',
    url: 'https://kitarun.com/story',
    siteName: 'Kita',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why I Built Kita',
    description: 'An athlete finished a 5km run and looked around to see if anyone was watching. We were. So I built Kita.',
  },
}

export default function StoryPage() {
  return (
    <div className={styles.page}>
      {/* ========== NAV ========== */}
      <LandingNav />

      {/* ========== ESSAY ========== */}
      <main className={`${styles.section} ${styles.storySection}`} style={{ paddingTop: '128px' }}>
        <div className={styles.sectionInner}>
          <div className={styles.storyContent} style={{ maxWidth: '42rem' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#6B7280',
                textDecoration: 'none',
                marginBottom: '32px',
              }}
            >
              &larr; Back to home
            </Link>

            <h1
              style={{
                fontFamily: "'Nunito Sans', system-ui, sans-serif",
                fontSize: '40px',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: '#111827',
                margin: '0 0 32px',
              }}
            >
              Why I Built Kita
            </h1>

            <p className={styles.storyLede}>
              <em>An athlete finished a 5km run and looked around to see if anyone was watching.</em>
            </p>

            <p className={styles.storySectionMarker}>THE PROBLEM</p>

            <p className={styles.storyParagraph}>
              We were. But by next week, the only proof lived in a coach&apos;s memory and a group chat that had already moved on. These weren&apos;t casual jogs. These were hard-won kilometres by people who&apos;d been told, in a hundred small ways, that sport wasn&apos;t really for them.
            </p>

            <blockquote className={styles.storyCaregiverPullQuote}>
              Then a caregiver asked: &ldquo;How&apos;s she doing at running?&rdquo; Not therapy. Not behaviour. Just running &mdash; the way any parent asks about their kid&apos;s sport.
              <span className={styles.storyCaregiverCaption}>A Caregiver, after practice</span>
            </blockquote>

            <p className={styles.storySectionMarker}>THE GAP</p>

            <p className={styles.storyParagraph}>
              I didn&apos;t have a good answer. Not because I didn&apos;t know. Because nothing I had could show her.
            </p>

            <p className={styles.storyMoment}>
              So I built it.
            </p>

            <div className={styles.storyKitaCard}>
              <span className={styles.storyKitaDisplay}>kita</span>
              <p className={styles.storyKitaText}>
                <span className={styles.storyEtymologyKita}>Kita</span> means &ldquo;we&rdquo; in Malay and Indonesian &mdash; specifically the inclusive form that includes the listener. Not &ldquo;us and them.&rdquo; Just &ldquo;us.&rdquo;
              </p>
            </div>

            <p className={styles.storySectionMarker}>WHAT IT STANDS FOR</p>

            <div className={styles.storyValueGrid}>
              <div className={styles.storyValueCard}>
                <p className={styles.storyValueCardTitle}>Dignity first</p>
                <p className={styles.storyValueCardDesc}>
                  Athletes are athletes. Not clients, not participants, not &ldquo;special.&rdquo; The language, design, and celebrations all reflect that.
                </p>
              </div>
              <div className={styles.storyValueCard}>
                <p className={styles.storyValueCardTitle}>Privacy by design</p>
                <p className={styles.storyValueCardDesc}>
                  Medical info, coaching notes, and mood ratings are never public. Caregivers have veto power over what gets shared.
                </p>
              </div>
              <div className={styles.storyValueCard}>
                <p className={styles.storyValueCardTitle}>Sensory safety</p>
                <p className={styles.storyValueCardDesc}>
                  No flashing animations. No overwhelming sounds. Celebrations that feel warm, not startling.
                </p>
              </div>
              <div className={styles.storyValueCard}>
                <p className={styles.storyValueCardTitle}>Free and open source</p>
                <p className={styles.storyValueCardDesc}>
                  MIT licensed. No premium tier. No investor pressure. Built for clubs that need it, by someone who runs one.
                </p>
              </div>
            </div>

            <div className={styles.storyClosingCta}>
              <a
                href="https://medium.com/@rajiv.cheriyan/i-built-a-running-app-for-athletes-with-intellectual-disabilities-heres-what-i-had-to-unlearn-c9fcb6d36a18"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.storyMediumLinkCentered}
              >
                Originally published on Medium. Read the original essay &rarr;
              </a>

              <p className={styles.storyCtaTitle} style={{ marginTop: '32px' }}>
                Ready to make every kilometre count?
              </p>
              <p className={styles.storyCtaDesc}>
                We&apos;ll set up your club and walk you through your first session.
              </p>
              <Link href="/#contact" className={styles.storyCtaButton}>
                Set up my club &mdash; free &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <KitaLogo size={28} />
            <span className={styles.navWordmark}>
              <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>kita</span>
              <span style={{ fontWeight: 300, color: 'rgba(255,255,255,0.4)' }}>run</span>
            </span>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
            <Link href="/terms" className={styles.footerLink}>Terms</Link>
            <a href="mailto:hello@kitarun.com" className={styles.footerLink}>Contact</a>
            <a href="https://github.com/rajivjc/kita" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</a>
          </div>
          <p className={styles.footerTagline}>
            Built with care in Singapore. Kita means &ldquo;we&rdquo; &mdash; the kind that includes you.
          </p>
        </div>
      </footer>
    </div>
  )
}
