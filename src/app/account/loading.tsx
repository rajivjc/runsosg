export default function AccountLoading() {
  return (
    <main className="max-w-xl mx-auto px-4 py-8 pb-24 space-y-8">
      <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />

      {/* Name form skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded-lg" />
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
      </div>

      {/* Strava status skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 animate-pulse">
        <div className="h-5 w-24 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-10 bg-gray-200 rounded-lg w-40" />
      </div>

      {/* Sign out skeleton */}
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg w-28" />
      </div>
    </main>
  )
}
