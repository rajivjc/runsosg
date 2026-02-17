import { appSpec } from '@/lib/spec';
import { buildPath } from '@/lib/path';
import { conditionalNavigate, mutatePrepend, safeInterpolate, selectAthleteByRouteParam } from '@/lib/actions';
import { filterTimeline } from '@/components/ScreenRenderer';

test('Unit-1 selectAthleteByRouteParam selects correct athlete', () => {
  expect(selectAthleteByRouteParam(appSpec.mockData.athletesFull, 'a1')?.name).toBe('Daniel');
});

test('Unit-2 mutateMock.prepend adds item at index 0', () => {
  expect(mutatePrepend([{ id: 2 }], { id: 1 })[0]).toEqual({ id: 1 });
});

test('Unit-3 filterBinding filters timeline by type', () => {
  const items = [{ type: 'session' }, { type: 'note' }];
  expect(filterTimeline(items, 'Notes', { Notes: 'note', All: '*' })).toEqual([{ type: 'note' }]);
});

test('Unit-4 conditionalNavigate chooses elseTo when false', () => {
  expect(conditionalNavigate(false, 'profile', 'login', {})).toBe('/login');
});

test('Unit-5 interpolation missing path returns "" and does not throw', () => {
  expect(safeInterpolate('x {{state.none}}', { state: {} })).toBe('x ');
});

test('Unit-6 buildPath constructs correct URL', () => {
  expect(buildPath('athlete_timeline', { athleteId: 'a1' })).toBe('/athlete_timeline/a1');
});
