import { getValueByPath } from './paths';

const warned = new Set<string>();

export function interpolate(template: any, ctx: Record<string, any>) {
  if (typeof template !== 'string') return template;
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, expr) => {
    const value = getValueByPath(ctx, expr.trim());
    if (value === undefined || value === null) {
      if (process.env.NODE_ENV !== 'production' && !warned.has(expr)) {
        warned.add(expr);
        console.warn(`Missing interpolation path: ${expr}`);
      }
      return '';
    }
    return String(value);
  });
}
