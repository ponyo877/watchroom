import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Member Count UI', () => {
  test.describe.configure({ mode: 'parallel' });

  test('should display member count in room list', async ({ page, homePage, request }) => {
    const roomId = generateRoomId();
    const roomName = `Member Count Room ${Date.now()}`;

    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator-id',
        creator_name: 'Test Creator',
      },
    });

    await homePage.goto();
    await expect(page.locator('text=部屋を読み込み中')).not.toBeVisible({ timeout: 10000 });

    const roomCard = page.locator(`text=${roomName}`).first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });

    // Check member count display (format: X/10)
    const parentCard = roomCard.locator('xpath=ancestor::a[contains(@class, "block")]');
    const memberCountText = parentCard.locator('text=/\\d+\\/\\d+/');
    await expect(memberCountText).toBeVisible();
    await expect(memberCountText).toHaveText('0/10');
  });
});
