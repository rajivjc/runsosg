import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import ScrollReveal from '@/components/landing/ScrollReveal'
import ScreenshotGallery from '@/components/landing/ScreenshotGallery'
import ClubInquiryForm from '@/components/landing/ClubInquiryForm'
import KitaLogo from '@/components/ui/KitaLogo'
import styles from './landing.module.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://kitarun.com'),
  title: 'Kita — The running app where every athlete belongs',
  description: 'Built for coaches, caregivers, and athletes with intellectual disabilities. Not a disability tool. A running app — designed so everyone is a first-class citizen.',
  openGraph: {
    title: 'Kita — The running app where every athlete belongs',
    description: 'Built for coaches, caregivers, and athletes with intellectual disabilities. Track runs, celebrate milestones, and keep caregivers connected — all in one app.',
    url: 'https://kitarun.com',
    siteName: 'Kita',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kita — The running app where every athlete belongs',
    description: 'Built for coaches, caregivers, and athletes with intellectual disabilities. Track runs, celebrate milestones, and keep caregivers connected — all in one app.',
  },
}


function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
      <path d="M4 9l3.5 3.5L14 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/feed')
  }

  return (
    <div className={styles.page}>
      {/* ========== NAV ========== */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="#" className={styles.navLogo}>
            <KitaLogo size={32} />
            <span className={styles.navWordmark}>
              <span className={styles.navWordmarkKita}>kita</span>
              <span className={styles.navWordmarkRun}>run</span>
            </span>
          </a>
          <div className={styles.navLinks}>
            <a href="#story" className={styles.navLink}>Our story</a>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#inclusive" className={styles.navLink}>Accessibility</a>
            <Link href="/demo" className={styles.navDemo}>See the app</Link>
            <Link href="/login" className={styles.navSignIn}>Sign in</Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            The running app where <span className={styles.heroTitleAccent}>every athlete</span> belongs
          </h1>
          <p className={styles.heroSubtitle}>
            Built for coaches, caregivers, and athletes with intellectual disabilities. Not a disability tool. A running app — designed so everyone is a first-class citizen.
          </p>
          <p className={styles.heroAudience}>
            For Special Olympics clubs, inclusive running groups, and any programme where coaches, athletes, and caregivers need to stay connected.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/demo" className={styles.ctaPrimary}>
              See the app &rarr;
            </Link>
            <a href="#contact" className={styles.ctaSecondary}>
              Start your club &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ========== STORY ========== */}
      <section id="story" className={`${styles.section} ${styles.storySection}`}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.storyContent}>
              <p className={styles.sectionLabel}>WHY I BUILT THIS</p>
              <blockquote className={styles.blockquote}>
                An athlete finished a 5km run and looked around to see if anyone was watching.
              </blockquote>

              <p className={styles.storyParagraph}>
                We were. But by next week, the only proof lived in a coach&apos;s memory and a group chat that had already moved on. These weren&apos;t casual jogs. These were hard-won kilometres by people who&apos;d been told, in a hundred small ways, that sport wasn&apos;t really for them.
              </p>

              <p className={styles.storyHighlight}>
                Then a caregiver asked: &ldquo;How&apos;s she doing at running?&rdquo; Not therapy. Not behaviour. Just running — the way any parent asks about their kid&apos;s sport.
              </p>

              <p className={styles.storyParagraph}>
                I didn&apos;t have a good answer. Not because I didn&apos;t know. Because nothing I had could show her.
              </p>

              <p className={styles.storyClosing}>
                So I built it.
              </p>

              <div className={styles.storyEtymology}>
                <span className={styles.storyEtymologyKita}>Kita</span> means &ldquo;we&rdquo; in Malay and Indonesian — specifically the inclusive form that includes the listener. Not &ldquo;us and them.&rdquo; Just &ldquo;us.&rdquo;
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
          </ScrollReveal>
        </div>
      </section>

      {/* ========== SCREENSHOTS ========== */}
      <section id="screenshots" className={`${styles.section} ${styles.gallerySection}`}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <p className={styles.sectionLabel}>SEE IT IN ACTION</p>
            <h2 className={styles.sectionTitle}>Three roles. One app. Zero clutter.</h2>
            <p className={styles.sectionSubtitle}>
              Coaches log runs. Caregivers see progress. Athletes celebrate milestones. Each gets exactly the view they need.
            </p>
          </ScrollReveal>
          <ScreenshotGallery />
        </div>
      </section>

      {/* ========== PERSONAS ========== */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <p className={styles.sectionLabel}>BUILT FOR THREE ROLES</p>
            <h2 className={styles.sectionTitle}>Everyone has their own view</h2>
          </ScrollReveal>

          <div className={styles.personaGrid}>
            <ScrollReveal>
              <div className={`${styles.personaCard} ${styles.personaCardCoach}`}>
                <h3 className={styles.personaName}>Coach</h3>
                <ul className={styles.personaList}>
                  {[
                    'Log runs manually or sync from Strava',
                    'Schedule sessions with coach RSVP',
                    'Track per-athlete cues, mood, and feel trends',
                    'Automatic milestone detection and coaching alerts',
                    'Weekly narrative digests — not just numbers',
                  ].map((item) => (
                    <li key={item} className={styles.personaItem}>
                      <CheckIcon className={`${styles.personaCheck} ${styles.personaCheckCoach}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className={`${styles.personaCard} ${styles.personaCardCaregiver}`}>
                <h3 className={styles.personaName}>Caregiver</h3>
                <ul className={styles.personaList}>
                  {[
                    'See every session, distance, and milestone',
                    'Send cheers that coaches and athletes see',
                    'Control what gets shared publicly — with veto power',
                    'Weekly email digests with progress summaries',
                    'Peace of mind without being at every session',
                  ].map((item) => (
                    <li key={item} className={styles.personaItem}>
                      <CheckIcon className={`${styles.personaCheck} ${styles.personaCheckCaregiver}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className={`${styles.personaCard} ${styles.personaCardAthlete}`}>
                <h3 className={styles.personaName}>Athlete</h3>
                <ul className={styles.personaList}>
                  {[
                    'Personal Journey page — scan a QR code, enter a PIN',
                    'Choose your avatar, colour, and running goals',
                    'Sensory-safe milestone celebrations',
                    'Send preset messages to your coach',
                    'No email needed. No account needed. Just run.',
                  ].map((item) => (
                    <li key={item} className={styles.personaItem}>
                      <CheckIcon className={`${styles.personaCheck} ${styles.personaCheckAthlete}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ========== INCLUSIVE DESIGN ========== */}
      <section id="inclusive" className={`${styles.section} ${styles.inclusiveSection}`}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <p className={`${styles.sectionLabel} ${styles.inclusiveLabel}`}>BUILT DIFFERENTLY</p>
            <h2 className={`${styles.sectionTitle} ${styles.inclusiveTitle}`}>
              Accessibility is not a feature. It&apos;s the foundation.
            </h2>
            <p className={`${styles.sectionSubtitle} ${styles.inclusiveSubtitle}`}>
              Every design decision is tested against one question: &ldquo;Would I say this to a neurotypical adult runner?&rdquo; If not, it doesn&apos;t belong here.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <div className={styles.inclusiveGrid}>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>WCAG 2.2 AAA</p>
                <p className={styles.inclusiveCardTitle}>7:1 contrast everywhere</p>
                <p className={styles.inclusiveCardDesc}>Not AA. AAA. 56px+ touch targets on athlete pages. Semantic HTML. Live-region announcements for screen readers.</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Cognitive (W3C COGA)</p>
                <p className={styles.inclusiveCardTitle}>Literal language only</p>
                <p className={styles.inclusiveCardDesc}>&ldquo;Great run today!&rdquo; not &ldquo;You&apos;re on fire!&rdquo; No metaphors that confuse literal thinkers. No infantilising praise. Warm but dignified.</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Sensory safety</p>
                <p className={styles.inclusiveCardTitle}>Celebrations that don&apos;t overwhelm</p>
                <p className={styles.inclusiveCardDesc}>No seizure-risk animations. Soft coral instead of saturated red. Reduced-motion users still get their celebration — just a quieter version.</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Privacy by design</p>
                <p className={styles.inclusiveCardTitle}>Medical data never leaks</p>
                <p className={styles.inclusiveCardDesc}>Public pages never show medical info, feel ratings, or coach notes. Sharing is opt-in. Caregivers have veto power over what&apos;s visible.</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className={`${styles.section} ${styles.howSection}`}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <p className={styles.sectionLabel} style={{ textAlign: 'center' }}>HOW IT WORKS</p>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'center', margin: '0 auto' }}>
                Up and running in three steps
              </h2>
            </div>
            <div className={styles.howGrid}>
              <div className={styles.howStep}>
                <div className={styles.howNumber}>1</div>
                <p className={styles.howStepTitle}>Create your club</p>
                <p className={styles.howStepDesc}>
                  Get in touch and we&apos;ll set up your club with your name, timezone, and branding.
                </p>
              </div>
              <div className={styles.howStep}>
                <div className={styles.howNumber}>2</div>
                <p className={styles.howStepTitle}>Add your athletes</p>
                <p className={styles.howStepDesc}>
                  Invite coaches and caregivers, add athletes, and configure personal cues.
                </p>
              </div>
              <div className={styles.howStep}>
                <div className={styles.howNumber}>3</div>
                <p className={styles.howStepTitle}>Start logging runs</p>
                <p className={styles.howStepDesc}>
                  Log sessions manually or sync from Strava. Milestones, badges, and digests happen automatically.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section id="faq" className={`${styles.section} ${styles.faqSection}`}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.faqContent}>
              <p className={styles.sectionLabel}>COMMON QUESTIONS</p>
              <h2 className={styles.sectionTitle}>Everything you need to know</h2>

              <div className={styles.faqList}>
                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>Is Kita free?</h3>
                  <p className={styles.faqAnswer}>
                    Yes. Kita is free for any inclusive running club and always will be. The code is open source on GitHub.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>Do athletes need an email account or smartphone?</h3>
                  <p className={styles.faqAnswer}>
                    No. Athletes access their personal Journey page by scanning a QR code and entering a 4-digit PIN. No email, no password, no app download required.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>Who can see athlete data?</h3>
                  <p className={styles.faqAnswer}>
                    Only people with a role in your club. Coaches see their athletes. Caregivers see only the athlete linked to them. Athletes see everything their caregiver sees. Medical information, coach notes, and feel ratings are never shown on public pages. Caregivers have veto power over what gets shared.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>Does it work with Strava?</h3>
                  <p className={styles.faqAnswer}>
                    Yes. Coaches can connect Strava and runs are automatically matched to athletes. You can also log sessions manually.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>Who built this?</h3>
                  <p className={styles.faqAnswer}>
                    One person &mdash; a volunteer running coach in Singapore who needed a better way to track sessions and share progress with caregivers. The code is open source and the full story is in the essay above.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>Can I use Kita for other inclusive sports?</h3>
                  <p className={styles.faqAnswer}>
                    Kita is built for running clubs right now. The session tracking, milestones, and coaching tools are designed around running. If you run a different sport and want to explore it, get in touch &mdash; we&apos;d love to hear what you need.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section id="contact" className={styles.ctaSection}>
        <ScrollReveal>
          <ClubInquiryForm />
        </ScrollReveal>
      </section>

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
          </div>
          <p className={styles.footerTagline}>
            Built with care in Singapore. Kita means &ldquo;we&rdquo; — the kind that includes you.
          </p>
        </div>
      </footer>
    </div>
  )
}
