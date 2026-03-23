import ShareButton from '@/components/milestone/ShareButton'

interface StoryFooterProps {
  athleteName: string
  totalSessions: number
  totalKm: number
  storyUrl: string
  clubName: string
  tagline: string
}

export default function StoryFooter({
  athleteName,
  totalSessions,
  totalKm,
  storyUrl,
  clubName,
  tagline,
}: StoryFooterProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <ShareButton
        title={`${athleteName}'s Running Journey`}
        text={`${athleteName} has completed ${totalSessions} run${totalSessions !== 1 ? 's' : ''} covering ${totalKm.toFixed(1)}km with ${clubName}. ${tagline}!`}
        url={storyUrl}
        buttonText="Share this story"
      />
      <p className="text-xs text-text-hint font-medium uppercase tracking-widest">
        {clubName} — {tagline}
      </p>
      <p className="text-[10px] text-white/40 text-center max-w-xs">
        This page shows {athleteName}&apos;s running achievements and select coach reflections. No personal details, notes, or contact information are included.
      </p>
    </div>
  )
}
