import { expect, test } from '@playwright/test';

// The /setup page is public and fully client-side (no data fetching).
// It shows PWA installation instructions for different device types.

test('Setup page renders heading and steps', async ({ page }) => {
  await page.goto('/setup');
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('heading', { name: 'Set Up SOSG Running Club' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add to Home Screen' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /all set/i })).toBeVisible();
});

test('Setup page has device tabs and switches content', async ({ page }) => {
  await page.goto('/setup');
  await page.waitForLoadState('domcontentloaded');

  const iphoneTab = page.getByRole('button', { name: 'iPhone / iPad' });
  const androidTab = page.getByRole('button', { name: 'Android' });
  const desktopTab = page.getByRole('button', { name: 'Computer' });

  await expect(iphoneTab).toBeVisible();
  await expect(androidTab).toBeVisible();
  await expect(desktopTab).toBeVisible();

  // Switch to Android tab and verify Android-specific content appears
  await androidTab.click();
  await expect(page.getByText('Chrome, Edge, Samsung Internet')).toBeVisible();

  // Switch to Desktop tab and verify desktop-specific content appears
  await desktopTab.click();
  await expect(page.getByText('Firefox or Safari?')).toBeVisible();

  // Switch back to iPhone tab and verify iOS-specific content
  await iphoneTab.click();
  await expect(page.getByText('You must use Safari for this step')).toBeVisible();
});

test('Setup page links to login', async ({ page }) => {
  await page.goto('/setup');
  await page.waitForLoadState('domcontentloaded');

  const loginLink = page.getByRole('link', { name: 'Go to Sign in' });
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toHaveAttribute('href', '/login');
});
