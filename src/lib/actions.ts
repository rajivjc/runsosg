import { buildPath } from './path';
import { getValueByPath } from './paths';

export function selectAthleteByRouteParam(collection: any[], athleteId: string) {
  return collection.find((a) => a.id === athleteId);
}

export function mutatePrepend(arr: any[], item: any) {
  return [item, ...arr];
}

export function conditionalNavigate(flag: boolean, to: string, elseTo: string, params: Record<string, string>) {
  return buildPath(flag ? to : elseTo, params);
}

export function safeInterpolate(tpl: string, ctx: any) {
  return tpl.replace(/{{\s*([^}]+)\s*}}/g, (_, expr) => String(getValueByPath(ctx, expr.trim()) ?? ''));
}
