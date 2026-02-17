import { appSpec } from './spec';

export function buildPath(screenId: string, params: Record<string, string> = {}) {
  const screen = appSpec.screens.find((s) => s.id === screenId);
  if (!screen) return '/';
  const route = screen.route.replace(/:([A-Za-z0-9_]+)/g, (_, key) => params[key] ?? '');
  return `/${route}`;
}
