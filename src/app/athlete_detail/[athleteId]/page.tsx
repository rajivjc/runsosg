import SpecGate from '@/components/SpecGate';

export default function AthleteDetailPage({ params }: { params: { athleteId: string } }) {
  return <SpecGate screenId="athlete_detail" routeParams={params} />;
}
