import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId, safeCloseContext } from '../helpers/api';

test.describe('Member Count UI', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should display member count in room list', async ({ page, homePage, request }) => {
    const roomId = generateRoomId();
    const roomName = `Member Count Room ${Date.now()}`;

    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });

    await homePage.goto();
    await expect(page.locator('text=部屋を読み込み中')).not.toBeVisible({ timeout: 10000 });

    const roomCard = page.locator(`text=${roomName}`).first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });

    // Check member count display (format: X/10)
    const parentCard = roomCard.locator('xpath=ancestor::a[contains(@class, "block")]');
    const memberCountText = parentCard.locator('text=/\\d+\\/\\d+/');
    await expect(memberCountText).toBeVisible();
    await expect(memberCountText).toHaveText('0/10');
  });
});

test.describe('Member Count API', () => {
  test.describe.configure({ mode: 'serial' });

  test('should have sync API for resetting stale member counts', async ({ request }) => {
    const roomId = generateRoomId();
    const roomName = `Sync API Test Room ${Date.now()}`;

    // Create room via API
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });

    // Manually set wrong member count (simulating stale data)
    const syncResponse = await request.put(`http://localhost:8080/api/rooms/${roomId}/member-count/sync`, {
      data: { actual_count: 5 },
    });
    expect(syncResponse.ok()).toBe(true);

    // Verify the count is set
    let memberInfo = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    let memberInfoData = await memberInfo.json();
    expect(memberInfoData.member_count).toBe(5);

    // Reset via sync API
    const resetResponse = await request.put(`http://localhost:8080/api/rooms/${roomId}/member-count/sync`, {
      data: { actual_count: 0 },
    });
    expect(resetResponse.ok()).toBe(true);

    // Verify the count is reset
    memberInfo = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    memberInfoData = await memberInfo.json();
    expect(memberInfoData.member_count).toBe(0);
  });

  test('should increment member count when user enters room', async ({ browser, request }) => {
    test.setTimeout(60000);

    const roomId = generateRoomId();
    const roomName = `Increment Test Room ${Date.now()}`;

    // Create room via API with 0 members
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });
    const { short_id: shortId } = await response.json();

    // Verify initial count is 0
    let memberInfo = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    let memberInfoData = await memberInfo.json();
    expect(memberInfoData.member_count).toBe(0);

    // Create a browser context and enter the room
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('user-storage', JSON.stringify({
        state: { id: 'user-increment-test', name: 'IncrementTester', iconUrl: null },
        version: 0,
      }));
    });
    const page = await context.newPage();

    try {
      // Navigate to room
      await page.goto(`/r/${shortId}`);

      // Wait for room to load
      await page.waitForSelector('button[title="AddVideo"]', { timeout: 15000 });

      // Wait for increment API call to complete
      await page.waitForTimeout(2000);

      // Verify member count is now 1
      memberInfo = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
      memberInfoData = await memberInfo.json();
      expect(memberInfoData.member_count).toBe(1);
    } finally {
      await safeCloseContext(context, page);
    }
  });
});
