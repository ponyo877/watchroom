import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Task 3: Room Full Check', () => {
  test('should return error when room is full', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Full Room Test',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Set member_count to max_members (10)
    for (let i = 0; i < 10; i++) {
      await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);
    }

    // Verify room is full
    const infoResponse = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    const infoData = await infoResponse.json();
    expect(infoData.member_count).toBe(10);
    expect(infoData.max_members).toBe(10);

    // Try to get token for full room - should fail with 403
    const tokenResponse = await request.post('http://localhost:8080/api/auth/token', {
      data: {
        user_id: 'new-user',
        room_name: roomId,
      },
    });

    expect(tokenResponse.status()).toBe(403);
    const errorData = await tokenResponse.json();
    expect(errorData.error).toBe('room_full');
    expect(errorData.message).toBe('ルームが満員です');
  });

  test('should allow token when room is not full', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Not Full Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Set member_count to 5 (less than max_members)
    for (let i = 0; i < 5; i++) {
      await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);
    }

    // Try to get token - should succeed
    const tokenResponse = await request.post('http://localhost:8080/api/auth/token', {
      data: {
        user_id: 'new-user',
        room_name: roomId,
      },
    });

    expect(tokenResponse.status()).toBe(200);
    const data = await tokenResponse.json();
    expect(data.token).toBeDefined();
    expect(data.expires_at).toBeDefined();
  });

  test('should allow token when room is at max-1', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Almost Full Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Set member_count to 9 (max_members - 1)
    for (let i = 0; i < 9; i++) {
      await request.post(`http://localhost:8080/api/rooms/${roomId}/member-count/increment`);
    }

    // Verify room is almost full
    const infoResponse = await request.get(`http://localhost:8080/api/rooms/${roomId}/member-info`);
    const infoData = await infoResponse.json();
    expect(infoData.member_count).toBe(9);

    // Try to get token - should succeed (one spot left)
    const tokenResponse = await request.post('http://localhost:8080/api/auth/token', {
      data: {
        user_id: 'new-user',
        room_name: roomId,
      },
    });

    expect(tokenResponse.status()).toBe(200);
    const data = await tokenResponse.json();
    expect(data.token).toBeDefined();
  });

  test('should allow token for new room', async ({ request }) => {
    // Try to get token for non-existent room - should succeed
    const roomId = generateRoomId();
    const tokenResponse = await request.post('http://localhost:8080/api/auth/token', {
      data: {
        user_id: 'new-user',
        room_name: roomId,
      },
    });

    expect(tokenResponse.status()).toBe(200);
    const data = await tokenResponse.json();
    expect(data.token).toBeDefined();
  });
});
