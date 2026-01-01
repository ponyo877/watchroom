import { APIRequestContext } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8080';

/**
 * API helper functions for E2E tests
 */
export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  /**
   * Create a new room via API
   */
  async createRoom(roomId: string, password?: string): Promise<{ shortId: string }> {
    const response = await this.request.post(`${API_BASE_URL}/api/rooms`, {
      data: {
        room_id: roomId,
        password: password || undefined,
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to create room: ${response.status()}`);
    }

    const data = await response.json();
    return { shortId: data.short_id };
  }

  /**
   * Get SkyWay auth token
   */
  async getAuthToken(userId: string, roomName: string): Promise<string> {
    const response = await this.request.post(`${API_BASE_URL}/api/auth/token`, {
      data: {
        user_id: userId,
        room_name: roomName,
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to get auth token: ${response.status()}`);
    }

    const data = await response.json();
    return data.token;
  }

  /**
   * Verify room password
   */
  async verifyPassword(roomId: string, password: string): Promise<boolean> {
    const response = await this.request.post(`${API_BASE_URL}/api/rooms/${roomId}/verify-password`, {
      data: { password },
    });

    if (!response.ok()) {
      return false;
    }

    const data = await response.json();
    return data.valid === true;
  }

  /**
   * Resolve short URL to room ID
   */
  async resolveShortUrl(shortId: string): Promise<{ roomId: string; hasPassword: boolean }> {
    const response = await this.request.get(`${API_BASE_URL}/api/r/${shortId}`);

    if (!response.ok()) {
      throw new Error(`Failed to resolve short URL: ${response.status()}`);
    }

    const data = await response.json();
    return {
      roomId: data.room_id,
      hasPassword: data.has_password,
    };
  }

  /**
   * Search YouTube videos
   */
  async searchYouTubeVideos(query: string): Promise<Array<{ videoId: string; title: string }>> {
    const response = await this.request.get(`${API_BASE_URL}/api/youtube/search`, {
      params: { q: query },
    });

    if (!response.ok()) {
      throw new Error(`Failed to search videos: ${response.status()}`);
    }

    const data = await response.json();
    return data.videos || [];
  }
}

/**
 * Generate a unique room ID
 */
export function generateRoomId(): string {
  return `e2e-room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait helper
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
