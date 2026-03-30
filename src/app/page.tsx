import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import ScrollReveal from '@/components/landing/ScrollReveal'
import StoryToggle from '@/components/landing/StoryToggle'
import ScreenshotGallery from '@/components/landing/ScreenshotGallery'
import styles from './landing.module.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://kitarun.com'),
  title: 'Kita — The running app where every athlete belongs',
  description: 'Built for coaches, caregivers, and athletes with intellectual disabilities. Not a disability tool. A running app — designed so everyone is a first-class citizen.',
  openGraph: {
    title: 'Kita — The running app where every athlete belongs',
    description: 'Built for coaches, caregivers, and athletes with intellectual disabilities.',
    url: 'https://kitarun.com',
    siteName: 'Kita',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kita — The running app where every athlete belongs',
    description: 'Built for coaches, caregivers, and athletes with intellectual disabilities.',
  },
}

const MAILTO = "mailto:hello@kitarun.com?subject=I'd like to start a club on Kita"

function KitaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="96" fill="#0F766E" />
      <path d="M120 180 C200 180, 260 220, 340 256" stroke="white" strokeWidth="28" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M100 256 C180 256, 260 256, 380 256" stroke="white" strokeWidth="32" strokeLinecap="round" fill="none" />
      <path d="M120 332 C200 332, 260 292, 340 256" stroke="white" strokeWidth="28" strokeLinecap="round" fill="none" opacity="0.5" />
      <circle cx="380" cy="256" r="18" fill="white" />
    </svg>
  )
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
            <a href={MAILTO} className={styles.ctaPrimary}>
              Start your club &rarr;
            </a>
            <Link href="/login" className={styles.ctaSecondary}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ========== STORY ========== */}
      <section id="story" className={`${styles.section} ${styles.storySection}`}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <p className={styles.sectionLabel}>WHY I BUILT THIS</p>
            <div className={styles.storyContent}>
              <blockquote className={styles.blockquote}>
                It started with a moment I almost missed.
              </blockquote>
              <p className={styles.storyParagraph}>
                An athlete finished a 5km run and looked around to see if anyone was watching. We were. But the place where I logged it wouldn&apos;t remember by next week. The group chat had already moved on. And I realized something was getting lost between the running and the record of it.
              </p>

              <StoryToggle>
                <div style={{ paddingTop: '4px' }}>
                  <p className={styles.storyParagraph}>Recognition.</p>

                  <p className={styles.storyParagraph}>
                    Every week I watched our athletes show up, train hard, and push through things that would stop most people. And every week the evidence of that disappeared into chat threads and a coach&apos;s memory. These weren&apos;t casual jogs. These were hard-won kilometres by people who had been told, in a hundred small ways, that sport wasn&apos;t really for them.
                  </p>

                  <p className={styles.storyParagraph}>
                    And every week, coaches showed up too. Writing session notes on the bus home. Remembering which athlete needs a warm-up routine and which one needs to be left alone for the first five minutes. Carrying all of it in their heads because there was nowhere else to put it.
                  </p>

                  <p className={styles.storyParagraph}>
                    Then a caregiver asked me a question that changed everything. Not how&apos;s her therapy going. Not how&apos;s her behaviour. Just &ldquo;how&apos;s she doing at running?&rdquo; The way any parent asks about their kid&apos;s sport. And I didn&apos;t have a good answer. Not because I didn&apos;t know. Because nothing I had could show her.
                  </p>

                  <p className={styles.storyParagraph}>
                    That question deserved better. So I started building.
                  </p>

                  <p className={styles.storyParagraph}>
                    But the tool wasn&apos;t the hard part. The hard part was a question that became my north star. Would I design this the same way for any other adult runner? If the answer was no, I changed it.
                  </p>

                  <p className={styles.storyParagraph}>
                    I wrote &ldquo;so proud of you&rdquo; on a milestone card and stared at it. Would I say that to a 28 year old finishing a park run? No. I&apos;d say &ldquo;great run today.&rdquo; So that&apos;s what it says.
                  </p>

                  <p className={styles.storyParagraph}>
                    I built a confetti animation for achievements, then learned that for someone with sensory sensitivities, that celebration could feel like an assault. So I replaced it with a warm glow and a badge that stays on screen. Your moment shouldn&apos;t disappear before you&apos;ve had time to feel it.
                  </p>

                  <p className={styles.storyParagraph}>
                    I learned that &ldquo;you&apos;re on fire&rdquo; can frighten someone who takes language literally. That a number on a screen means nothing without a progress bar beside it. That when an athlete&apos;s mood dips from session to session, a coach should know before the next run, not after. These weren&apos;t things I found in a handbook. They came from coaching, from watching what worked and what didn&apos;t, and from thinking hard about what I&apos;d want if this were my running app.
                  </p>

                  <p className={styles.storyParagraph}>
                    I built a way for caregivers to send cheers before a session. Because a coach shouldn&apos;t be the only one who gets to say &ldquo;go for it&rdquo; on race day. I built a mood check-in with faces instead of words, because not everyone can name how they feel, but everyone can point to a face that matches. I let athletes pick their own colour in the app, because small choices matter when so many choices are made for you.
                  </p>

                  <p className={styles.storyParagraph}>
                    The hardest design challenge isn&apos;t making something accessible. It&apos;s making something so good that nobody thinks of it as accessible. Just an app. A running app. Their running app.
                  </p>

                  <p className={styles.storyParagraph}>
                    Athletes can log in themselves, see their own journey, and message their coach. They see at least everything their caregiver sees about them. That&apos;s not a feature. That&apos;s dignity.
                  </p>

                  <p className={styles.storyParagraph}>
                    Coaches can finally see it all in one place. The session notes, the personal bests, the athlete who hasn&apos;t smiled at a run in three weeks. The things that used to live in your head now live somewhere that remembers. And the app tracks your milestones too, because fifty coached sessions is an achievement and someone should notice.
                  </p>

                  <p className={styles.storyParagraph}>
                    Because here&apos;s what coaching this community has taught me. The problem was never our athletes. And it was never our coaches. The problem was that the tools we had weren&apos;t built with any of us in mind. They were built for tracking, not for celebrating. They could record a distance but they couldn&apos;t tell an athlete&apos;s story. Our runners deserved better. And our coaches deserved better than carrying it all alone.
                  </p>

                  <p className={styles.storyParagraph}>
                    I could have built something defined by disability. I built something defined by the sport. Because running 5km is hard. And it matters more when someone is there to see it.
                  </p>

                  <div className={styles.storyEtymology}>
                    <span className={styles.storyEtymologyKita}>Kita</span> means &ldquo;we&rdquo; in Malay and Indonesian — specifically the inclusive form that includes the listener. Not &ldquo;us and them.&rdquo; Just &ldquo;us.&rdquo;
                  </div>
                </div>
              </StoryToggle>
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
                <p className={styles.inclusiveCardText}>7:1 contrast everywhere</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Cognitive (W3C COGA)</p>
                <p className={styles.inclusiveCardText}>Literal language only</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Sensory safety</p>
                <p className={styles.inclusiveCardText}>Celebrations that don&apos;t overwhelm</p>
              </div>
              <div className={styles.inclusiveCard}>
                <p className={styles.inclusiveCardLabel}>Privacy by design</p>
                <p className={styles.inclusiveCardText}>Medical data never leaks</p>
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

      {/* ========== CTA ========== */}
      <section id="contact" className={styles.ctaSection}>
        <ScrollReveal>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Ready to start your club?</h2>
            <p className={styles.ctaDesc}>
              Kita is free and built for clubs like yours. Get in touch and we&apos;ll help you get set up.
            </p>
            <a href={MAILTO} className={styles.ctaPrimary}>
              Start your club &rarr;
            </a>
          </div>
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
