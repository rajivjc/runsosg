import { expect, test } from '@playwright/test';

// These E2E tests verify the login page, which is the only page accessible
// without a running Supabase instance. Tests that require authentication
// should be run locally with Supabase running.

test('Login page renders with email input and submit button', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Verify heading
  await expect(page.getByRole('heading', { name: 'SOSG Running Club' })).toBeVisible();

  // Verify email input
  const emailInput = page.getByLabel('Email address');
  await expect(emailInput).toBeVisible();

  // Verify magic link button
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible();
});

test('Login page shows sign-in subtitle', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('Sign in to continue')).toBeVisible();
});

test('Protected routes redirect to login', async ({ page }) => {
  await page.goto('/feed');
  // Middleware should redirect unauthenticated users to /login
  await page.waitForURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'SOSG Running Club' })).toBeVisible();
});

test('Login page shows revoked message when error=revoked', async ({ page }) => {
  await page.goto('/login?error=revoked');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('Your access has been revoked')).toBeVisible();
});
