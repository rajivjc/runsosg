export default function AdminLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-10">
      <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />

      {/* Invite form skeleton */}
      <section className="animate-pulse">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 bg-gray-200 rounded-lg w-32" />
        </div>
      </section>

      {/* Users list skeleton */}
      <section className="animate-pulse">
        <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 bg-white flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
              <div className="h-7 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
