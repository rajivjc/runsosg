/**
 * Official "Powered by Strava" logo per Strava API Brand Guidelines.
 * Renders the horizontal orange PNG at a small size, right-aligned.
 * Do not alter the asset (no recolouring, filters, overlays).
 */
export default function PoweredByStrava({ className }: { className?: string }) {
  return (
    <div className={className ?? 'flex justify-end mt-2'}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Strava brand asset must not be altered */}
      <img
        src="/assets/strava/api_logo_pwrdBy_strava_horiz_orange.png"
        alt="Powered by Strava"
        width={110}
        height={24}
        style={{ display: 'block' }}
      />
    </div>
  )
}
