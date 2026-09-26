import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL!;
const PASSWORD = process.env.TEST_USER_PASSWORD!;

test('login redirects to profile and shows username', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /login|sign in/i }).click();

  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('logout returns to login page', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await expect(page).toHaveURL(/\/profile/);

  await page.getByRole('button', { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login|^\//);
});
