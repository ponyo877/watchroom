import { test, expect } from '@playwright/test';

test.describe('User Settings Dialog', () => {
  test('should open dialog and display all content sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Open settings dialog
    const userButton = page.locator('[data-testid="account-button"]');
    await userButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify all sections are present
    await expect(page.locator('text=ユーザー設定')).toBeVisible();
    await expect(page.locator('text=プロフィールアイコン')).toBeVisible();
    await expect(page.locator('text=表示名')).toBeVisible();
    await expect(page.locator('text=ユーザーID')).toBeVisible();
    await expect(dialog.locator('input[type="text"]')).toBeVisible();
  });

  test('should close dialog via multiple methods', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("NewRoom")', { timeout: 10000 });

    // Test close via X button
    const userButton = page.locator('[data-testid="account-button"]');
    await userButton.click();
    let dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const closeButton = dialog.locator('button:has(svg.lucide-x)');
    await closeButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Test close via Escape key
    await userButton.click();
    dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});
