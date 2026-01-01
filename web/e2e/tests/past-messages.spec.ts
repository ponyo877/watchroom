import { test, expect } from '../fixtures/test-fixtures';
import { generateRoomId } from '../helpers/api';

test.describe('Task 7: Past Messages', () => {
  test('should save message via API', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Past Messages Test Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Save a message
    const messageId = `msg-${Date.now()}`;
    const saveResponse = await request.post(`http://localhost:8080/api/rooms/${roomId}/messages`, {
      data: {
        message_id: messageId,
        sender_id: 'user1',
        sender_name: 'User One',
        sender_icon_url: 'https://example.com/icon.png',
        text: 'Hello, World!',
      },
    });

    expect(saveResponse.ok()).toBeTruthy();
    const saveData = await saveResponse.json();
    expect(saveData.success).toBe(true);
  });

  test('should retrieve past messages via API', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Retrieve Messages Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Save multiple messages
    for (let i = 1; i <= 3; i++) {
      await request.post(`http://localhost:8080/api/rooms/${roomId}/messages`, {
        data: {
          message_id: `msg-${Date.now()}-${i}`,
          sender_id: `user${i}`,
          sender_name: `User ${i}`,
          text: `Message ${i}`,
        },
      });
      // Small delay to ensure order
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Get messages
    const getResponse = await request.get(`http://localhost:8080/api/rooms/${roomId}/messages?limit=50`);
    expect(getResponse.ok()).toBeTruthy();

    const data = await getResponse.json();
    expect(data.messages).toBeDefined();
    expect(data.messages.length).toBe(3);

    // Should be in chronological order (oldest first)
    expect(data.messages[0].text).toBe('Message 1');
    expect(data.messages[1].text).toBe('Message 2');
    expect(data.messages[2].text).toBe('Message 3');
  });

  test('should limit messages returned', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Limit Messages Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Save 5 messages
    for (let i = 1; i <= 5; i++) {
      await request.post(`http://localhost:8080/api/rooms/${roomId}/messages`, {
        data: {
          message_id: `msg-${Date.now()}-${i}`,
          sender_id: 'user1',
          sender_name: 'User One',
          text: `Message ${i}`,
        },
      });
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Get only 3 messages
    const getResponse = await request.get(`http://localhost:8080/api/rooms/${roomId}/messages?limit=3`);
    expect(getResponse.ok()).toBeTruthy();

    const data = await getResponse.json();
    expect(data.messages.length).toBe(3);

    // Should get the most recent 3 messages in chronological order
    expect(data.messages[0].text).toBe('Message 3');
    expect(data.messages[1].text).toBe('Message 4');
    expect(data.messages[2].text).toBe('Message 5');
  });

  test('should return empty array for room with no messages', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Empty Messages Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Get messages (should be empty)
    const getResponse = await request.get(`http://localhost:8080/api/rooms/${roomId}/messages`);
    expect(getResponse.ok()).toBeTruthy();

    const data = await getResponse.json();
    expect(data.messages).toBeDefined();
    expect(data.messages.length).toBe(0);
  });

  test('should include all message fields', async ({ request }) => {
    // Create a room
    const roomId = generateRoomId();
    await request.post('http://localhost:8080/api/rooms', {
      data: {
        room_id: roomId,
        name: 'Message Fields Room',
        creator_id: 'test-creator',
        creator_name: 'Test Creator',
      },
    });

    // Save a message with all fields
    const messageId = `msg-${Date.now()}`;
    const iconUrl = 'https://example.com/avatar.png';
    await request.post(`http://localhost:8080/api/rooms/${roomId}/messages`, {
      data: {
        message_id: messageId,
        sender_id: 'user1',
        sender_name: 'User One',
        sender_icon_url: iconUrl,
        text: 'Test message with all fields',
      },
    });

    // Get messages and verify fields
    const getResponse = await request.get(`http://localhost:8080/api/rooms/${roomId}/messages`);
    const data = await getResponse.json();

    expect(data.messages.length).toBe(1);
    const msg = data.messages[0];
    expect(msg.message_id).toBe(messageId);
    expect(msg.sender_id).toBe('user1');
    expect(msg.sender_name).toBe('User One');
    expect(msg.sender_icon_url).toBe(iconUrl);
    expect(msg.text).toBe('Test message with all fields');
    expect(msg.timestamp).toBeDefined();
    expect(typeof msg.timestamp).toBe('number');
  });
});
