import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import ScrollReveal from '@/components/landing/ScrollReveal'
import ScreenshotGallery from '@/components/landing/ScreenshotGallery'
import ClubInquiryForm from '@/components/landing/ClubInquiryForm'
import FaqAccordion from '@/components/landing/FaqAccordion'
import HeroVideo from '@/components/landing/HeroVideo'
import KitaLogo from '@/components/ui/KitaLogo'
import LandingNav from '@/components/landing/LandingNav'
import styles from './landing.module.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://kitarun.com'),
  title: 'Kita — The running app where every athlete belongs',
  description: 'Coaches replace WhatsApp and paper logs with one dashboard. Caregivers get weekly progress updates. Athletes celebrate milestones on their own Journey page — no account needed.',
  openGraph: {
    title: 'Kita — The running app where every athlete belongs',
    description: 'Coaches replace WhatsApp and paper logs with one dashboard. Caregivers get weekly progress updates. Athletes celebrate milestones on their own Journey page — no account needed.',
    url: 'https://kitarun.com',
    siteName: 'Kita',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kita — The running app where every athlete belongs',
    description: 'Coaches replace WhatsApp and paper logs with one dashboard. Caregivers get weekly progress updates. Athletes celebrate milestones on their own Journey page — no account needed.',
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
      <LandingNav logoHref="#" />

      {/* ========== HERO ========== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.heroBadge}>Free &amp; open-source for inclusive running clubs</span>
            <h1 className={styles.heroTitle}>
              The running app where <span className={styles.heroTitleAccent}>every athlete</span> belongs
            </h1>
            <p className={styles.heroProblem}>
              One place for coaches to log runs, caregivers to see progress, and athletes to own every hard-won kilometre.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/demo" className={styles.ctaPrimary}>
                Try the demo &rarr;
              </Link>
              <a href="#contact" className={styles.ctaSecondary}>
                Set up my club — free &rarr;
              </a>
            </div>
            <div className={styles.heroFooter}>
              <p className={styles.heroAudience}>
                For Special Olympics clubs, adaptive programmes, and community running groups.
              </p>
            </div>
          </div>

          <div className={styles.heroVideoColumn}>
            <HeroVideo />
          </div>
        </div>
      </section>

      {/* ========== PROOF STRIP ========== */}
      <div className={styles.proofStrip}>
        Free forever &middot; Open source &middot; No athlete email needed &middot; Caregiver privacy controls &middot; Strava sync &middot; Built by a volunteer coach
      </div>

      {/* ========== STORY (teaser) ========== */}
      <section id="story" className={`${styles.section} ${styles.storySection}`}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.storyContent}>
              <p className={styles.sectionLabel}>WHY I BUILT THIS</p>
              <div className={styles.storyDivider} aria-hidden="true" />
              <blockquote className={styles.storyPullQuote}>
                An athlete finished a 5km run and looked around to see if anyone was watching.
              </blockquote>

              <p className={styles.storyParagraph}>
                We were. But by next week, the only proof lived in a coach&apos;s memory and a group chat that had already moved on.
              </p>

              <Link href="/story" className={styles.storyMediumLink}>
                Read the full story &rarr;
              </Link>
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
              Every screen is designed for the person using it — nothing more, nothing less.
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
            <h2 className={styles.sectionTitle}>Coaches log runs. Caregivers see progress. Athletes own their journey.</h2>
          </ScrollReveal>

          <div className={styles.personaGrid}>
            <ScrollReveal>
              <div className={`${styles.personaCard} ${styles.personaCardCoach}`}>
                <h3 className={styles.personaName}>Coach</h3>
                <p className={styles.personaOutcome}>Spend less time chasing updates, more time coaching.</p>
                <ul className={styles.personaList}>
                  {[
                    'Log runs manually or sync from Strava — milestones detected automatically',
                    'Schedule sessions with coach pairings and RSVP',
                    'Weekly narrative digests for every athlete, not just numbers',
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
                <p className={styles.personaOutcome}>See progress without needing to be at every session.</p>
                <ul className={styles.personaList}>
                  {[
                    'Every session, distance, and milestone in one place',
                    'Send cheers that coaches and athletes see',
                    'Control what gets shared — with veto power over public visibility',
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
                <p className={styles.personaOutcome}>A personal page that says: this progress is yours.</p>
                <ul className={styles.personaList}>
                  {[
                    'Scan a QR code, enter a PIN — no email, no account, just run',
                    'Choose your own avatar, colour, and running goals',
                    'Milestone celebrations designed to feel safe, not overwhelming',
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
            <div className={styles.comparison} role="table" aria-label="How Kita compares to other running apps">
              <div className={styles.comparisonHeader} role="row">
                <div className={`${styles.comparisonHeaderCell} ${styles.comparisonHeaderOther}`} role="columnheader">Other apps</div>
                <div className={`${styles.comparisonHeaderCell} ${styles.comparisonHeaderKita}`} role="columnheader">Kita</div>
              </div>
              {[
                ['“You’re on fire! 🔥”', '“Great run today.”'],
                ['Public leaderboards', 'Private milestones'],
                ['Confetti explosions', 'Calm, gentle celebration'],
                ['Requires email + password', 'QR code + 4-digit PIN'],
                ['Tiny icons, dense menus', 'Large buttons, clear labels'],
                ['Progress shared by default', 'Sharing is opt-in, caregiver veto'],
              ].map(([other, kita]) => (
                <div key={kita} className={styles.comparisonRow} role="row">
                  <div className={`${styles.comparisonCell} ${styles.comparisonCellOther}`} role="cell">{other}</div>
                  <div className={`${styles.comparisonCell} ${styles.comparisonCellKita}`} role="cell">{kita}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className={styles.inclusiveGrid}>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>WCAG 2.2 AAA</p>
                <p className={styles.inclusiveCardTitle}>7:1 contrast everywhere</p>
                <p className={styles.inclusiveCardDesc}>Text is easy to read in any lighting. Buttons are large enough for everyone. Screen readers work on every page.</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Cognitive (W3C COGA)</p>
                <p className={styles.inclusiveCardTitle}>Literal language only</p>
                <p className={styles.inclusiveCardDesc}>&ldquo;Great run today!&rdquo; not &ldquo;You&apos;re on fire!&rdquo; No metaphors that confuse literal thinkers. No infantilising praise. Warm but dignified.</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Sensory safety</p>
                <p className={styles.inclusiveCardTitle}>Celebrations that don&apos;t overwhelm</p>
                <p className={styles.inclusiveCardDesc}>Celebrations use gentle colours and calm animations. Athletes who are sensitive to motion or bright visuals still get their moment — just a quieter version.</p>
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
              </div>
              <div className={styles.howStep}>
                <div className={styles.howNumber}>2</div>
                <p className={styles.howStepTitle}>Add your athletes</p>
              </div>
              <div className={styles.howStep}>
                <div className={styles.howNumber}>3</div>
                <p className={styles.howStepTitle}>Start logging runs</p>
              </div>
            </div>
            <p className={styles.howReassurance}>
              We help you with setup. No technical skills needed.
            </p>
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

              <FaqAccordion
                items={[
                  {
                    question: 'Is Kita free?',
                    answer: (
                      <>
                        Yes. Kita is free for any inclusive running club and always will be. The code is <a href="https://github.com/rajivjc/kita" target="_blank" rel="noopener noreferrer" className={styles.faqLink}>open source on GitHub</a>.
                      </>
                    ),
                  },
                  {
                    question: 'Do athletes need an email account or smartphone?',
                    answer:
                      'No. Athletes access their personal Journey page by scanning a QR code and entering a 4-digit PIN. No email, no password, no app download required.',
                  },
                  {
                    question: 'Who can see athlete data?',
                    answer:
                      'Only people with a role in your club. Coaches see their athletes. Caregivers see only the athlete linked to them. Athletes see everything their caregiver sees. Medical information, coach notes, and feel ratings are never shown on public pages. Caregivers have veto power over what gets shared.',
                  },
                  {
                    question: 'Does it work with Strava?',
                    answer:
                      'Yes. Coaches can connect Strava and runs are automatically matched to athletes. You can also log sessions manually.',
                  },
                  {
                    question: 'Who built this?',
                    answer: (
                      <>
                        One person &mdash; a volunteer running coach in Singapore who needed a better way to track sessions and share progress with caregivers. The code is <a href="https://github.com/rajivjc/kita" target="_blank" rel="noopener noreferrer" className={styles.faqLink}>open source</a> and the full story is in the essay above.
                      </>
                    ),
                  },
                  {
                    question: 'Can I use Kita for other inclusive sports?',
                    answer:
                      "Kita is built for running clubs right now. The session tracking, milestones, and coaching tools are designed around running. If you run a different sport and want to explore it, get in touch — we'd love to hear what you need.",
                  },
                ]}
              />
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
            <a href="https://github.com/rajivjc/kita" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</a>
          </div>
          <p className={styles.footerTagline}>
            Built with care in Singapore. Kita means &ldquo;we&rdquo; — the kind that includes you.
          </p>
        </div>
      </footer>
    </div>
  )
}
