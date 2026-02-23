export default function AthletesLoading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-28 bg-gray-200 rounded-md animate-pulse" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      {/* Search input skeleton */}
      <div className="h-11 w-full bg-gray-50 border border-gray-100 rounded-xl animate-pulse mb-4" />

      {/* Card skeletons */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 animate-pulse"
          >
            {/* Avatar */}
            <div className="rounded-full w-12 h-12 bg-gray-100 flex-shrink-0" />

            {/* Text lines */}
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-2/5" />
              <div className="h-3 bg-gray-100 rounded-md w-1/3" />
              <div className="flex gap-1.5 mt-1">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="w-2.5 h-2.5 bg-gray-100 rounded-full" />
                ))}
              </div>
            </div>

            {/* Chevron */}
            <div className="h-4 w-4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </main>
  )
}
