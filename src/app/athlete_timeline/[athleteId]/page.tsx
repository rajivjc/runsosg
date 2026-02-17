import SpecGate from '@/components/SpecGate';
export default function Page({ params }: { params: { athleteId: string } }) { return <SpecGate screenId='athlete_timeline' routeParams={params} />; }
