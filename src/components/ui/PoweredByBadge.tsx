import Link from 'next/link'

export default function PoweredByBadge() {
  return (
    <footer className="absolute bottom-4 left-0 right-0 text-center">
      <Link
        href="/login"
        className="text-sm text-white/50 hover:text-white/70 transition-colors"
        aria-label="Visit SOSG Running Club Hub"
      >
        Powered by SOSG Running Club Hub
      </Link>
    </footer>
  )
}
