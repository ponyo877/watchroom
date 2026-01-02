import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

const ROOM_LOAD_TIMEOUT = 8000;

test.describe('UI Controls', () => {
  test.describe.configure({ mode: 'parallel' });

  test.describe('Volume Controls', () => {
    test('should show volume slider and toggle mute', async ({ page, request }) => {
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      await page.goto(`/r/${shortId}`);

      const volumeButton = page.locator('button[title="音量（自分のみ）"]');
      await expect(volumeButton).toBeVisible({ timeout: ROOM_LOAD_TIMEOUT });

      // Hover to show slider
      await volumeButton.hover();
      await expect(page.locator('text=自分のみ')).toBeVisible({ timeout: 3000 });

      // Toggle mute
      await volumeButton.click();
      await page.waitForTimeout(200);
      await volumeButton.click();
    });
  });

  test.describe('X Share Button', () => {
    test('should display X share button with black background', async ({ page, request }) => {
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      await page.goto(`/r/${shortId}`);

      // Share button is now icon-only with title attribute
      const shareButton = page.locator('button[title="シェア"]');
      await expect(shareButton).toBeVisible({ timeout: ROOM_LOAD_TIMEOUT });
      await shareButton.click();

      const xShareButton = page.locator('button:has-text("Xでシェア")');
      await expect(xShareButton).toBeVisible({ timeout: 2000 });
      await expect(xShareButton).toHaveClass(/bg-black/);
      await expect(xShareButton.locator('svg')).toBeVisible();
    });

    test('should open X share URL when clicked', async ({ page, request, context }) => {
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      await page.goto(`/r/${shortId}`);

      // Share button is now icon-only with title attribute
      const shareButton = page.locator('button[title="シェア"]');
      await expect(shareButton).toBeVisible({ timeout: ROOM_LOAD_TIMEOUT });
      await shareButton.click();

      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click('button:has-text("Xでシェア")'),
      ]);

      const url = popup.url();
      expect(url.includes('twitter.com/intent/tweet') || url.includes('x.com/intent/tweet')).toBe(true);
    });
  });

  test.describe('Reaction Picker', () => {
    test('should stay open and allow rapid reactions', async ({ page, request }) => {
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`/r/${shortId}`);

      const sidebarReactionButton = page.locator('aside button[aria-label="リアクションを追加"]');
      await expect(sidebarReactionButton).toBeVisible({ timeout: ROOM_LOAD_TIMEOUT });
      await sidebarReactionButton.click();

      const reactionPickerPopup = page.locator('.absolute.bottom-full:has-text("リアクション")');
      await expect(reactionPickerPopup).toBeVisible({ timeout: 3000 });

      // Select reactions rapidly
      const reactions = ['👍', '❤️', '😂', '👏'];
      for (const emoji of reactions) {
        const emojiButton = reactionPickerPopup.locator(`button:has-text("${emoji}")`);
        await emojiButton.click();
        await page.waitForTimeout(50);
      }

      // Picker should still be visible
      await expect(reactionPickerPopup).toBeVisible();
    });
  });
});
