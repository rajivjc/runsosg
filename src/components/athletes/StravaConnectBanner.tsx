export default function StravaConnectBanner() {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-orange-900">Connect your Strava account</p>
        <p className="text-xs text-orange-700 mt-0.5">
          Link Strava so your runs automatically sync to athlete profiles.
        </p>
      </div>
      <a
        href="/api/strava/connect"
        className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Connect
      </a>
    </div>
  )
}
