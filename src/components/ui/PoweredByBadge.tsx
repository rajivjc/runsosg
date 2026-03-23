import Link from 'next/link'

// TODO: Phase C — rebrand to Kita
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
