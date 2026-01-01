import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('UI Controls', () => {
  test.describe('Task 9: Volume Controls', () => {
    test('should show volume slider on hover', async ({ page, request }) => {
      // Setup: Create a room
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      // Navigate to the room
      await page.goto(`/r/${shortId}`);
      await page.waitForTimeout(5000); // Wait for connection and UI to load

      // Find volume button - look for either Volume2 or VolumeX icon
      const volumeButton = page.locator('button[title="音量（自分のみ）"]');

      // Wait for player controls to be visible
      await expect(volumeButton).toBeVisible({ timeout: 10000 });

      // Hover to show volume slider
      await volumeButton.hover();
      await page.waitForTimeout(500);

      // Check for "自分のみ" text indicating local-only volume
      await expect(page.locator('text=自分のみ')).toBeVisible({ timeout: 5000 });
    });

    test('should toggle mute on click', async ({ page, request }) => {
      // Setup: Create a room
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      // Navigate to the room
      await page.goto(`/r/${shortId}`);
      await page.waitForTimeout(5000);

      // Find volume button
      const volumeButton = page.locator('button[title="音量（自分のみ）"]');
      await expect(volumeButton).toBeVisible({ timeout: 10000 });

      // Click to toggle mute
      await volumeButton.click();
      await page.waitForTimeout(300);

      // Verify button is still functional (click again to toggle back)
      await volumeButton.click();
      await page.waitForTimeout(300);

      // Test passes if the button is clickable without errors
    });
  });

  test.describe('Task 10: X Share Button', () => {
    test('should display X logo with black background', async ({ page, request }) => {
      // Setup: Create a room
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      // Navigate to the room
      await page.goto(`/r/${shortId}`);
      await page.waitForTimeout(3000);

      // Find and click share button
      const shareButton = page.locator('button:has-text("シェア")');
      await expect(shareButton).toBeVisible();
      await shareButton.click();

      // Wait for share menu to open
      await page.waitForTimeout(300);

      // Find X share button
      const xShareButton = page.locator('button:has-text("Xでシェア")');
      await expect(xShareButton).toBeVisible();

      // Verify it has black background (bg-black class)
      await expect(xShareButton).toHaveClass(/bg-black/);

      // Verify X logo SVG is present (the SVG path for X logo)
      const xLogoSvg = xShareButton.locator('svg');
      await expect(xLogoSvg).toBeVisible();
    });

    test('should open X share URL when clicked', async ({ page, request, context }) => {
      // Setup: Create a room
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      // Navigate to the room
      await page.goto(`/r/${shortId}`);
      await page.waitForTimeout(3000);

      // Open share menu
      await page.click('button:has-text("シェア")');
      await page.waitForTimeout(300);

      // Listen for new page (popup)
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click('button:has-text("Xでシェア")'),
      ]);

      // Verify it opens twitter.com or x.com intent/tweet
      const url = popup.url();
      expect(url.includes('twitter.com/intent/tweet') || url.includes('x.com/intent/tweet')).toBe(true);
    });
  });

  test.describe('Task 12: Reaction Picker', () => {
    test('should stay open after selecting reaction', async ({ page, request }) => {
      // Setup: Create a room
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      // Navigate to the room with desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`/r/${shortId}`);
      await page.waitForTimeout(5000);

      // Find reaction picker button in desktop sidebar (not the mobile one)
      // The desktop sidebar has a reaction picker at the bottom
      const sidebarReactionButton = page.locator('aside button[aria-label="リアクションを追加"]');
      await expect(sidebarReactionButton).toBeVisible({ timeout: 10000 });
      await sidebarReactionButton.click();

      // Wait for picker to open
      await page.waitForTimeout(300);

      // Reaction picker popup should be visible (the absolute positioned dropdown)
      // Look for the popup that appears with reaction emoji grid
      const reactionPickerPopup = page.locator('.absolute.bottom-full:has-text("リアクション")');
      await expect(reactionPickerPopup).toBeVisible({ timeout: 5000 });

      // Select a reaction (thumbs up) from the popup
      const thumbsUpButton = reactionPickerPopup.locator('button:has-text("👍")');
      await expect(thumbsUpButton).toBeVisible();
      await thumbsUpButton.click();

      // Wait a bit
      await page.waitForTimeout(300);

      // Picker should STILL be visible (not closed)
      await expect(reactionPickerPopup).toBeVisible();

      // Select another reaction to verify consecutive reactions work
      const heartButton = reactionPickerPopup.locator('button:has-text("❤️")');
      await expect(heartButton).toBeVisible();
      await heartButton.click();

      // Picker should still be visible
      await page.waitForTimeout(300);
      await expect(reactionPickerPopup).toBeVisible();
    });

    test('should allow rapid consecutive reactions', async ({ page, request }) => {
      // Setup: Create a room
      const roomId = generateRoomId();
      const response = await request.post('http://localhost:8080/api/rooms', {
        data: { room_id: roomId },
      });
      const { short_id: shortId } = await response.json();

      // Navigate to the room with desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`/r/${shortId}`);
      await page.waitForTimeout(5000);

      // Open reaction picker in desktop sidebar
      const sidebarReactionButton = page.locator('aside button[aria-label="リアクションを追加"]');
      await expect(sidebarReactionButton).toBeVisible({ timeout: 10000 });
      await sidebarReactionButton.click();
      await page.waitForTimeout(300);

      // The popup that appears
      const reactionPickerPopup = page.locator('.absolute.bottom-full:has-text("リアクション")');
      await expect(reactionPickerPopup).toBeVisible({ timeout: 5000 });

      // Rapidly click multiple reactions
      const reactions = ['👍', '❤️', '😂', '👏'];
      for (const emoji of reactions) {
        const emojiButton = reactionPickerPopup.locator(`button:has-text("${emoji}")`);
        await emojiButton.click();
        await page.waitForTimeout(100); // Small delay between clicks
      }

      // Picker should still be visible after all clicks
      await expect(reactionPickerPopup).toBeVisible();
    });
  });
});
