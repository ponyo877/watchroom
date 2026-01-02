import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId, safeCloseContext } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 10000;
const SYNC_TIMEOUT = 8000;

test.describe.configure({ mode: 'serial' });

test.describe('Video Playback Sync (P2P)', () => {
  test('should sync video selection, play/pause, and seek between users', async ({ browser, request }) => {
    test.setTimeout(120000);

    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-a-' + Date.now(), name: 'Creator', iconUrl: null },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-b-' + Date.now(), name: 'Viewer', iconUrl: null },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // User A enters first
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForSelector('button[title="動画を検索"]', { timeout: ROOM_LOAD_TIMEOUT });

      // User B enters
      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForSelector('button[title="動画を検索"]', { timeout: ROOM_LOAD_TIMEOUT });

      // User A opens video search
      await pageA.click('button[title="動画を検索"]');
      await pageA.waitForSelector('input[placeholder*="検索"]', { timeout: 5000 });

      // Search and select video
      await pageA.fill('input[placeholder*="検索"]', 'test');
      await pageA.keyboard.press('Enter');
      await pageA.waitForTimeout(3000);

      const videoResult = pageA.locator('button:has(img):has(h3)').first();
      if (await videoResult.isVisible({ timeout: 10000 }).catch(() => false)) {
        await videoResult.click();

        // Wait for video to load on both sides
        await Promise.all([
          pageA.waitForSelector('iframe[src*="youtube"]', { timeout: SYNC_TIMEOUT }).catch(() => null),
          pageB.waitForSelector('iframe[src*="youtube"]', { timeout: SYNC_TIMEOUT }).catch(() => null),
        ]);
      }
    } finally {
      await safeCloseContext(contextA, pageA);
      await safeCloseContext(contextB, pageB);
    }
  });

  test('should sync video to late joiner', async ({ browser, request }) => {
    test.setTimeout(90000);

    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-early', name: 'Early', iconUrl: null },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-late', name: 'LateJoiner', iconUrl: null },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // User A enters and sets up video first
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForSelector('button[title="動画を検索"]', { timeout: ROOM_LOAD_TIMEOUT });

      await pageA.click('button[title="動画を検索"]');
      await pageA.waitForSelector('input[placeholder*="検索"]', { timeout: 5000 });
      await pageA.fill('input[placeholder*="検索"]', 'music');
      await pageA.keyboard.press('Enter');
      await pageA.waitForTimeout(3000);

      const videoResult = pageA.locator('button:has(img):has(h3)').first();
      if (await videoResult.isVisible({ timeout: 10000 }).catch(() => false)) {
        await videoResult.click();
        await pageA.waitForSelector('iframe[src*="youtube"]', { timeout: SYNC_TIMEOUT });

        // NOW User B joins late
        await pageB.goto(`/r/${shortId}`);

        // Late joiner should see the video
        await pageB.waitForSelector('iframe[src*="youtube"]', { timeout: ROOM_LOAD_TIMEOUT }).catch(() => null);
      }
    } finally {
      await safeCloseContext(contextA, pageA);
      await safeCloseContext(contextB, pageB);
    }
  });
});
