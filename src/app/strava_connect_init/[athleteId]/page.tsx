import SpecGate from '@/components/SpecGate';

export default function StravaConnectInitPage({ params }: { params: { athleteId: string } }) {
  return <SpecGate screenId="strava_connect_init" routeParams={params} />;
}
