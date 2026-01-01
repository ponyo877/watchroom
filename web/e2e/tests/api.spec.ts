import { test, expect } from '@playwright/test';
import { generateRoomId } from '../helpers/api';

const API_BASE = 'http://localhost:8080';

/**
 * Pure API tests - no browser needed, runs fast in parallel
 */
test.describe('API Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test.describe('Room Full Check', () => {
    test('should return error when room is full', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'Full Room', creator_id: 'c', creator_name: 'C' },
      });

      // Increment to max (10)
      await Promise.all(
        Array(10).fill(null).map(() =>
          request.post(`${API_BASE}/api/rooms/${roomId}/member-count/increment`)
        )
      );

      const tokenRes = await request.post(`${API_BASE}/api/auth/token`, {
        data: { user_id: 'new-user', room_name: roomId },
      });
      expect(tokenRes.status()).toBe(403);
      const error = await tokenRes.json();
      expect(error.error).toBe('room_full');
    });

    test('should allow token when room is not full', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'Not Full', creator_id: 'c', creator_name: 'C' },
      });

      await Promise.all(
        Array(5).fill(null).map(() =>
          request.post(`${API_BASE}/api/rooms/${roomId}/member-count/increment`)
        )
      );

      const tokenRes = await request.post(`${API_BASE}/api/auth/token`, {
        data: { user_id: 'new-user', room_name: roomId },
      });
      expect(tokenRes.status()).toBe(200);
      expect((await tokenRes.json()).token).toBeDefined();
    });

    test('should allow token for new room', async ({ request }) => {
      const roomId = generateRoomId();
      const tokenRes = await request.post(`${API_BASE}/api/auth/token`, {
        data: { user_id: 'new-user', room_name: roomId },
      });
      expect(tokenRes.status()).toBe(200);
      expect((await tokenRes.json()).token).toBeDefined();
    });
  });

  test.describe('Member Count', () => {
    test('should increment and decrement member count', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'Count Test', creator_id: 'c', creator_name: 'C' },
      });

      // Verify initial count is 0
      let info = await (await request.get(`${API_BASE}/api/rooms/${roomId}/member-info`)).json();
      expect(info.member_count).toBe(0);

      // Increment twice
      await request.post(`${API_BASE}/api/rooms/${roomId}/member-count/increment`);
      await request.post(`${API_BASE}/api/rooms/${roomId}/member-count/increment`);
      info = await (await request.get(`${API_BASE}/api/rooms/${roomId}/member-info`)).json();
      expect(info.member_count).toBe(2);

      // Decrement once
      await request.post(`${API_BASE}/api/rooms/${roomId}/member-count/decrement`);
      info = await (await request.get(`${API_BASE}/api/rooms/${roomId}/member-info`)).json();
      expect(info.member_count).toBe(1);
    });

    test('should not go below 0 on decrement', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'No Negative', creator_id: 'c', creator_name: 'C' },
      });

      await request.post(`${API_BASE}/api/rooms/${roomId}/member-count/decrement`);
      const info = await (await request.get(`${API_BASE}/api/rooms/${roomId}/member-info`)).json();
      expect(info.member_count).toBe(0);
    });

    test('should show updated count in room list', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: `Count Room ${Date.now()}`, creator_id: 'c', creator_name: 'C' },
      });

      await Promise.all(
        Array(3).fill(null).map(() =>
          request.post(`${API_BASE}/api/rooms/${roomId}/member-count/increment`)
        )
      );

      const list = await (await request.get(`${API_BASE}/api/rooms`)).json();
      const room = list.rooms.find((r: { room_id: string }) => r.room_id === roomId);
      expect(room.member_count).toBe(3);
    });
  });

  test.describe('Past Messages', () => {
    test('should save and retrieve messages', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'Messages', creator_id: 'c', creator_name: 'C' },
      });

      // Save messages
      for (let i = 1; i <= 3; i++) {
        await request.post(`${API_BASE}/api/rooms/${roomId}/messages`, {
          data: {
            message_id: `msg-${Date.now()}-${i}`,
            sender_id: `user${i}`,
            sender_name: `User ${i}`,
            text: `Message ${i}`,
          },
        });
      }

      // Get messages
      const res = await request.get(`${API_BASE}/api/rooms/${roomId}/messages?limit=50`);
      const data = await res.json();
      expect(data.messages.length).toBe(3);
      expect(data.messages[0].text).toBe('Message 1');
    });

    test('should limit messages returned', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'Limit Test', creator_id: 'c', creator_name: 'C' },
      });

      // Save 5 messages
      for (let i = 1; i <= 5; i++) {
        await request.post(`${API_BASE}/api/rooms/${roomId}/messages`, {
          data: {
            message_id: `msg-${Date.now()}-${i}`,
            sender_id: 'user1',
            sender_name: 'User',
            text: `Message ${i}`,
          },
        });
      }

      // Get only 3
      const res = await request.get(`${API_BASE}/api/rooms/${roomId}/messages?limit=3`);
      const data = await res.json();
      expect(data.messages.length).toBe(3);
    });

    test('should return empty array for no messages', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'Empty', creator_id: 'c', creator_name: 'C' },
      });

      const res = await request.get(`${API_BASE}/api/rooms/${roomId}/messages`);
      const data = await res.json();
      expect(data.messages.length).toBe(0);
    });

    test('should include all message fields', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: { room_id: roomId, name: 'Fields', creator_id: 'c', creator_name: 'C' },
      });

      const msgId = `msg-${Date.now()}`;
      const iconUrl = 'https://example.com/icon.png';
      await request.post(`${API_BASE}/api/rooms/${roomId}/messages`, {
        data: {
          message_id: msgId,
          sender_id: 'user1',
          sender_name: 'User One',
          sender_icon_url: iconUrl,
          text: 'Test',
        },
      });

      const res = await request.get(`${API_BASE}/api/rooms/${roomId}/messages`);
      const data = await res.json();
      const msg = data.messages[0];
      expect(msg.message_id).toBe(msgId);
      expect(msg.sender_icon_url).toBe(iconUrl);
      expect(typeof msg.timestamp).toBe('number');
    });
  });

  test.describe('Room List', () => {
    test('should fetch rooms from API', async ({ request }) => {
      const res = await request.get(`${API_BASE}/api/rooms`);
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(Array.isArray(data.rooms)).toBe(true);
    });

    test('should create room with password', async ({ request }) => {
      const roomId = generateRoomId();
      await request.post(`${API_BASE}/api/rooms`, {
        data: {
          room_id: roomId,
          name: 'Protected',
          creator_id: 'c',
          creator_name: 'C',
          password: 'secret123',
        },
      });

      const list = await (await request.get(`${API_BASE}/api/rooms`)).json();
      const room = list.rooms.find((r: { room_id: string }) => r.room_id === roomId);
      expect(room.has_password).toBe(true);
    });
  });
});
