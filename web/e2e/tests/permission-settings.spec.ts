import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Task 6: Permission Settings Change', () => {
  test('should persist permission mode change', async ({ page, request }) => {
    // Setup: Create a room
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    // Navigate to the room with desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/r/${shortId}`);
    await page.waitForTimeout(5000);

    // Open settings modal
    const settingsButton = page.locator('button[title="設定"]');
    await expect(settingsButton).toBeVisible({ timeout: 10000 });
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Verify settings modal is open (check for "部屋設定" heading)
    const settingsHeading = page.locator('h2:has-text("部屋設定")');
    await expect(settingsHeading).toBeVisible({ timeout: 5000 });

    // Find permission mode buttons
    const creatorButton = page.locator('button:has-text("作成者のみ")');
    const allButton = page.locator('button:has-text("全員")');

    // Verify creator mode is selected (has border-primary class)
    await expect(creatorButton).toHaveClass(/border-primary/);

    // Change to 'all' mode
    await allButton.click();
    await page.waitForTimeout(300);

    // Verify 'all' mode is now selected
    await expect(allButton).toHaveClass(/border-primary/);

    // Close settings
    const closeButton = page.locator('button:has-text("閉じる")');
    await closeButton.click();
    await page.waitForTimeout(500);

    // Reopen settings
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Verify 'all' mode is still selected (persisted in store)
    const allButtonAfterReopen = page.locator('button:has-text("全員")');
    await expect(allButtonAfterReopen).toHaveClass(/border-primary/);
  });

  test('should show member permissions section when specific mode is selected', async ({ page, request }) => {
    // Setup: Create a room
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    // Navigate to the room
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/r/${shortId}`);
    await page.waitForTimeout(5000);

    // Open settings modal
    await page.click('button[title="設定"]');
    await page.waitForTimeout(500);

    // Change to 'specific' mode
    const specificButton = page.locator('button:has-text("指定メンバー")');
    await specificButton.click();
    await page.waitForTimeout(300);

    // Verify 'specific' mode is now selected
    await expect(specificButton).toHaveClass(/border-primary/);

    // When 'specific' mode is selected, the member permissions section should be visible
    const memberPermissionSection = page.locator('h3:has-text("メンバー権限")');
    await expect(memberPermissionSection).toBeVisible();
  });
});
