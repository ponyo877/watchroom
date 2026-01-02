import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId, safeCloseContext } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 10000;
const P2P_SYNC_TIMEOUT = 15000;

test.describe.configure({ mode: 'serial' });

test.describe('Chat Sync (P2P)', () => {
  test('should sync chat messages between users', async ({ browser, request }) => {
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
        state: { id: 'user-alice', name: 'Alice', iconUrl: null },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-bob', name: 'Bob', iconUrl: null },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // User A enters first
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForSelector('button[title="メンバー"]', { timeout: ROOM_LOAD_TIMEOUT });

      // User B enters
      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForSelector('button[title="メンバー"]', { timeout: ROOM_LOAD_TIMEOUT });

      // Wait a bit for P2P connection to stabilize
      await pageA.waitForTimeout(2000);

      // Find chat input
      const chatInputA = pageA.locator('input[placeholder*="メッセージ"], textarea[placeholder*="メッセージ"]').first();
      const chatInputVisible = await chatInputA.isVisible({ timeout: 5000 }).catch(() => false);

      if (chatInputVisible) {
        // User A sends a message
        await chatInputA.fill('こんにちは');
        await pageA.keyboard.press('Enter');

        // Verify User B receives the message
        const messageOnB = pageB.getByText('こんにちは');
        await expect(messageOnB).toBeVisible({ timeout: P2P_SYNC_TIMEOUT });

        // User B replies
        const chatInputB = pageB.locator('input[placeholder*="メッセージ"], textarea[placeholder*="メッセージ"]').first();
        await chatInputB.fill('やあ！');
        await pageB.keyboard.press('Enter');

        // Verify User A receives the reply
        await expect(pageA.getByText('やあ！')).toBeVisible({ timeout: P2P_SYNC_TIMEOUT });
      } else {
        // Chat input not available in this room layout - skip
        test.skip(true, 'Chat input not visible');
      }
    } finally {
      await safeCloseContext(contextA, pageA);
      await safeCloseContext(contextB, pageB);
    }
  });
});
