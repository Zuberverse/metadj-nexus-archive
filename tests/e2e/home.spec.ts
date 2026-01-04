import { test, expect } from '@playwright/test';

test('home loads and skip link reaches main content', async ({ page }) => {
  await page.goto('/');

  const skipLink = page.getByRole('link', { name: /skip to main content/i });
  const target = (await skipLink.getAttribute('href')) ?? '#main-content';
  const targetId = target.replace('#', '');

  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await skipLink.press('Enter');

  await expect(page).toHaveURL(new RegExp(`${target}$`));
  await expect(page.locator(`#${targetId}`)).toBeVisible();
  await expect(page.getByLabel('Hub content')).toBeVisible();
});
