const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

(async () => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002';

  if (!email || !password) {
    throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in environment');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  const isLoginPage = page.url().includes('/login');
  if (isLoginPage) {
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitButton.click();
    await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 30000 });
  }

  await page.goto(`${baseUrl}/actor/500`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const badgeCount = await page.locator('.watched-badge').count();

  const outputDir = 'playwright-artifacts';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outPath = `${outputDir}/actor-watched-badge.png`;
  await page.screenshot({ path: outPath, fullPage: false });

  const result = {
    badgeCount,
    screenshot: outPath,
    actorUrl: page.url(),
  };
  fs.writeFileSync(`${outputDir}/actor-watched-badge-result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));

  await browser.close();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
