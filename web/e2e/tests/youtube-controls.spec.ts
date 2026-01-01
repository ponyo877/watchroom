import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 10000;

test.describe.configure({ mode: 'serial' });

test.describe('YouTube Player Controls', () => {
  test('should hide native YouTube controls', async ({ page, request }) => {
    test.setTimeout(90000);

    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    await page.goto(`/r/${shortId}`);
    await page.waitForSelector('button[title="動画を検索"]', { timeout: ROOM_LOAD_TIMEOUT });

    await page.click('button[title="動画を検索"]');
    await page.waitForSelector('input[placeholder*="検索"]', { timeout: 5000 });
    await page.fill('input[placeholder*="検索"]', 'test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    const videoResult = page.locator('button:has(img):has(h3)').first();
    if (await videoResult.isVisible({ timeout: 10000 }).catch(() => false)) {
      await videoResult.click();

      // Wait for YouTube iframe to load
      const iframe = page.locator('iframe[src*="youtube"]');
      await expect(iframe).toBeVisible({ timeout: 10000 });

      // Verify iframe src contains controls=0
      const src = await iframe.getAttribute('src');
      expect(src).toContain('controls=0');

      // Custom PlayerControls should be visible
      await expect(page.locator('button[title="音量（自分のみ）"]')).toBeVisible({ timeout: 5000 });
    } else {
      // YouTube API may be unavailable - skip gracefully
      test.skip(true, 'YouTube search results not available');
    }
  });
});
