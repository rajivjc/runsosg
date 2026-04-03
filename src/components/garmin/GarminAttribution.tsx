/**
 * Official "Works with the app Garmin Connect" badge per Garmin brand guidelines.
 * Renders only when garmin_sourced is true on a session.
 * Minimum display height: 88px per Garmin brand guidelines.
 * Do not alter the asset (no recolouring, filters, overlays).
 */
export default function GarminAttribution({ className }: { className?: string }) {
  return (
    <div className={className ?? 'flex justify-end mt-2'}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Garmin brand asset must not be altered */}
      <img
        src="/assets/garmin/works_with_garmin_connect.png"
        alt="Works with the app Garmin Connect"
        height={88}
        style={{ display: 'block', height: '88px', width: 'auto' }}
      />
    </div>
  )
}
