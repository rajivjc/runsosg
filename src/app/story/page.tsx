import type { Metadata } from 'next'
import Link from 'next/link'
import KitaLogo from '@/components/ui/KitaLogo'
import MobileNav from '@/components/landing/MobileNav'
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
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>
            <KitaLogo size={32} />
            <span className={styles.navWordmark}>
              <span className={styles.navWordmarkKita}>kita</span>
              <span className={styles.navWordmarkRun}>run</span>
            </span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/story" className={styles.navLink}>Our story</Link>
            <Link href="/#features" className={styles.navLink}>Features</Link>
            <Link href="/#inclusive" className={styles.navLink}>Accessibility</Link>
            <Link href="/demo" className={styles.navDemo}>See the app</Link>
            <a
              href="https://github.com/rajivjc/kita"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navGithub}
              aria-label="View source on GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
            <Link href="/login" className={styles.navSignIn}>Sign in</Link>
          </div>
          <MobileNav />
        </div>
      </nav>

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

            <blockquote className={styles.blockquote}>
              An athlete finished a 5km run and looked around to see if anyone was watching.
            </blockquote>

            <p className={styles.storyParagraph}>
              We were. But by next week, the only proof lived in a coach&apos;s memory and a group chat that had already moved on. These weren&apos;t casual jogs. These were hard-won kilometres by people who&apos;d been told, in a hundred small ways, that sport wasn&apos;t really for them.
            </p>

            <p className={styles.storyHighlight}>
              Then a caregiver asked: &ldquo;How&apos;s she doing at running?&rdquo; Not therapy. Not behaviour. Just running &mdash; the way any parent asks about their kid&apos;s sport.
            </p>

            <p className={styles.storyParagraph}>
              I didn&apos;t have a good answer. Not because I didn&apos;t know. Because nothing I had could show her.
            </p>

            <p className={styles.storyClosing}>
              So I built it.
            </p>

            <div className={styles.storyEtymology}>
              <span className={styles.storyEtymologyKita}>Kita</span> means &ldquo;we&rdquo; in Malay and Indonesian &mdash; specifically the inclusive form that includes the listener. Not &ldquo;us and them.&rdquo; Just &ldquo;us.&rdquo;
            </div>

            <a
              href="https://medium.com/@rajiv.cheriyan/i-built-a-running-app-for-athletes-with-intellectual-disabilities-heres-what-i-had-to-unlearn-c9fcb6d36a18"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.storyMediumLink}
            >
              Read the full essay &rarr;
            </a>
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
