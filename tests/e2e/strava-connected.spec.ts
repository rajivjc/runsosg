import { expect, test } from '@playwright/test';

// The /strava/connected page is public and fully client-side.
// It shows a success or denied state after Strava OAuth.

test('Strava connected page shows success state', async ({ page }) => {
  await page.goto('/strava/connected');
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('heading', { name: 'Strava connected!' })).toBeVisible();
  await expect(page.getByText('Your runs will now sync automatically')).toBeVisible();
  await expect(page.getByText('Go back to the Kita app')).toBeVisible();
});

test('Strava connected page shows denied state', async ({ page }) => {
  await page.goto('/strava/connected?error=denied');
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByRole('heading', { name: 'Connection cancelled' })).toBeVisible();
  await expect(page.getByText('You chose not to connect your Strava account')).toBeVisible();
});

test('Strava connected success page has link to continue in browser', async ({ page }) => {
  await page.goto('/strava/connected');
  await page.waitForLoadState('domcontentloaded');

  const browserLink = page.getByRole('link', { name: /continue in browser/i });
  await expect(browserLink).toBeVisible();
  await expect(browserLink).toHaveAttribute('href', '/account?connected=strava');
});
