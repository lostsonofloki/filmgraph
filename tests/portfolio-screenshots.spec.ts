import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, '../portfolio-screenshots');

// Credentials from .env
const EMAIL = process.env.TEST_USER_EMAIL || 'YOUR_EMAIL@example.com';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'YOUR_PASSWORD';

test.describe('Portfolio Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);

    // Input credentials
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await expect(page).not.toHaveURL(/.*login/);
    await page.waitForLoadState('networkidle');
  });

  test('Matchmaker screenshot (Desktop 1920x1080)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to matchmaker
    await page.goto('/matchmaker');

    // Wait for Synergy scores and posters to load
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'matchmaker_final.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`✓ Matchmaker screenshot saved to: ${screenshotPath}`);
  });

  test('Stats Dashboard screenshot (Desktop 1920x1080)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to profile
    await page.goto('/profile');

    // Scroll to charts section
    await page.evaluate(() => {
      document.querySelector('.recharts-wrapper, .charts-container, .stats-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Wait for Recharts animations and posters to finish
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'stats_dashboard.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`✓ Stats dashboard screenshot saved to: ${screenshotPath}`);
  });

  test('Oracle Active screenshot (Desktop 1920x1080)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to discover
    await page.goto('/discover');

    // Type query into Oracle input
    const oracleInput = page.locator('input[placeholder*="Oracle"], input[placeholder*="vibe"], input[type="text"], textarea').first();
    await oracleInput.fill('A dark sci-fi for a rainy night');

    // Wait for recommendations to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'oracle_active.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`✓ Oracle active screenshot saved to: ${screenshotPath}`);
  });

  test('Library Mobile screenshot (390x844)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Navigate to library
    await page.goto('/library');

    // Wait for content and posters to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'library_mobile.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`✓ Library mobile screenshot saved to: ${screenshotPath}`);
  });

  test('Importer Tool screenshot (Desktop 1920x1080)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate to importer
    await page.goto('/import');

    // Wait for importer UI to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'importer_tool.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`✓ Importer tool screenshot saved to: ${screenshotPath}`);
  });
});
