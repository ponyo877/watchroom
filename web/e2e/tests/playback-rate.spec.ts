import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Task 8: Playback Rate Change', () => {
  test('should update playback rate selector when changed', async ({ page, request }) => {
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

    // Find playback rate selector
    const rateSelector = page.locator('select').filter({ hasText: '1x' });
    await expect(rateSelector).toBeVisible({ timeout: 10000 });

    // Get initial value
    const initialValue = await rateSelector.inputValue();
    expect(initialValue).toBe('1');

    // Change to 1.5x
    await rateSelector.selectOption('1.5');
    await page.waitForTimeout(500);

    // Verify the selector shows the new value
    const newValue = await rateSelector.inputValue();
    expect(newValue).toBe('1.5');
  });

  test('should persist playback rate after changing multiple times', async ({ page, request }) => {
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

    // Find playback rate selector
    const rateSelector = page.locator('select').filter({ hasText: '1x' });
    await expect(rateSelector).toBeVisible({ timeout: 10000 });

    // Change to 0.5x
    await rateSelector.selectOption('0.5');
    await page.waitForTimeout(300);
    expect(await rateSelector.inputValue()).toBe('0.5');

    // Change to 2x
    await rateSelector.selectOption('2');
    await page.waitForTimeout(300);
    expect(await rateSelector.inputValue()).toBe('2');

    // Change back to 1x
    await rateSelector.selectOption('1');
    await page.waitForTimeout(300);
    expect(await rateSelector.inputValue()).toBe('1');
  });
});
