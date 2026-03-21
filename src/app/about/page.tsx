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
            was watching. We were. But the place where I logged it
            wouldn&apos;t remember by next week. The group chat had already
            moved on. And I realized something was getting lost between the
            running and the record of it.
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
            And every week, coaches showed up too. Writing session notes on the
            bus home. Remembering which athlete needs a warm-up routine and
            which one needs to be left alone for the first five minutes.
            Carrying all of it in their heads because there was nowhere else to
            put it.
          </p>

          <p>
            Then a caregiver asked me a question that changed everything. Not
            how&apos;s her therapy going. Not how&apos;s her behaviour.
            Just &ldquo;how&apos;s she doing at running?&rdquo; The way any
            parent asks about their kid&apos;s sport. And I didn&apos;t have a
            good answer. Not because I didn&apos;t know. Because nothing I had
            could show her.
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
            means nothing without a progress bar beside it. That when an
            athlete&apos;s mood dips from session to session, a coach should
            know before the next run, not after. These weren&apos;t things I
            found in a handbook. They came from coaching, from watching what
            worked and what didn&apos;t, and from thinking hard about what
            I&apos;d want if this were my running app.
          </p>

          <p>
            I built a way for caregivers to send cheers before a session.
            Because a coach shouldn&apos;t be the only one who gets to
            say &ldquo;go for it&rdquo; on race day. I built a mood check-in
            with faces instead of words, because not everyone can name how they
            feel, but everyone can point to a face that matches. I let athletes
            pick their own colour in the app, because small choices matter when
            so many choices are made for you.
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

          <p>
            Coaches can finally see it all in one place. The session notes, the
            personal bests, the athlete who hasn&apos;t smiled at a run in three
            weeks. The things that used to live in your head now live somewhere
            that remembers. And the app tracks your milestones too, because
            fifty coached sessions is an achievement and someone should notice.
          </p>

          <p className="!mt-8">
            Because here&apos;s what coaching this community has taught me. The
            problem was never our athletes. And it was never our coaches. The
            problem was that the tools we had weren&apos;t built with any of us
            in mind. They were built for tracking, not for celebrating. They
            could record a distance but they couldn&apos;t tell an
            athlete&apos;s story. Our runners deserved better. And our coaches
            deserved better than carrying it all alone.
          </p>

          <p>
            I could have built something defined by disability. I built
            something defined by the sport. Because running 5km is hard. And it
            matters more when someone is there to see it.
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
