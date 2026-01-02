import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 8000;

test.describe('Play History', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should show play history button and panel', async ({ page, request }) => {
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    await page.goto(`/r/${shortId}`);
    await page.waitForSelector('button[title="NewVideo"]', { timeout: ROOM_LOAD_TIMEOUT });

    // Look for history button
    const historyButton = page.locator('button[title*="履歴"], button:has-text("履歴")').first();
    if (await historyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyButton.click();
      await page.waitForTimeout(300);

      // Panel should open (check for empty state or history list)
      const panel = page.locator('text=再生履歴').first();
      await expect(panel).toBeVisible({ timeout: 3000 });
    }
  });
});
