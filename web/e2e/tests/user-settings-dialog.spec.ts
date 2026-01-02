import { test, expect } from '@playwright/test';

test.describe('User Settings Dialog', () => {
  test('should open and close dialog via close button', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Click on user settings button (user icon in header)
    const userButton = page.locator('header button:has(svg)').first();
    await userButton.click();

    // Dialog should be open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify title
    await expect(page.locator('text=ユーザー設定')).toBeVisible();

    // Close via X button
    const closeButton = dialog.locator('button:has(svg.lucide-x)');
    await closeButton.click();

    // Dialog should be closed
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('should close dialog via Escape key', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Open settings dialog
    const userButton = page.locator('header button:has(svg)').first();
    await userButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Dialog should be closed
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('should close dialog via overlay click', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Open settings dialog
    const userButton = page.locator('header button:has(svg)').first();
    await userButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click on overlay (outside dialog)
    await page.click('[data-state="open"]', { position: { x: 10, y: 10 } });

    // Dialog should be closed
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('should close dialog via close button at footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Open settings dialog
    const userButton = page.locator('header button:has(svg)').first();
    await userButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click footer close button (the visible one with "閉じる" text)
    const footerCloseButton = page.getByRole('button', { name: '閉じる' }).last();
    await footerCloseButton.click();

    // Dialog should be closed
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('should display user settings content', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Open settings dialog
    const userButton = page.locator('header button:has(svg)').first();
    await userButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify all sections are present
    await expect(page.locator('text=プロフィールアイコン')).toBeVisible();
    await expect(page.locator('text=表示名')).toBeVisible();
    await expect(page.locator('text=ユーザーID')).toBeVisible();
    await expect(dialog.locator('input[type="text"]')).toBeVisible();
  });
});
