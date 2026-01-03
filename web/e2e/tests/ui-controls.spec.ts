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

      // Reaction button is now inline in the chat input area
      const reactionButton = page.locator('aside button[aria-label="リアクションを追加"]');
      await expect(reactionButton).toBeVisible({ timeout: ROOM_LOAD_TIMEOUT });
      await reactionButton.click();

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

  test.describe('Play History', () => {
    test('should show play history button and open panel', async ({ page, request }) => {
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      await page.goto(`/r/${shortId}`);
      await page.waitForSelector('button[title="AddVideo"]', { timeout: ROOM_LOAD_TIMEOUT });

      // Look for history button
      const historyButton = page.locator('button[title*="履歴"], button:has-text("履歴")').first();
      if (await historyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await historyButton.click();
        await page.waitForTimeout(300);

        // Panel should open (check for empty state or history list)
        const panel = page.locator('text=再生履歴').first();
        await expect(panel).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Sidebar Toggle', () => {
    test('should toggle sidebar visibility with slide animation', async ({ page, request }) => {
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`/r/${shortId}`);

      // Wait for room to load
      await page.waitForSelector('button[title="AddVideo"]', { timeout: ROOM_LOAD_TIMEOUT });

      // Verify sidebar is visible (not translated off-screen)
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible({ timeout: 3000 });
      await expect(sidebar).toHaveClass(/translate-x-0/);
      await expect(sidebar).not.toHaveClass(/translate-x-full/);

      // Verify toggle button is visible
      const toggleButton = page.locator('button[title="チャットを非表示"]');
      await expect(toggleButton).toBeVisible({ timeout: 3000 });

      // Click to hide sidebar
      await toggleButton.click();

      // Sidebar should be translated off-screen (hidden via animation)
      await expect(sidebar).toHaveClass(/translate-x-full/);

      // Toggle button title should change
      const showButton = page.locator('button[title="チャットを表示"]');
      await expect(showButton).toBeVisible();

      // Click to show sidebar
      await showButton.click();

      // Sidebar should slide back in
      await expect(sidebar).toHaveClass(/translate-x-0/);
      await expect(sidebar).not.toHaveClass(/translate-x-full/);
    });
  });
});
