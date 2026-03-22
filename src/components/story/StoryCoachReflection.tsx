import type { StoryCoachReflection as ReflectionType } from '@/lib/story/data'

interface StoryCoachReflectionProps {
  reflection: ReflectionType
}

export default function StoryCoachReflection({ reflection }: StoryCoachReflectionProps) {
  const date = new Date(reflection.created_at).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  })

  return (
    <blockquote className="border-l-4 border-teal-300 bg-teal-50/50 dark:bg-teal-900/20 rounded-r-xl pl-4 pr-4 py-3">
      <p className="text-sm text-text-secondary leading-relaxed italic">
        &ldquo;{reflection.content}&rdquo;
      </p>
      <footer className="mt-2 flex items-center gap-2">
        {reflection.coach_name && (
          <span className="text-xs font-medium text-teal-600 dark:text-teal-300">
            {reflection.coach_name}
          </span>
        )}
        <span className="text-[10px] text-text-hint">{date}</span>
      </footer>
    </blockquote>
  )
}
