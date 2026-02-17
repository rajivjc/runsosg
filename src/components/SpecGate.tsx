'use client';
import ScreenRenderer from './ScreenRenderer';
import { validatedSpec } from '@/lib/spec';

export default function SpecGate({ screenId, routeParams = {} }: { screenId: string; routeParams?: Record<string, string> }) {
  if (!validatedSpec.ok) {
    return <main className="page"><h1>Spec validation error</h1><pre>{validatedSpec.errors.join('\n')}</pre></main>;
  }
  return <ScreenRenderer screenId={screenId} routeParams={routeParams} />;
}
