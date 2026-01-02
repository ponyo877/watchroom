import { test, expect } from '@playwright/test';

test.describe('UI Button Styles', () => {
  test('create room button should have deep green background color', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Find the create room button
    const createRoomButton = page.locator('button:has-text("部屋を作成")');
    await expect(createRoomButton).toBeVisible();

    // Check the background color is deep green (#4A7C59)
    const bgColor = await createRoomButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // #4A7C59 converts to rgb(74, 124, 89)
    expect(bgColor).toBe('rgb(74, 124, 89)');
  });

  test('create room button should have white text', async ({ page }) => {
    await page.goto('/');

    const createRoomButton = page.locator('button:has-text("部屋を作成")');
    await expect(createRoomButton).toBeVisible();

    const textColor = await createRoomButton.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // White is rgb(255, 255, 255)
    expect(textColor).toBe('rgb(255, 255, 255)');
  });
});
