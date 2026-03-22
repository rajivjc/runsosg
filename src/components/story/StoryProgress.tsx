import type { ProgressComparison } from '@/lib/story/narrative'

interface StoryProgressProps {
  progress: ProgressComparison
}

export default function StoryProgress({ progress }: StoryProgressProps) {
  if (
    !progress.hasEnoughData ||
    progress.firstSessionDistance == null ||
    progress.recentSessionDistance == null
  ) {
    return null
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-bold text-teal-600 dark:text-teal-300 uppercase tracking-wide mb-3">
        Progress
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-raised rounded-xl p-4 text-center">
          <p className="text-[10px] text-text-hint font-medium uppercase mb-1">
            First run
          </p>
          <p className="text-xl font-extrabold text-text-primary">
            {progress.firstSessionDistance.toFixed(1)}
          </p>
          <p className="text-[10px] text-text-hint">km</p>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 text-center">
          <p className="text-[10px] text-teal-500 font-medium uppercase mb-1">
            Most recent
          </p>
          <p className="text-xl font-extrabold text-teal-700 dark:text-teal-300">
            {progress.recentSessionDistance.toFixed(1)}
          </p>
          <p className="text-[10px] text-teal-400">km</p>
        </div>
      </div>
      {progress.recentSessionDistance > progress.firstSessionDistance && (
        <p className="text-xs text-text-muted text-center mt-2">
          Distance has grown from {progress.firstSessionDistance.toFixed(1)}km to{' '}
          {progress.recentSessionDistance.toFixed(1)}km.
        </p>
      )}
    </section>
  )
}
