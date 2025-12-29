import { test, expect } from '@playwright/test';

test('metadjai panel opens and closes from the header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Hub content')).toBeVisible();

  await page.getByLabel('Open MetaDJai').click();
  const chatPanel = page.getByLabel('Chat Panel');
  await expect(chatPanel).toBeVisible();

  await page.getByLabel('Close MetaDJai').click();
  await expect(chatPanel).toBeHidden();
});
