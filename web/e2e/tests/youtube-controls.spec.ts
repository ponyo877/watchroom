import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Task 5: YouTube Player Controls Disabled', () => {
  test('should not show native YouTube controls', async ({ page, request }) => {
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

    // Search and select a video
    await page.click('button[title="動画を検索"]');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder*="検索"]', 'test video');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    // Select first video
    const videoResult = page.locator('button:has(img):has(h3)').first();
    await videoResult.waitFor({ state: 'visible', timeout: 10000 });
    await videoResult.click();
    await page.waitForTimeout(5000);

    // Wait for YouTube iframe to load
    const iframe = page.locator('iframe[src*="youtube"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });

    // Get the iframe src and verify controls=0 is present
    const src = await iframe.getAttribute('src');
    expect(src).toContain('controls=0');
  });

  test('custom PlayerControls should be visible and functional', async ({ page, request }) => {
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

    // Search and select a video
    await page.click('button[title="動画を検索"]');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder*="検索"]', 'music video');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    const videoResult = page.locator('button:has(img):has(h3)').first();
    await videoResult.waitFor({ state: 'visible', timeout: 10000 });
    await videoResult.click();
    await page.waitForTimeout(5000);

    // Verify custom PlayerControls are visible
    // Play button
    const playButton = page.locator('button svg.lucide-play, button svg.lucide-pause').first();
    await expect(playButton).toBeVisible({ timeout: 10000 });

    // Skip buttons
    const skipBackButton = page.locator('button svg.lucide-skip-back').first();
    await expect(skipBackButton).toBeVisible();

    const skipForwardButton = page.locator('button svg.lucide-skip-forward').first();
    await expect(skipForwardButton).toBeVisible();

    // Progress bar (seek bar)
    const progressBar = page.locator('input[type="range"]').first();
    await expect(progressBar).toBeVisible();

    // Volume button
    const volumeButton = page.locator('button[title="音量（自分のみ）"]');
    await expect(volumeButton).toBeVisible();

    // Playback rate selector
    const rateSelector = page.locator('select');
    await expect(rateSelector).toBeVisible();
  });
});
