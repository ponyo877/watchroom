import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Task 11: Play History', () => {
  test('should show play history button', async ({ page, request }) => {
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

    // Find play history button
    const historyButton = page.locator('button[title="再生履歴"]');
    await expect(historyButton).toBeVisible({ timeout: 10000 });
  });

  test('should open play history panel when button clicked', async ({ page, request }) => {
    // Setup: Create a room
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    // Navigate to the room
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/r/${shortId}`);
    await page.waitForTimeout(5000);

    // Click play history button
    await page.click('button[title="再生履歴"]');
    await page.waitForTimeout(500);

    // Verify play history panel is visible (check for heading)
    const historyHeading = page.locator('h2:has-text("再生履歴")');
    await expect(historyHeading).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no videos played', async ({ page, request }) => {
    // Setup: Create a room
    const roomId = generateRoomId();
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    // Navigate to the room
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/r/${shortId}`);
    await page.waitForTimeout(5000);

    // Click play history button
    await page.click('button[title="再生履歴"]');
    await page.waitForTimeout(500);

    // Verify empty state message
    const emptyMessage = page.locator('text=履歴がありません').or(page.locator('text=再生履歴がありません'));
    await expect(emptyMessage).toBeVisible({ timeout: 5000 });
  });
});
