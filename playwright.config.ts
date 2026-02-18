import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', headless: true },
  webServer: { command: 'npm run dev', port: 3000, timeout: 120000 },
  outputDir: './test-results/artifacts',
  testMatch: '**/*.spec.ts',
  retries: 0, // No retries in CI - tests must be deterministic
  timeout: 30000, // 30s per test
  fullyParallel: false, // Sequential execution for deterministic results
  workers: 1, // Single worker to avoid race conditions
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
  ],
});
