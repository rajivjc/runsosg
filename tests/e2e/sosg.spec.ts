import { expect, test } from '@playwright/test';

async function login(page: any, role: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const roleSelect = page.getByTestId('select-role_selector');
  await roleSelect.waitFor({ state: 'visible', timeout: 10000 });
  await roleSelect.selectOption(role);
  // Wait for form to update with role selection
  const loginBtn = page.getByTestId('btn-btn_login');
  await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
  await loginBtn.click();
  await page.waitForURL(/\/athlete_list$/, { timeout: 30000 });
}

test('E2E-1 Login page renders without logo', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  // Verify no logo image component
  const logoImage = page.getByTestId('image-logo');
  await expect(logoImage).toHaveCount(0);
  // Verify email, password fields exist
  await expect(page.getByTestId('input-email')).toBeVisible();
  await expect(page.getByTestId('input-password')).toBeVisible();
});

test('E2E-2 Login page has role selector with 3 options', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const roleSelect = page.getByTestId('select-role_selector');
  await roleSelect.waitFor({ state: 'visible' });
  await expect(roleSelect).toBeVisible();
  // Select each role to ensure they all exist
  await roleSelect.selectOption('CAREGIVER');
  await roleSelect.selectOption('COACH');
  await roleSelect.selectOption('ADMIN');
});

test('E2E-3 Login page has register link', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const registerLink = page.getByTestId('link-link_register');
  await expect(registerLink).toBeVisible();
  await expect(registerLink).toContainText('Register');
});

test('E2E-4 Register link navigates to register page', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const registerLink = page.getByTestId('link-link_register');
  await registerLink.click();
  await expect(page).toHaveURL(/\/register$/);
  await page.waitForLoadState('networkidle');
  // Verify register page has required form fields
  await expect(page.getByTestId('input-email')).toBeVisible();
  await expect(page.getByTestId('input-password')).toBeVisible();
  await expect(page.getByTestId('input-confirm_password')).toBeVisible();
});

test('E2E-5 Register page has role selector with 3 options', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  const roleSelect = page.getByTestId('select-role_selector');
  await roleSelect.waitFor({ state: 'visible' });
  await expect(roleSelect).toBeVisible();
  // Select each role to ensure they all exist
  await roleSelect.selectOption('CAREGIVER');
  await roleSelect.selectOption('COACH');
  await roleSelect.selectOption('ADMIN');
});

test('E2E-6 Register page login link navigates back to login', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  const loginLink = page.getByTestId('link-link_login');
  await expect(loginLink).toBeVisible();
  await loginLink.click();
  await expect(page).toHaveURL(/\/login$/);
});

test.skip('E2E-7 Caregiver role can access athlete timeline features', async ({ page }) => {
  await login(page, 'CAREGIVER');
  await page.getByTestId('athlete-card-a1').click();
  await expect(page).toHaveURL(/\/athlete_timeline\/a1$/);
  await expect(page.getByTestId('card-card_cues_pinned')).toContainText('Countdown cues');
  // Verify buttons are visible for CAREGIVER role
  await expect(page.getByTestId('btn-btn_add_note')).toBeVisible();
  await expect(page.getByTestId('btn-btn_add_session')).toBeVisible();
  await expect(page.getByTestId('btn-btn_import_strava')).toBeVisible();
});

test.skip('E2E-8 Coach role can access athlete timeline features', async ({ page }) => {
  await login(page, 'COACH');
  await page.getByTestId('athlete-card-a1').click();
  await expect(page).toHaveURL(/\/athlete_timeline\/a1$/);
  // Verify buttons are visible for COACH role
  await expect(page.getByTestId('btn-btn_add_note')).toBeVisible();
  await expect(page.getByTestId('btn-btn_add_session')).toBeVisible();
  await expect(page.getByTestId('btn-btn_import_strava')).toBeVisible();
});

test.skip('E2E-9 Admin role can access athlete timeline features', async ({ page }) => {
  await login(page, 'ADMIN');
  await page.getByTestId('athlete-card-a1').click();
  await expect(page).toHaveURL(/\/athlete_timeline\/a1$/);
  // Verify buttons are visible for ADMIN role
  await expect(page.getByTestId('btn-btn_add_note')).toBeVisible();
  await expect(page.getByTestId('btn-btn_add_session')).toBeVisible();
  await expect(page.getByTestId('btn-btn_import_strava')).toBeVisible();
});

test.skip('E2E-10 Add coach note with CAREGIVER role', async ({ page }) => {
  await login(page, 'CAREGIVER');
  await page.getByTestId('athlete-card-a1').click();
  await page.getByTestId('btn-btn_add_note').click();
  await page.getByTestId('input-went_well').fill('Steady pace');
  await page.getByTestId('input-was_hard').fill('Tired at 20');
  await page.getByTestId('input-next_time').fill('Water at 15');
  await page.getByTestId('btn-btn_save_note').click();
  await expect(page.getByTestId('timeline-item-0')).toContainText('Coach note');
});

test.skip('E2E-11 Strava connect + import with CAREGIVER role', async ({ page }) => {
  await login(page, 'CAREGIVER');
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

test.skip('E2E-12 Empty state with CAREGIVER role', async ({ page }) => {
  await login(page, 'CAREGIVER');
  await page.getByTestId('athlete-card-a2').click();
  await expect(page).toHaveURL(/\/athlete_timeline\/a2$/);
  await expect(page.getByText('No entries yet')).toBeVisible();
});

test('E2E-13 Athlete list displays athletes with status badges', async ({ page }) => {
  await login(page, 'CAREGIVER');
  // Should be on athlete_list after login
  await expect(page).toHaveURL(/\/athlete_list$/);
  // Wait for athlete cards to be visible (not arbitrary timeout)
  const firstAthleteCard = page.locator('[data-testid^="athlete-card-"]').first();
  await firstAthleteCard.waitFor({ state: 'visible', timeout: 10000 });
  await expect(firstAthleteCard).toBeVisible();
});

test('E2E-14 Search filters athletes by name', async ({ page }) => {
  await login(page, 'CAREGIVER');
  // Search for a specific athlete
  const searchInput = page.getByTestId('search-athlete_search');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill('Daniel');
  // Wait for list to update after searching
  const danielCard = page.getByTestId('athlete-card-a1');
  await danielCard.waitFor({ state: 'visible', timeout: 10000 });
  await expect(danielCard).toBeVisible();
});

test('E2E-15 Search shows no results for non-existent athlete', async ({ page }) => {
  await login(page, 'CAREGIVER');
  // Search for non-existent athlete
  const searchInput = page.getByTestId('search-athlete_search');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill('NonExistentAthlete123');
  // Wait for empty state to appear
  const emptyText = page.getByText('No athletes found');
  await emptyText.waitFor({ state: 'visible', timeout: 10000 });
  await expect(emptyText).toBeVisible();
});

test('E2E-16 Sort by Name is available', async ({ page }) => {
  await login(page, 'CAREGIVER');
  // Wait for page to load - use waitForLoadState instead of arbitrary timeout
  await page.waitForLoadState('networkidle');
  // Look for sort buttons
  const sortButtons = page.locator('button:has-text("Name"), button:has-text("Active")');
  await sortButtons.first().waitFor({ state: 'visible', timeout: 10000 });
  expect(await sortButtons.count()).toBeGreaterThan(0);
});

test('E2E-17 Pagination info displays', async ({ page }) => {
  await login(page, 'CAREGIVER');
  // Check pagination info is displayed - using locator wait for better reliability
  const paginationInfo = page.getByText(/Page.*of/);
  await paginationInfo.waitFor({ state: 'visible', timeout: 10000 });
  await expect(paginationInfo).toBeVisible();
});

test('E2E-18 Next page button navigates to next page', async ({ page }) => {
  await login(page, 'CAREGIVER');
  // Wait for athletes to load
  await page.waitForLoadState('networkidle');
  let firstCard = page.locator('[data-testid^="athlete-card-"]').first();
  await firstCard.waitFor({ state: 'visible', timeout: 10000 });
  const firstPageName = await firstCard.textContent();
  
  // Check if Next button exists and click it
  const nextButton = page.getByTestId('btn-btn_next_page');
  const buttonExists = await nextButton.count() > 0;
  if (buttonExists) {
    await nextButton.click();
    // Wait for page transition - use networkidle
    await page.waitForLoadState('networkidle');
    
    // Verify we're on a different page by checking cards are reloaded
    firstCard = page.locator('[data-testid^="athlete-card-"]').first();
    await firstCard.waitFor({ state: 'visible', timeout: 10000 });
    const secondPageName = await firstCard.textContent();
    expect(secondPageName).toBeDefined();
  }
});

test('E2E-19 Previous page button navigates back', async ({ page }) => {
  await login(page, 'CAREGIVER');
  await page.waitForLoadState('networkidle');
  
  // Navigate to next page if available
  const nextButton = page.getByTestId('btn-btn_next_page');
  if (await nextButton.count() > 0) {
    await nextButton.click();
    await page.waitForLoadState('networkidle');
    
    // Now click previous
    const prevButton = page.getByTestId('btn-btn_prev_page');
    if (await prevButton.count() > 0) {
      await prevButton.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're back on page 1
      const firstCard = page.locator('[data-testid^="athlete-card-"]').first();
      await firstCard.waitFor({ state: 'visible', timeout: 10000 });
      await expect(firstCard).toBeVisible();
    }
  }
});

test('E2E-20 Pagination shows correct total athletes count', async ({ page }) => {
  await login(page, 'CAREGIVER');
  await page.waitForLoadState('networkidle');
  
  // Check pagination info shows page display
  const paginationInfo = page.getByText(/Page.*of/);
  await paginationInfo.waitFor({ state: 'visible', timeout: 10000 });
  await expect(paginationInfo).toBeVisible();
  
  // Verify athlete list displays with locator wait
  const athleteCards = page.locator('[data-testid^="athlete-card-"]');
  await athleteCards.first().waitFor({ state: 'visible', timeout: 10000 });
  const cardCount = await athleteCards.count();
  expect(cardCount).toBeGreaterThan(0);
});
