export default function StoryLoading() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 pb-28">
      <div className="text-center animate-pulse">
        <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4" />
        <div className="h-6 bg-gray-200 rounded-md w-40 mx-auto mb-3" />
        <div className="h-4 bg-gray-100 rounded-md w-56 mx-auto mb-6" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded-md w-full" />
          <div className="h-4 bg-gray-100 rounded-md w-5/6" />
          <div className="h-4 bg-gray-100 rounded-md w-4/6" />
        </div>
      </div>
    </main>
  )
}
