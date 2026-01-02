import { test, expect } from '../fixtures/test-fixtures';

const ROOM_LOAD_TIMEOUT = 8000;

test.describe('Permission System', () => {
  test.describe.configure({ mode: 'serial' });

  test('creator should have control permission, non-creator should not', async ({ createUser }) => {
    test.setTimeout(120000);

    // Create creator
    const creator = await createUser('Creator');
    await creator.page.goto('/');
    await creator.page.waitForLoadState('networkidle');

    await creator.page.click('button:has-text("NewRoom")');
    await creator.page.waitForSelector('input#roomName', { timeout: 3000 });
    await creator.page.fill('input#roomName', `Permission Test ${Date.now()}`);
    await creator.page.click('button[type="submit"]:has-text("作成")');
    await creator.page.waitForURL(/\/(room|r)\//, { timeout: 15000 });

    const roomUrl = creator.page.url();
    await creator.page.waitForSelector('button[title="NewVideo"]', { timeout: ROOM_LOAD_TIMEOUT });

    // Create viewer
    const viewer = await createUser('Viewer');
    await viewer.page.goto(roomUrl);
    await viewer.page.waitForSelector('button[title="NewVideo"]', { timeout: ROOM_LOAD_TIMEOUT });

    // Creator searches for video
    await creator.page.click('button[title="NewVideo"]');
    await creator.page.waitForSelector('input[placeholder*="検索"]', { timeout: 3000 });
    await creator.page.fill('input[placeholder*="検索"]', 'test');
    await creator.page.keyboard.press('Enter');

    const videoResult = creator.page.locator('button:has(img):has(h3)').first();
    if (await videoResult.isVisible({ timeout: 10000 }).catch(() => false)) {
      await videoResult.click();
      await creator.page.waitForTimeout(2000);

      // Wait for video to sync
      await viewer.page.waitForTimeout(2000);

      // Check creator's play button is enabled
      const creatorPlayButton = creator.page.locator('button').filter({
        has: creator.page.locator('svg.lucide-play, svg.lucide-pause')
      }).first();

      if (await creatorPlayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const creatorDisabled = await creatorPlayButton.isDisabled();
        expect(creatorDisabled).toBe(false);
      }

      // Check viewer's play button is disabled
      const viewerPlayButton = viewer.page.locator('button').filter({
        has: viewer.page.locator('svg.lucide-play, svg.lucide-pause')
      }).first();

      if (await viewerPlayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const viewerDisabled = await viewerPlayButton.isDisabled();
        expect(viewerDisabled).toBe(true);
      }
    }
  });
});
