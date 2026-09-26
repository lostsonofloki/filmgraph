import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL!;
const PASSWORD = process.env.TEST_USER_PASSWORD!;

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await expect(page).toHaveURL(/\/profile/);
});

test('Add to List dropdown shows Watched and Watchlist system lists', async ({ page }) => {
  // The Shining — TMDB ID 694
  await page.goto('/movie/694');

  const addToListBtn = page.getByRole('button', { name: /add to list/i });
  await expect(addToListBtn).toBeVisible();
  await addToListBtn.click();

  const dropdown = page.locator('[class*="dropdown"], [class*="list-menu"], [role="menu"]').first();
  await expect(dropdown).toBeVisible();

  await expect(page.getByText('Watched')).toBeVisible();
  await expect(page.getByText('Watchlist')).toBeVisible();
});

test('adding a movie to Watched gives visual feedback', async ({ page }) => {
  await page.goto('/movie/694');

  await page.getByRole('button', { name: /add to list/i }).click();
  await page.getByText('Watched').click();

  // Button or UI should reflect the movie is now in the list
  const feedback = page.locator('[class*="check"], [class*="success"], [aria-label*="added"]');
  await expect(feedback.or(page.getByText(/added|saved/i)).first()).toBeVisible({ timeout: 5000 });
});
