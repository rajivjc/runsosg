import SpecGate from '@/components/SpecGate';
export default function Page({ params }: { params: { athleteId: string } }) { return <SpecGate screenId='strava_import_review' routeParams={params} />; }
