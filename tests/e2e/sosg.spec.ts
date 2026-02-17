import { expect, test } from '@playwright/test';

async function login(page: any, role: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const roleSelect = page.getByTestId('select-role_selector');
  await roleSelect.waitFor({ state: 'visible' });
  await roleSelect.selectOption(role);
  await page.waitForTimeout(500);
  const loginBtn = page.getByTestId('btn-btn_login');
  await loginBtn.waitFor({ state: 'visible' });
  await loginBtn.click();
  await page.waitForURL(/\/athlete_list$/,{ timeout: 30000 });
}

test('E2E-1 Volunteer -> list -> Daniel -> cues visible', async ({ page }) => {
  await login(page, 'VOLUNTEER');
  await page.getByTestId('athlete-card-a1').click();
  await expect(page).toHaveURL(/\/athlete_timeline\/a1$/);
  await expect(page.getByTestId('card-card_cues_pinned')).toContainText('Countdown cues');
});

test('E2E-2 Parent role gating', async ({ page }) => {
  await login(page, 'PARENT');
  await page.getByTestId('athlete-card-a1').click();
  await expect(page.getByTestId('btn-btn_add_note')).toHaveCount(0);
  await expect(page.getByTestId('btn-btn_import_strava')).toHaveCount(0);
});

test('E2E-3 Add coach note', async ({ page }) => {
  await login(page, 'VOLUNTEER');
  await page.getByTestId('athlete-card-a1').click();
  await page.getByTestId('btn-btn_add_note').click();
  await page.getByTestId('input-went_well').fill('Steady pace');
  await page.getByTestId('input-was_hard').fill('Tired at 20');
  await page.getByTestId('input-next_time').fill('Water at 15');
  await page.getByTestId('btn-btn_save_note').click();
  await expect(page.getByTestId('timeline-item-0')).toContainText('Coach note');
});

test('E2E-4 Strava connect + import', async ({ page }) => {
  await login(page, 'VOLUNTEER');
  await page.getByTestId('athlete-card-a1').click();
  await page.getByTestId('btn-btn_import_strava').click();
  await expect(page).toHaveURL(/\/strava_connect\/a1$/);
  await page.getByTestId('btn-btn_simulate_strava_connect').click();
  await expect(page).toHaveURL(/\/strava_import_review\/a1$/);
  await expect(page.getByTestId('list-candidate_activities')).toBeVisible();
  await page.getByTestId('btn-btn_import_selected').click();
  await expect(page).toHaveURL(/\/athlete_timeline\/a1$/);
  await expect(page.getByTestId('timeline-item-0')).toContainText('STRAVA');
});

test('E2E-5 Empty state', async ({ page }) => {
  await login(page, 'VOLUNTEER');
  await page.getByTestId('athlete-card-a2').click();
  await expect(page).toHaveURL(/\/athlete_timeline\/a2$/);
  await expect(page.getByText('No entries yet')).toBeVisible();
});
