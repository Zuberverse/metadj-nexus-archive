import { test, expect } from '@playwright/test';

test('cinema view toggles from navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Hub content')).toBeVisible();

  const cinemaToggle = page.getByRole('button', { name: /Cinema.*Visual/i }).first();
  await cinemaToggle.click();

  await expect(page.getByLabel('Cinema active')).toBeVisible();
});
