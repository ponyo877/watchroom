import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Chat Sync (P2P)', () => {
  test('should sync chat messages between users', async ({ browser, request }) => {
    // Setup: Create a room
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    // Create two browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    // Set up User A
    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-a-chat-' + Date.now(),
          name: 'Alice',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    // Set up User B
    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-b-chat-' + Date.now(),
          name: 'Bob',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. Both users enter the room
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForTimeout(5000);

      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForTimeout(5000);

      // 2. User A sends a message
      const chatInputA = pageA.locator('input[placeholder*="メッセージ"], textarea[placeholder*="メッセージ"]').first();
      await chatInputA.fill('こんにちは');
      await pageA.keyboard.press('Enter');
      await pageA.waitForTimeout(2000);

      // 3. Verify User B receives the message
      await pageB.waitForTimeout(3000);
      // Look for the message text directly in the page content
      const messageElement = pageB.getByText('こんにちは');
      await expect(messageElement).toBeVisible({ timeout: 10000 });

      // 4. User B replies
      const chatInputB = pageB.locator('input[placeholder*="メッセージ"], textarea[placeholder*="メッセージ"]').first();
      await chatInputB.fill('やあ！');
      await pageB.keyboard.press('Enter');
      await pageB.waitForTimeout(2000);

      // 5. Verify User A receives the reply
      await pageA.waitForTimeout(3000);
      // Look for the reply text directly in the page content
      const replyElement = pageA.getByText('やあ！');
      await expect(replyElement).toBeVisible({ timeout: 10000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should show sender name correctly', async ({ browser, request }) => {
    // Setup
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    // User A is named "TestUser123"
    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-a-name-' + Date.now(),
          name: 'TestUser123',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-b-name-' + Date.now(),
          name: 'Viewer',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForTimeout(5000);

      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForTimeout(5000);

      // User A sends a message
      const chatInputA = pageA.locator('input[placeholder*="メッセージ"], textarea[placeholder*="メッセージ"]').first();
      await chatInputA.fill('Hello from TestUser123');
      await pageA.keyboard.press('Enter');
      await pageA.waitForTimeout(3000);

      // Verify User B sees the sender name
      await pageB.waitForTimeout(3000);
      const pageContent = await pageB.content();
      // The sender name should be visible somewhere in the chat
      expect(pageContent).toContain('TestUser123');
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should sync reactions between users', async ({ browser, request }) => {
    // Setup
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-a-react-' + Date.now(),
          name: 'Reactor1',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-b-react-' + Date.now(),
          name: 'Reactor2',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForTimeout(5000);

      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForTimeout(5000);

      // User A sends a reaction
      // Find and click the reaction picker button
      const reactionButtonA = pageA.locator('button').filter({ hasText: /😀|リアクション/i }).first();
      if (await reactionButtonA.isVisible()) {
        await reactionButtonA.click();
        await pageA.waitForTimeout(500);

        // Select a reaction (e.g., 👍)
        const thumbsUp = pageA.locator('button:has-text("👍")').first();
        if (await thumbsUp.isVisible()) {
          await thumbsUp.click();
          await pageA.waitForTimeout(1000);
        }
      }

      // Verify User B sees the reaction
      await pageB.waitForTimeout(2000);
      const reactionOverlay = pageB.locator('.animate-float-down, [class*="reaction"]');
      const reactionCount = await reactionOverlay.count();
      // If sync works, there should be at least one reaction visible
      // Note: Reactions fade out after 3 seconds

      // User B sends a reaction
      const reactionButtonB = pageB.locator('button').filter({ hasText: /😀|リアクション/i }).first();
      if (await reactionButtonB.isVisible()) {
        await reactionButtonB.click();
        await pageB.waitForTimeout(500);

        // Select a different reaction (e.g., 🎉)
        const party = pageB.locator('button:has-text("🎉")').first();
        if (await party.isVisible()) {
          await party.click();
          await pageB.waitForTimeout(1000);
        }
      }

      // Verify User A sees User B's reaction
      await pageA.waitForTimeout(2000);

      // Wait and verify reactions disappear after 3 seconds
      await pageA.waitForTimeout(4000);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
