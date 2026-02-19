export default function AthletesLoading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />

      {/* Search input skeleton */}
      <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse mb-4" />

      {/* Card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 animate-pulse"
          >
            {/* Avatar */}
            <div className="rounded-full w-14 h-14 bg-gray-200 flex-shrink-0" />

            {/* Text lines */}
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>

            {/* Chevron */}
            <div className="h-5 w-5 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </main>
  )
}
