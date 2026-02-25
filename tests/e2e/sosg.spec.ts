import { expect, test } from '@playwright/test';

// These E2E tests verify pages accessible without a running Supabase instance.
// Tests that require authentication should be run locally with Supabase running.

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

test('Login page renders with email input and submit button', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('heading', { name: 'SOSG Running Club' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByRole('button', { name: /send login code/i })).toBeVisible();
});

test('Login page shows sign-in subtitle', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('Sign in to continue')).toBeVisible();
});

test('Login page shows revoked message when error=revoked', async ({ page }) => {
  await page.goto('/login?error=revoked');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('Your access has been revoked')).toBeVisible();
});

test('Login page email input accepts text and button is enabled', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.getByLabel('Email address');
  await emailInput.fill('coach@example.com');
  await expect(emailInput).toHaveValue('coach@example.com');

  const submitButton = page.getByRole('button', { name: /send login code/i });
  await expect(submitButton).toBeEnabled();
});

test('Login page shows helper text about magic link', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('6-digit code to sign in')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Protected route redirects
// ---------------------------------------------------------------------------

const protectedRoutes = ['/feed', '/athletes', '/admin', '/account', '/notifications'];

for (const route of protectedRoutes) {
  test(`Protected route ${route} redirects to login`, async ({ page }) => {
    await page.goto(route);
    await page.waitForURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'SOSG Running Club' })).toBeVisible();
  });
}
