import rawSpec from '../../spec/appSpec.json';

export type AnyObj = Record<string, any>;
export type AppSpec = {
  app: AnyObj;
  state: AnyObj;
  routes: AnyObj;
  screens: { id: string; route: string; title: string; components: AnyObj[]; onEnter?: AnyObj[]; visibility?: { roles?: string[] } }[];
  templates: AnyObj;
  mockData: AnyObj;
  mockTemplates: AnyObj;
};

export const appSpec: AppSpec = rawSpec as AppSpec;

export function validateSpec(input: unknown): { ok: true; spec: AppSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const obj = input as AnyObj;
  for (const k of ['app', 'state', 'routes', 'screens', 'templates', 'mockData', 'mockTemplates']) {
    if (!(k in (obj || {}))) errors.push(`Missing required key: ${k}`);
  }
  if (!Array.isArray(obj?.screens)) {
    errors.push('screens must be an array');
  } else {
    obj.screens.forEach((screen: AnyObj, i: number) => {
      for (const key of ['id', 'route', 'components']) {
        if (!(key in (screen || {}))) errors.push(`screens[${i}] missing key: ${key}`);
      }
    });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, spec: obj as AppSpec };
}

export const validatedSpec = validateSpec(appSpec);
