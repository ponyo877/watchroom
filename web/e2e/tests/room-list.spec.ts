import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Room List', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should show rooms and navigate to room on click', async ({ page, homePage, request }) => {
    // Create a room via API
    const roomId = generateRoomId();
    const roomName = `Test Room ${Date.now()}`;

    const response = await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });
    const { short_id: shortId } = await response.json();

    await homePage.goto();
    await expect(page.locator('header img[alt="WatchRoom"]')).toBeVisible();

    // Wait for loading to complete
    await expect(page.locator('text=部屋を読み込み中')).not.toBeVisible({ timeout: 10000 });

    // Room should appear
    const roomCard = page.locator(`text=${roomName}`).first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });

    // Click and verify navigation
    await roomCard.click();
    await expect(page).toHaveURL(new RegExp(`/(room|r)/${shortId}`), { timeout: 10000 });
  });

  test('should show password indicator for protected rooms', async ({ page, homePage, request }) => {
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

    await homePage.goto();
    await expect(page.locator('text=部屋を読み込み中')).not.toBeVisible({ timeout: 10000 });

    const roomCard = page.locator(`text=${roomName}`).first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });

    // Check for lock icon - it's a sibling of the room name in the flex container
    const roomLink = page.locator(`a:has-text("${roomName}")`).first();
    await expect(roomLink.locator('svg').first()).toBeVisible();
  });

  test('should refresh room list on page reload', async ({ page, homePage, request }) => {
    await homePage.goto();
    await expect(page.locator('text=部屋を読み込み中')).not.toBeVisible({ timeout: 10000 });

    // Create a new room
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

    // Reload and verify new room appears
    await page.reload();
    await expect(page.locator('text=部屋を読み込み中')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${roomName}`)).toBeVisible({ timeout: 10000 });
  });
});
