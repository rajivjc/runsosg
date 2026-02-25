import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load dummy Supabase env vars for the dev server so the app starts
// without a real Supabase instance. The file is gitignored.
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', headless: true },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
  },
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
