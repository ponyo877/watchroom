import { http, HttpResponse, delay } from 'msw';
import { mockRooms, mockYouTubeVideos } from './fixtures/rooms';

const API_BASE = 'http://localhost:8080/api';

export const handlers = [
  // Auth
  http.post(`${API_BASE}/auth/token`, async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as { user_id: string; room_name?: string };
    return HttpResponse.json({
      token: `mock-skyway-token-${body.user_id}-${Date.now()}`,
      expires_at: Date.now() + 24 * 60 * 60 * 1000,
    });
  }),

  // Rooms
  http.get(`${API_BASE}/rooms`, async () => {
    await delay(200);
    return HttpResponse.json({
      rooms: mockRooms,
      total: mockRooms.length,
    });
  }),

  http.post(`${API_BASE}/rooms`, async ({ request }) => {
    await delay(150);
    const body = (await request.json()) as { room_id: string; password?: string };
    const shortId = Math.random().toString(36).substring(2, 8);
    return HttpResponse.json({
      short_id: shortId,
    });
  }),

  http.post(`${API_BASE}/rooms/:roomId/verify-password`, async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as { password: string };
    return HttpResponse.json({
      valid: body.password === 'test123',
    });
  }),

  // Short URLs
  http.get(`${API_BASE}/r/:shortId`, async ({ params }) => {
    await delay(100);
    const room = mockRooms.find((r) => r.short_id === params.shortId);
    if (!room) {
      return new HttpResponse(
        JSON.stringify({ code: 404, message: 'Short URL not found' }),
        { status: 404 }
      );
    }
    return HttpResponse.json({
      room_id: room.room_id,
      has_password: room.has_password,
    });
  }),

  // YouTube
  http.get(`${API_BASE}/youtube/search`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const filteredVideos = mockYouTubeVideos.filter(
      (v) =>
        v.title.toLowerCase().includes(query.toLowerCase()) ||
        v.channel_title.toLowerCase().includes(query.toLowerCase())
    );
    return HttpResponse.json({
      items: filteredVideos,
      next_page_token: 'mock-next-page',
    });
  }),

  http.get(`${API_BASE}/youtube/videos/:videoId`, async ({ params }) => {
    await delay(150);
    const video = mockYouTubeVideos.find((v) => v.video_id === params.videoId);
    if (!video) {
      return new HttpResponse(
        JSON.stringify({ code: 404, message: 'Video not found' }),
        { status: 404 }
      );
    }
    return HttpResponse.json(video);
  }),

  // Reports
  http.post(`${API_BASE}/reports`, async () => {
    await delay(150);
    return HttpResponse.json({
      id: Math.floor(Math.random() * 1000),
    });
  }),

  // Bans
  http.get(`${API_BASE}/bans/check/:userId`, async () => {
    await delay(100);
    return HttpResponse.json({
      is_banned: false,
    });
  }),

  // Admin (Basic Auth required)
  http.get(`${API_BASE}/admin/reports`, async () => {
    await delay(200);
    return HttpResponse.json({
      reports: [],
    });
  }),

  http.get(`${API_BASE}/admin/bans`, async () => {
    await delay(200);
    return HttpResponse.json({
      bans: [],
    });
  }),
];
