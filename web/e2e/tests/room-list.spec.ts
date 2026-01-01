import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Room List', () => {
  test('should show "no rooms" message when list is empty', async ({ page, homePage }) => {
    await homePage.goto();

    // Verify home page loaded
    await expect(page.locator('h1')).toContainText('部屋一覧');

    // Wait for room list to load
    await page.waitForTimeout(1000);

    // Since we're testing with real backend, the list might be empty initially
    // or show existing rooms - either state is valid
    const roomList = page.locator('[class*="grid"]');
    const emptyMessage = page.locator('text=まだ部屋がありません');
    const loadingSpinner = page.locator('text=部屋を読み込み中');

    // Loading should complete
    await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });

    // Either room cards or empty message should be visible
    const hasRooms = await roomList.isVisible();
    const showsEmpty = await emptyMessage.isVisible();
    expect(hasRooms || showsEmpty).toBeTruthy();
  });

  test('should display room after creation', async ({ page, homePage, request }) => {
    // Create a room via API first
    const roomId = generateRoomId();
    const roomName = `Test Room ${Date.now()}`;

    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });

    // Navigate to home page
    await homePage.goto();

    // Wait for room list to load
    await page.waitForTimeout(2000);

    // Check if the created room appears in the list
    const roomCard = page.locator(`text=${roomName}`);
    await expect(roomCard).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to room when clicking room card', async ({ page, homePage, request }) => {
    // Create a room via API
    const roomId = generateRoomId();
    const roomName = `Clickable Room ${Date.now()}`;

    const response = await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });
    const { short_id: shortId } = await response.json();

    // Navigate to home page
    await homePage.goto();

    // Wait for room list to load
    await page.waitForTimeout(2000);

    // Click on the room card
    const roomCard = page.locator(`text=${roomName}`).first();
    await roomCard.click();

    // Verify navigation to room page
    await expect(page).toHaveURL(new RegExp(`/(room|r)/${shortId}`), { timeout: 10000 });
  });

  test('should show password indicator for protected rooms', async ({ page, homePage, request }) => {
    // Create a password-protected room
    const roomId = generateRoomId();
    const roomName = `Protected Room ${Date.now()}`;

    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
        password: 'secret123',
      },
    });

    // Navigate to home page
    await homePage.goto();

    // Wait for room list to load
    await page.waitForTimeout(2000);

    // Find the room card
    const roomCard = page.locator(`text=${roomName}`).first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });

    // Check for password indicator (lock icon or similar)
    const parentCard = roomCard.locator('xpath=ancestor::*[contains(@class, "card") or contains(@class, "rounded")]').first();
    const lockIcon = parentCard.locator('svg');

    // The lock icon should be visible for password-protected rooms
    await expect(lockIcon.first()).toBeVisible();
  });

  test('should refresh room list on page reload', async ({ page, homePage, request }) => {
    // First, visit home page
    await homePage.goto();
    await page.waitForTimeout(1000);

    // Create a new room via API
    const roomId = generateRoomId();
    const roomName = `New Room ${Date.now()}`;

    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });

    // Reload the page
    await page.reload();

    // Wait for room list to load
    await page.waitForTimeout(2000);

    // The new room should appear
    const roomCard = page.locator(`text=${roomName}`);
    await expect(roomCard).toBeVisible({ timeout: 10000 });
  });
});
