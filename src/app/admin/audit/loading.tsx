export default function AuditLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-10">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />

      {/* Log entries skeleton */}
      <section className="animate-pulse">
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 bg-white flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-64" />
                <div className="h-3 bg-gray-100 rounded w-40" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
