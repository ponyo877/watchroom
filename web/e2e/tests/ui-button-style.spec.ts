import { test, expect } from '@playwright/test';

test.describe('UI Button Styles', () => {
  test('create room button should have deep green background color', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Find the create room button (now labeled "NewRoom")
    const createRoomButton = page.locator('button:has-text("NewRoom")');
    await expect(createRoomButton).toBeVisible();

    // Check the background color is deep green (#4A7C59)
    const bgColor = await createRoomButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // #4A7C59 converts to rgb(74, 124, 89)
    expect(bgColor).toBe('rgb(74, 124, 89)');
  });

  test('create room button should have white text', async ({ page }) => {
    await page.goto('/');

    const createRoomButton = page.locator('button:has-text("NewRoom")');
    await expect(createRoomButton).toBeVisible();

    const textColor = await createRoomButton.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // White is rgb(255, 255, 255)
    expect(textColor).toBe('rgb(255, 255, 255)');
  });

  test('create room button should display "NewRoom" text', async ({ page }) => {
    await page.goto('/');

    // Verify the button displays "NewRoom" text (visible on desktop)
    const createRoomButton = page.locator('button:has-text("NewRoom")');
    await expect(createRoomButton).toBeVisible();

    // The button should have a Monitor icon (SVG)
    const icon = createRoomButton.locator('svg');
    await expect(icon).toBeVisible();
  });
});

test.describe('Video Search Button', () => {
  test('should display AddVideo button with Film icon in room page', async ({ page, request }) => {
    // Create a test room
    const roomId = `test-room-${Date.now()}`;
    const response = await request.post('http://localhost:8080/api/rooms', {
      data: { room_id: roomId },
    });
    const { short_id: shortId } = await response.json();

    await page.goto(`/r/${shortId}`);

    // Wait for and verify the AddVideo button in header (use .first() as there are 2 buttons)
    const addVideoButton = page.locator('header button[title="AddVideo"]');
    await expect(addVideoButton).toBeVisible({ timeout: 10000 });

    // Verify it has an SVG icon (Film icon)
    const icon = addVideoButton.locator('svg');
    await expect(icon).toBeVisible();

    // Verify it has the main button styling (green background)
    const bgColor = await addVideoButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // #4A7C59 converts to rgb(74, 124, 89)
    expect(bgColor).toBe('rgb(74, 124, 89)');
  });
});
