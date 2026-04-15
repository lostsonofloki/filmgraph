import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// Load variables from .env
dotenv.config();

test('Oracle - Auth and Vibe Discovery', async ({ page }) => {
  // 1. Go to the Login Page
  await page.goto('https://filmgraph-azure.vercel.app/login');

  // 2. Perform Login using Environment Variables
  // These must match the names you used in your .env file
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  // Safety Check: If the robot can't find your keys, fail early with a clear message
  if (!email || !password) {
    throw new Error("Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in .env file");
  }

  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).click();

  // 3. Wait for the redirect (Adjust the URL to your actual 'Logged In' landing page)
  await expect(page).toHaveURL(/.*dashboard|.*library|.*\//); 

  // 4. Navigate to the Oracle
  const discoverLink = page.getByRole('link', { name: 'Discover' });
  await discoverLink.click();

  // 5. Run your Vibe checks
  await page.getByRole('button', { name: '🧠 Mind-Bending' }).click();
  await page.getByRole('button', { name: '✨ Discover' }).click();
  
  // 6. Final verification - Waiting for the 'Deep Ember' result card to hit the UI
  // I increased the timeout slightly to allow for AI processing time
  await expect(page.locator('.movie-card').first()).toBeVisible({ timeout: 20000 });
});
