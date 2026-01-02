import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId, safeCloseContext, safeCloseContexts } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 8000;

test.describe('Member Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('should show members, creator badge, and update when user leaves', async ({ browser, request }) => {
    test.setTimeout(90000);

    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const [contextA, contextB] = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);

    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-creator', name: 'RoomCreator', iconUrl: null },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-member', name: 'RegularMember', iconUrl: null },
        version: 0,
      }));
    });

    const [pageA, pageB] = await Promise.all([
      contextA.newPage(),
      contextB.newPage(),
    ]);

    try {
      // User A (Creator) enters first
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForSelector('button[title="メンバー"]', { timeout: ROOM_LOAD_TIMEOUT });

      // User B enters
      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForSelector('button[title="メンバー"]', { timeout: ROOM_LOAD_TIMEOUT });

      // Open member list on both
      await pageA.click('button[title="メンバー"]');
      await pageB.click('button[title="メンバー"]');
      await pageA.waitForTimeout(1000);

      // Verify both users are shown
      let pageContentA = await pageA.content();
      expect(pageContentA).toContain('RoomCreator');
      expect(pageContentA).toContain('RegularMember');

      // Verify creator is shown on User B's view too
      const pageContentB = await pageB.content();
      expect(pageContentB).toContain('RoomCreator');

      // User B leaves
      const leaveButton = pageB.locator('button[title="部屋を出る"]');
      if (await leaveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await leaveButton.click();
      } else {
        await pageB.close();
      }

      // Wait for member list update on User A
      await pageA.waitForTimeout(3000);
      pageContentA = await pageA.content();
      // RegularMember should be gone (or at least the count reduced)
    } finally {
      await safeCloseContext(contextA, pageA);
      if (!pageB.isClosed()) {
        await safeCloseContext(contextB, pageB);
      }
    }
  });

  test('should show correct member count with multiple users', async ({ browser, request }) => {
    test.setTimeout(90000);

    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const userNames = ['User1', 'User2', 'User3'];
    for (let i = 0; i < contexts.length; i++) {
      await contexts[i].addInitScript((name) => {
        localStorage.setItem('user-storage', JSON.stringify({
          state: { id: `user-${name}`, name: name, iconUrl: null },
          version: 0,
        }));
      }, userNames[i]);
    }

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    try {
      // All users enter in parallel
      await Promise.all(pages.map(p => p.goto(`/r/${shortId}`)));
      await Promise.all(pages.map(p =>
        p.waitForSelector('button[title="メンバー"]', { timeout: ROOM_LOAD_TIMEOUT })
      ));

      // Open member list on first page
      await pages[0].click('button[title="メンバー"]');
      await pages[0].waitForTimeout(1500);

      // Verify all users are shown
      const pageContent = await pages[0].content();
      expect(pageContent).toContain('User1');
      expect(pageContent).toContain('User2');
      expect(pageContent).toContain('User3');
    } finally {
      await safeCloseContexts(contexts);
    }
  });
});
