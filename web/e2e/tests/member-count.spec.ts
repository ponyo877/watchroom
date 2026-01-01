import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Member Count', () => {
  test('should display member count in room list', async ({ page, homePage, request }) => {
    // Create a room via API
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

    // Navigate to home page
    await homePage.goto();

    // Wait for room list to load
    await page.waitForTimeout(2000);

    // Find the room card
    const roomCard = page.locator(`text=${roomName}`).first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });

    // Check member count display (format: X/10)
    const parentCard = roomCard.locator('xpath=ancestor::a[contains(@class, "block")]');
    const memberCountText = parentCard.locator('text=/\\d+\\/\\d+/');
    await expect(memberCountText).toBeVisible();

    // Should show 0/10 initially
    await expect(memberCountText).toHaveText('0/10');
  });

  test('should increment member count via API', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Increment Test Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Get initial member info
    const initialResponse = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    const initialData = await initialResponse.json();
    expect(initialData.member_count).toBe(0);
    expect(initialData.max_members).toBe(10);

    // Increment member count
    const incrementResponse = await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);
    expect(incrementResponse.ok()).toBeTruthy();

    // Verify incremented
    const afterIncrement = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    const afterData = await afterIncrement.json();
    expect(afterData.member_count).toBe(1);
  });

  test('should decrement member count via API', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Decrement Test Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Increment first
    await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);
    await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);

    // Verify count is 2
    const afterIncrement = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    const afterIncrementData = await afterIncrement.json();
    expect(afterIncrementData.member_count).toBe(2);

    // Decrement
    const decrementResponse = await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/decrement`);
    expect(decrementResponse.ok()).toBeTruthy();

    // Verify decremented
    const afterDecrement = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    const afterDecrementData = await afterDecrement.json();
    expect(afterDecrementData.member_count).toBe(1);
  });

  test('should not go below 0 on decrement', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'No Negative Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Decrement when count is 0
    await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/decrement`);

    // Count should still be 0, not negative
    const response = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    const data = await response.json();
    expect(data.member_count).toBe(0);
  });

  test('should display updated member count in room list API', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    const roomName = `API Count Room ${Date.now()}`;

    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: roomName,
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Increment 3 times
    await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);
    await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);
    await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);

    // Get room list
    const listResponse = await request.get('http://localhost:8080/api/rooms');
    const listData = await listResponse.json();

    // Find our room
    const room = listData.rooms.find((r: { room_id: string }) => r.room_id === roomId);
    expect(room).toBeDefined();
    expect(room.member_count).toBe(3);
    expect(room.max_members).toBe(10);
  });
});
