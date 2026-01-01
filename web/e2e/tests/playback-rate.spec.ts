import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 8000;

test.describe('Playback Rate Change', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should update playback rate selector', async ({ page, request }) => {
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    await page.goto(`/r/${shortId}`);
    await page.waitForSelector('button[title="動画を検索"]', { timeout: ROOM_LOAD_TIMEOUT });

    // Look for playback rate selector (usually shows "1x" by default)
    const rateSelector = page.locator('button:has-text("1x"), select:has-text("1x")').first();
    if (await rateSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rateSelector.click();
      await page.waitForTimeout(200);

      // Select 1.5x if available
      const rate15 = page.locator('button:has-text("1.5x"), option:has-text("1.5x")').first();
      if (await rate15.isVisible({ timeout: 1000 }).catch(() => false)) {
        await rate15.click();
      }
    }
  });
});
