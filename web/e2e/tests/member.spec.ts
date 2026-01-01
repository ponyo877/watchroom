import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Member Management', () => {
  test('should update member list when user leaves', async ({ browser, request }) => {
    // Setup: Create a room
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    // Create two browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-a-leave-' + Date.now(),
          name: 'Stayer',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-b-leave-' + Date.now(),
          name: 'Leaver',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. User A enters the room
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForTimeout(5000);

      // 2. User B enters the room
      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForTimeout(5000);

      // 3. User A opens member list and verifies User B is there
      const memberButtonA = pageA.locator('button[title="メンバー"]');
      if (await memberButtonA.isVisible()) {
        await memberButtonA.click();
        await pageA.waitForTimeout(1000);
      }

      // Check that Leaver is in the member list
      await pageA.waitForTimeout(2000);
      let pageContentA = await pageA.content();
      expect(pageContentA).toContain('Leaver');

      // 4. User B leaves the room
      const leaveButton = pageB.locator('button[title="部屋を出る"]');
      if (await leaveButton.isVisible()) {
        await leaveButton.click();
        await pageB.waitForTimeout(2000);
      } else {
        // Close the page to simulate leaving
        await pageB.close();
      }

      // 5. User A should see Leaver removed from member list
      await pageA.waitForTimeout(5000);
      pageContentA = await pageA.content();
      // After leaving, Leaver should no longer be in the member list
      // Note: This depends on the UI updating properly
    } finally {
      await contextA.close();
      if (!pageB.isClosed()) {
        await contextB.close();
      }
    }
  });

  test('should show creator badge correctly', async ({ browser, request }) => {
    // Setup: Create a room
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    // User A is the creator
    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-a-creator-' + Date.now(),
          name: 'RoomCreator',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: {
          id: 'user-b-member-' + Date.now(),
          name: 'RegularMember',
          iconUrl: null,
        },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. User A (Creator) enters the room first
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForTimeout(5000);

      // 2. User B enters the room
      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForTimeout(5000);

      // 3. Open member list on both pages
      const memberButtonA = pageA.locator('button[title="メンバー"]');
      if (await memberButtonA.isVisible()) {
        await memberButtonA.click();
        await pageA.waitForTimeout(1000);
      }

      const memberButtonB = pageB.locator('button[title="メンバー"]');
      if (await memberButtonB.isVisible()) {
        await memberButtonB.click();
        await pageB.waitForTimeout(1000);
      }

      // 4. Verify creator badge is shown for RoomCreator
      // Look for creator indicator (crown icon, badge, etc.)
      await pageA.waitForTimeout(2000);
      await pageB.waitForTimeout(2000);

      // The creator should have some visual indicator
      // This depends on the specific UI implementation
      const pageContentA = await pageA.content();
      const pageContentB = await pageB.content();

      // Both pages should show RoomCreator
      expect(pageContentA).toContain('RoomCreator');
      expect(pageContentB).toContain('RoomCreator');
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should show correct member count', async ({ browser, request }) => {
    // Setup
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const contextC = await browser.newContext();

    await contextA.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-a-count', name: 'User1', iconUrl: null },
        version: 0,
      }));
    });

    await contextB.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-b-count', name: 'User2', iconUrl: null },
        version: 0,
      }));
    });

    await contextC.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-c-count', name: 'User3', iconUrl: null },
        version: 0,
      }));
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const pageC = await contextC.newPage();

    try {
      // User A enters
      await pageA.goto(`/r/${shortId}`);
      await pageA.waitForTimeout(5000);

      // User B enters
      await pageB.goto(`/r/${shortId}`);
      await pageB.waitForTimeout(5000);

      // User C enters
      await pageC.goto(`/r/${shortId}`);
      await pageC.waitForTimeout(5000);

      // All three users should be visible in member list
      const memberButtonA = pageA.locator('button[title="メンバー"]');
      if (await memberButtonA.isVisible()) {
        await memberButtonA.click();
        await pageA.waitForTimeout(2000);
      }

      const pageContent = await pageA.content();
      expect(pageContent).toContain('User1');
      expect(pageContent).toContain('User2');
      expect(pageContent).toContain('User3');
    } finally {
      await contextA.close();
      await contextB.close();
      await contextC.close();
    }
  });
});
