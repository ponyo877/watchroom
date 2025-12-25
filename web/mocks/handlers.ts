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

  // Image upload
  http.post(`${API_BASE}/uploads/presign`, async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as { filename: string; content_type: string };
    const key = `uploads/${Date.now()}-${body.filename}`;
    return HttpResponse.json({
      upload_url: `https://example-bucket.s3.amazonaws.com/${key}?presigned=true`,
      key,
      public_url: `https://cdn.example.com/${key}`,
    });
  }),

  // Bans
  http.get(`${API_BASE}/bans/check/:userId`, async () => {
    await delay(100);
    return HttpResponse.json({
      is_banned: false,
    });
  }),

  // Kick user from room
  http.post(`${API_BASE}/rooms/:roomId/kick`, async () => {
    await delay(100);
    return HttpResponse.json({ success: true });
  }),

  // Ban user from room
  http.post(`${API_BASE}/rooms/:roomId/ban`, async () => {
    await delay(100);
    return HttpResponse.json({ success: true });
  }),

  // Password management
  http.put(`${API_BASE}/rooms/:roomId/password`, async ({ request }) => {
    await delay(150);
    const body = (await request.json()) as { old_password?: string; new_password: string };
    if (body.new_password) {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ success: false }, { status: 400 });
  }),

  http.delete(`${API_BASE}/rooms/:roomId/password`, async ({ request }) => {
    await delay(150);
    const body = (await request.json()) as { password: string };
    if (body.password === 'test123') {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ success: false }, { status: 400 });
  }),

  // Admin (Basic Auth required)
  http.get(`${API_BASE}/admin/reports`, async ({ request }) => {
    await delay(200);
    const secret = request.headers.get('X-Admin-Secret');
    if (!secret || secret !== 'admin-secret') {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({
      reports: [
        {
          id: '1',
          roomId: 'room-123',
          reporterId: 'user-1',
          reporterName: 'User1',
          targetId: 'user-2',
          targetName: 'BadUser',
          messageText: '不適切なメッセージ内容',
          reason: 'harassment: 嫌がらせ行為',
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          roomId: 'room-456',
          reporterId: 'user-3',
          reporterName: 'User3',
          targetId: 'user-4',
          targetName: 'SpamUser',
          messageText: 'スパムメッセージ',
          reason: 'spam',
          status: 'reviewed',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    });
  }),

  http.patch(`${API_BASE}/admin/reports/:reportId`, async ({ request, params }) => {
    await delay(150);
    const secret = request.headers.get('X-Admin-Secret');
    if (!secret || secret !== 'admin-secret') {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as { status: string };
    return HttpResponse.json({
      id: params.reportId,
      status: body.status,
    });
  }),

  http.get(`${API_BASE}/admin/bans`, async ({ request }) => {
    await delay(200);
    const secret = request.headers.get('X-Admin-Secret');
    if (!secret || secret !== 'admin-secret') {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({
      bans: [
        {
          id: 'ban-1',
          userId: 'user-bad-1',
          userName: 'BannedUser1',
          reason: '繰り返しのスパム行為',
          bannedBy: 'admin',
          bannedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          expiresAt: null,
          isGlobal: true,
        },
        {
          id: 'ban-2',
          userId: 'user-bad-2',
          userName: 'TempBannedUser',
          reason: '不適切な言動',
          bannedBy: 'admin',
          bannedAt: new Date(Date.now() - 86400000).toISOString(),
          expiresAt: new Date(Date.now() + 86400000 * 6).toISOString(),
          isGlobal: false,
          roomId: 'room-123',
        },
      ],
    });
  }),

  http.post(`${API_BASE}/admin/bans`, async ({ request }) => {
    await delay(150);
    const secret = request.headers.get('X-Admin-Secret');
    if (!secret || secret !== 'admin-secret') {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as {
      user_id: string;
      reason: string;
      is_global: boolean;
      room_id?: string;
      expires_at?: string;
    };
    return HttpResponse.json({
      id: `ban-${Date.now()}`,
      ...body,
    });
  }),

  http.delete(`${API_BASE}/admin/bans/:banId`, async ({ request }) => {
    await delay(150);
    const secret = request.headers.get('X-Admin-Secret');
    if (!secret || secret !== 'admin-secret') {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ success: true });
  }),
];
