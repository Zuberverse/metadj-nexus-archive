import { test, expect } from '@playwright/test';

test('search adds a track to the queue', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Hub content')).toBeVisible();

  await page.getByLabel('Search music').click();

  const searchInput = page.getByLabel('Search tracks by title');
  await searchInput.fill('Majestic Ascent');

  const results = page.getByRole('listbox', { name: /Track results/i });
  await expect(results).toBeVisible();

  await page.getByRole('button', { name: /Add Majestic Ascent to queue/i }).click();

  await page.getByLabel('Open Queue').click();
  await expect(page.getByRole('listitem', { name: /Majestic Ascent by MetaDJ/i })).toBeVisible();
});
