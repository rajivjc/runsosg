# SOSG Running Club Hub prototype v2

JSON-driven Next.js App Router prototype for SOSG running workflows.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login`.

## Persistence

Persistence is opt-in only and enabled with query param:

- `http://localhost:3000/login?persist=1`

When enabled, app state + mockData hydrates/saves from localStorage key `sosg-store-v1`.
Without `persist=1`, the app never persists.

## Architecture

- `spec/appSpec.json`: source of truth for screens/routes/actions/templates.
- `src/components/ScreenRenderer.tsx`: generic screen/component renderer and action engine.
- `src/lib/store.ts`: Zustand store with `getByPath`, `setByPath`, `mutateMock` (`prepend`, `prependMany`).
- `src/lib/path.ts`: required `buildPath(screenId, params)` helper based on spec route patterns.
- `tests/unit/actions.spec.ts`: Jest unit coverage for core deterministic behavior.
- `tests/e2e/sosg.spec.ts`: Playwright E2E for role gating, note flow, Strava flow, and empty state.


## CI

CI is source of truth since Codex env can’t reach npm registry.
The GitHub Actions workflow runs `npm ci`, `npm run build`, `npm test`, and headless Playwright E2E (with browser installation).
The CI workflow file is `.github/workflows/ci.yml` and runs on pull requests to validate this prototype.

## Tests

```bash
npm run test
npm run test:e2e
npm run build
```
