interface StoryHeroProps {
  athleteName: string
  heroPhotoUrl: string | null
  avatar: string | null
  totalSessions: number
  totalKm: number
  milestoneCount: number
}

export default function StoryHero({
  athleteName,
  heroPhotoUrl,
  avatar,
  totalSessions,
  totalKm,
  milestoneCount,
}: StoryHeroProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {heroPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroPhotoUrl}
          alt={`${athleteName} running`}
          className="w-28 h-28 rounded-full object-cover mb-4 ring-4 ring-teal-100 shadow-lg"
        />
      ) : (
        <span className="text-7xl mb-4">{avatar ?? '🏃'}</span>
      )}
      <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-2">
        Running Journey
      </p>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{athleteName}</h1>

      {totalSessions > 0 && (
        <div className="flex items-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{totalSessions}</p>
            <p className="text-[10px] text-gray-400 font-medium">runs</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{totalKm.toFixed(1)}</p>
            <p className="text-[10px] text-gray-400 font-medium">km</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{milestoneCount}</p>
            <p className="text-[10px] text-gray-400 font-medium">milestones</p>
          </div>
        </div>
      )}
    </div>
  )
}
