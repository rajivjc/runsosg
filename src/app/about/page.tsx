import type { Metadata } from 'next'
import ShareButton from '@/components/milestone/ShareButton'
import CloseButton from '@/components/milestone/CloseButton'

export const metadata: Metadata = {
  title: 'Why I Built This — SOSG Running Club',
  description:
    'The story behind SOSG Running Club Hub — a running app built for athletes with special needs, designed with dignity.',
  openGraph: {
    title: 'Why I Built This — SOSG Running Club',
    description:
      'The story behind SOSG Running Club Hub — a running app built for athletes with special needs, designed with dignity.',
    type: 'article',
  },
}

export default function AboutPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6 py-12">
      <CloseButton />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl px-8 py-10 sm:px-12 sm:py-14">
        {/* Section label */}
        <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-4">
          Our Story
        </p>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Why I Built This
        </h1>

        {/* Essay body */}
        <div className="space-y-5 text-base text-gray-700 leading-relaxed">
          <p>
            It started with a moment I almost missed.
          </p>

          <p>
            An athlete finished a 5km run and looked around to see if anyone
            noticed. They had. But the spreadsheet where I logged it wouldn&apos;t
            remember by next week. The group chat had already moved on. And I
            realized something was getting lost between the running and the
            record of it.
          </p>

          {/* Standalone dramatic beat */}
          <p>
            Recognition.
          </p>

          <p>
            Every week I watched our athletes show up, train hard, and push
            through things that would stop most people. And every week the
            evidence of that disappeared into chat threads and a coach&apos;s
            memory. These weren&apos;t casual jogs. These were hard-won
            kilometres by people who had been told, in a hundred small ways,
            that sport wasn&apos;t really for them.
          </p>

          <p>
            Then a caregiver asked me a question that changed everything. Not
            how&apos;s her therapy going. Not how&apos;s her behaviour.
            Just &ldquo;how&apos;s she doing at running?&rdquo; The way any
            parent asks about their kid&apos;s sport. And I didn&apos;t have a
            good answer.
          </p>

          <p className="!mb-8">
            That question deserved better. So I started building.
          </p>

          <p>
            But the tool wasn&apos;t the hard part. The hard part was a question
            that became my north star. Would I design this the same way for any
            other adult runner? If the answer was no, I changed it.
          </p>

          <p>
            I wrote &ldquo;so proud of you&rdquo; on a milestone card and
            stared at it. Would I say that to a 28 year old finishing a park
            run? No. I&apos;d say &ldquo;great run today.&rdquo; So that&apos;s
            what it says.
          </p>

          <p>
            I built a confetti animation for achievements, then learned that for
            someone with sensory sensitivities, that celebration could feel like
            an assault. So I replaced it with a warm glow and a badge that stays
            on screen. Your moment shouldn&apos;t disappear before you&apos;ve
            had time to feel it.
          </p>

          <p>
            I learned that &ldquo;you&apos;re on fire&rdquo; can frighten
            someone who takes language literally. That a number on a screen
            means nothing without a progress bar beside it. Every one of these
            lessons came from listening, from getting it wrong, from the
            athletes and caregivers who trusted me enough to say &ldquo;that
            doesn&apos;t work for me.&rdquo;
          </p>

          <p>
            The hardest design challenge isn&apos;t making something accessible.
            It&apos;s making something so good that nobody thinks of it as
            accessible. Just an app. A running app. Their running app.
          </p>

          <p>
            Athletes can log in themselves, see their own journey, and message
            their coach. They see at least everything their caregiver sees about
            them. That&apos;s not a feature. That&apos;s dignity.
          </p>

          <p className="!mt-8">
            Because here&apos;s what coaching this community has taught me. The
            problem was never our athletes. The problem was that the tools we
            had weren&apos;t built with them in mind. Spreadsheets don&apos;t
            celebrate anyone. Group chats lose everything. Our runners deserved
            the same experience any athlete gets when they open an app after a
            good session and see proof that it mattered.
          </p>

          <p>
            I could have built a special needs tracker. I built a running app
            instead. Because running 5km is hard. And it matters more when
            someone is there to see it.
          </p>
        </div>

        {/* Divider */}
        <div className="w-12 h-0.5 bg-teal-200 mx-auto my-8" />

        {/* CTA */}
        <div className="bg-teal-50 rounded-2xl px-6 py-5 text-center">
          <p className="text-base text-teal-800 font-medium">
            If you&apos;re a coach and this sounds familiar, we&apos;d love to
            hear from you.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <ShareButton
            title="Why I Built This — SOSG Running Club"
            text="The story behind SOSG Running Club Hub — a running app built for athletes with special needs, designed with dignity."
            url={`${appUrl}/about`}
            buttonText="Share this story"
          />
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest">
            SOSG Running Club — Growing Together
          </p>
        </div>
      </div>
    </div>
  )
}
