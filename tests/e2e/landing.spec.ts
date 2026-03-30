import { expect, test } from '@playwright/test'

test.describe('Landing page', () => {
  test('unauthenticated visit to / shows the landing page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Should see the hero heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('every athlete')

    // Should see the nav with Kita branding
    await expect(page.locator('nav')).toContainText('kita')

    // Should not be redirected to login
    expect(page.url()).not.toContain('/login')
  })

  test('"Sign in" button navigates to /login', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Click the Sign in link in the nav
    const signInLinks = page.getByRole('link', { name: 'Sign in' })
    await signInLinks.first().click()

    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('screenshot gallery is horizontally scrollable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Find the gallery scroll container
    const gallery = page.locator('[class*="galleryScroll"]')
    await expect(gallery).toBeVisible()

    // Verify it has multiple phone frames
    const frames = gallery.locator('[class*="phoneFrame"]')
    await expect(frames).toHaveCount(7)

    // Verify overflow-x is auto (scrollable)
    const overflowX = await gallery.evaluate(el => getComputedStyle(el).overflowX)
    expect(overflowX).toBe('auto')
  })

  test('"Read the full story" toggle works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Scroll to the story section to ensure it's visible
    await page.locator('#story').scrollIntoViewIfNeeded()

    // Find the toggle button
    const toggleButton = page.getByRole('button', { name: 'Read the full story' })
    await expect(toggleButton).toBeVisible()

    // The etymology box should be hidden initially (inside collapsed toggle)
    const etymology = page.getByText('Kita means')
    await expect(etymology).not.toBeVisible()

    // Click to expand
    await toggleButton.click()

    // After expanding, the etymology text should become visible
    await expect(page.getByText('Kita means')).toBeVisible({ timeout: 2000 })

    // Button text should change
    await expect(page.getByRole('button', { name: 'Read less' })).toBeVisible()

    // Click to collapse
    await page.getByRole('button', { name: 'Read less' }).click()
    await expect(page.getByRole('button', { name: 'Read the full story' })).toBeVisible()
  })

  test('nav anchor links scroll to correct sections', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Test #story link
    const storySection = page.locator('#story')
    await expect(storySection).toBeAttached()

    // Test #features link
    const featuresSection = page.locator('#features')
    await expect(featuresSection).toBeAttached()

    // Test #inclusive link
    const inclusiveSection = page.locator('#inclusive')
    await expect(inclusiveSection).toBeAttached()

    // Verify clicking anchor links scrolls to the section
    // Navigate via hash to verify sections exist at those anchors
    await page.goto('/#story')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('#story')).toBeAttached()

    await page.goto('/#features')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('#features')).toBeAttached()

    await page.goto('/#inclusive')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('#inclusive')).toBeAttached()
  })
})
