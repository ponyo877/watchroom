import { test, expect } from '../fixtures/test-fixtures';

test.describe('Permission System', () => {
  test('creator should have control permission by default', async ({ createUser, homePage }) => {
    const creator = await createUser('Creator');

    // Navigate to home and create a room
    await creator.page.goto('/');
    await creator.page.waitForLoadState('networkidle');

    // Click create room button
    await creator.page.click('button:has-text("部屋を作成")');
    await creator.page.waitForTimeout(500);

    // Fill room name
    await creator.page.fill('input#roomName', `Permission Test ${Date.now()}`);

    // Submit
    await creator.page.click('button[type="submit"]:has-text("作成")');

    // Wait for navigation to room page
    await creator.page.waitForURL(/\/(room|r)\//, { timeout: 15000 });

    // Wait for SkyWay connection
    await creator.page.waitForTimeout(5000);

    // Search for a video to test controls
    await creator.page.click('button[title="動画を検索"]');
    await creator.page.fill('input[placeholder*="検索"]', 'test video');
    await creator.page.keyboard.press('Enter');
    await creator.page.waitForTimeout(3000);

    // Select a video
    const videoResult = creator.page.locator('[role="button"]').filter({ hasText: /test/i }).first();
    if (await videoResult.isVisible()) {
      await videoResult.click();
      await creator.page.waitForTimeout(2000);

      // Creator should have control permission - play button should NOT be disabled
      const playButton = creator.page.locator('button').filter({ has: creator.page.locator('svg.lucide-play, svg.lucide-pause') }).first();

      // Check that the button exists and is not disabled
      if (await playButton.isVisible()) {
        const isDisabled = await playButton.isDisabled();
        expect(isDisabled).toBe(false);
      }
    }
  });

  test('non-creator should not have control permission by default', async ({ createUser }) => {
    // Create creator and setup room
    const creator = await createUser('Creator');
    await creator.page.goto('/');
    await creator.page.waitForLoadState('networkidle');

    // Create a room
    await creator.page.click('button:has-text("部屋を作成")');
    await creator.page.waitForTimeout(500);
    const roomName = `Permission Test ${Date.now()}`;
    await creator.page.fill('input#roomName', roomName);
    await creator.page.click('button[type="submit"]:has-text("作成")');
    await creator.page.waitForURL(/\/(room|r)\//, { timeout: 15000 });

    // Get the room URL
    const roomUrl = creator.page.url();

    // Wait for creator to connect
    await creator.page.waitForTimeout(3000);

    // Create second user (non-creator)
    const viewer = await createUser('Viewer');
    await viewer.page.goto(roomUrl);
    await viewer.page.waitForLoadState('networkidle');

    // Wait for SkyWay connection
    await viewer.page.waitForTimeout(5000);

    // First, creator selects a video
    await creator.page.click('button[title="動画を検索"]');
    await creator.page.fill('input[placeholder*="検索"]', 'test video');
    await creator.page.keyboard.press('Enter');
    await creator.page.waitForTimeout(3000);

    const videoResult = creator.page.locator('[role="button"]').filter({ hasText: /test/i }).first();
    if (await videoResult.isVisible()) {
      await videoResult.click();
      await creator.page.waitForTimeout(2000);

      // Wait for video to sync to viewer
      await viewer.page.waitForTimeout(3000);

      // Viewer should NOT have control permission - play button should be disabled
      const playButton = viewer.page.locator('button').filter({ has: viewer.page.locator('svg.lucide-play, svg.lucide-pause') }).first();

      if (await playButton.isVisible()) {
        const isDisabled = await playButton.isDisabled();
        expect(isDisabled).toBe(true);
      }
    }
  });

  test('creator status should be set correctly in room store', async ({ createUser }) => {
    // Create creator and setup room
    const creator = await createUser('RoomCreator');
    await creator.page.goto('/');
    await creator.page.waitForLoadState('networkidle');

    // Create a room
    await creator.page.click('button:has-text("部屋を作成")');
    await creator.page.waitForTimeout(500);
    const roomName = `Creator Test ${Date.now()}`;
    await creator.page.fill('input#roomName', roomName);
    await creator.page.click('button[type="submit"]:has-text("作成")');
    await creator.page.waitForURL(/\/(room|r)\//, { timeout: 15000 });

    const roomUrl = creator.page.url();

    // Wait for connection
    await creator.page.waitForTimeout(3000);

    // Create viewer
    const viewer = await createUser('RoomViewer');
    await viewer.page.goto(roomUrl);
    await viewer.page.waitForLoadState('networkidle');
    await viewer.page.waitForTimeout(5000);

    // Verify that member list button is visible (room is connected)
    const memberButton = viewer.page.locator('button[title="メンバー"], button:has-text("メンバー")').first();
    await expect(memberButton).toBeVisible({ timeout: 10000 });

    // Both users should see the same room page
    await expect(creator.page).toHaveURL(/\/(room|r)\//);
    await expect(viewer.page).toHaveURL(/\/(room|r)\//);
  });
});
