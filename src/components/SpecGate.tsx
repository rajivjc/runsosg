'use client';
import ScreenRenderer from './ScreenRenderer';
import { validatedSpec, appSpec } from '@/lib/spec';

export default function SpecGate({ screenId, routeParams = {} }: { screenId: string; routeParams?: Record<string, string> }) {
  if (!validatedSpec.ok) {
    return <main className="page"><h1>Spec validation error</h1><pre>{validatedSpec.errors.join('\n')}</pre></main>;
  }

  const screen = appSpec.screens.find((s) => s.id === screenId);
  const isCentered = (screen as any)?.layout?.type === 'centered';

  return (
    <div style={isCentered ? { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' } : undefined}>
      <ScreenRenderer screenId={screenId} routeParams={routeParams} />
    </div>
  );
}
