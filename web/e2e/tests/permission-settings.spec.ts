import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 8000;

test.describe('Permission Settings', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should persist permission mode change and show member permissions for specific mode', async ({ page, request }) => {
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/r/${shortId}`);

    const settingsButton = page.locator('button[title="設定"]');
    await expect(settingsButton).toBeVisible({ timeout: ROOM_LOAD_TIMEOUT });
    await settingsButton.click();

    // Verify settings modal opened
    await expect(page.locator('h2:has-text("部屋設定")')).toBeVisible({ timeout: 3000 });

    // Verify creator mode is default
    const creatorButton = page.locator('button:has-text("作成者のみ")');
    await expect(creatorButton).toHaveClass(/border-primary/);

    // Change to 'all' mode
    const allButton = page.locator('button:has-text("全員")');
    await allButton.click();
    await expect(allButton).toHaveClass(/border-primary/);

    // Close and reopen to verify persistence
    await page.click('button:has-text("閉じる")');
    await settingsButton.click();
    await expect(page.locator('button:has-text("全員")')).toHaveClass(/border-primary/);

    // Test specific mode shows member permissions
    const specificButton = page.locator('button:has-text("指定メンバー")');
    await specificButton.click();
    await expect(specificButton).toHaveClass(/border-primary/);
    await expect(page.locator('h3:has-text("メンバー権限")')).toBeVisible();
  });
});
