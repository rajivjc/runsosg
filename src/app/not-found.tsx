import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Page not found</h2>
      <p className="text-sm text-gray-500 mb-6">
        This page doesn&apos;t exist — let&apos;s head back.
      </p>
      <Link
        href="/feed"
        className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-6 py-2.5 transition-colors"
      >
        Go to Feed
      </Link>
    </main>
  )
}
