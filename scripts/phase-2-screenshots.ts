import { chromium } from 'playwright';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = 'test-results/phase-2-screenshots';

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 667 },
];

const screens = [
  { name: 'login', path: '/login' },
  { name: 'athlete-list', path: '/athlete_list?role=COACH', waitFor: '.app-nav-tab' },
  { name: 'athlete-detail', path: '/athlete_detail/a1?role=COACH', waitFor: '.app-page-title, h1' },
];

async function captureScreenshots() {
  const browser = await chromium.launch();

  for (const screen of screens) {
    for (const viewport of viewports) {
      const context = await browser.createContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      try {
        // Navigate to screen
        await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle' });

        // Wait for element to ensure page is loaded
        if (screen.waitFor) {
          await page.waitForSelector(screen.waitFor, { timeout: 5000 });
        }

        // Simulate login if on list/detail (token not persisted)
        if (screen.path.includes('athlete_list') || screen.path.includes('athlete_detail')) {
          // Set auth state in localStorage
          await page.evaluate(() => {
            localStorage.setItem('sosg-store-v1', JSON.stringify({
              state: { authed: true, role: 'COACH' },
            }));
          });
          // Reload to apply auth
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForSelector(screen.waitFor, { timeout: 5000 });
        }

        // Take screenshot
        const filename = `${SCREENSHOTS_DIR}/phase-2-${screen.name}-${viewport.name}.png`;
        await page.screenshot({ path: filename, fullPage: false });
        console.log(`✅ Captured: ${filename}`);
      } catch (error) {
        console.error(`❌ Error capturing ${screen.name} (${viewport.name}):`, error);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('\n✅ All screenshots captured successfully!');
}

captureScreenshots().catch(console.error);
