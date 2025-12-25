import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;

@service({
  title: "WatchRoom API",
  version: "1.0.0",
})
@server("http://localhost:8080", "Local development server")
namespace WatchRoomAPI;

// ============================================
// Common Models
// ============================================

model Error {
  code: int32;
  message: string;
}

// ============================================
// Auth
// ============================================

model AuthTokenRequest {
  user_id: string;
  room_name?: string;
}

model AuthTokenResponse {
  token: string;
  expires_at: int64;
}

@route("/api/auth")
interface Auth {
  @post
  @route("/token")
  createToken(@body body: AuthTokenRequest): AuthTokenResponse | Error;
}

// ============================================
// Rooms
// ============================================

model VideoInfo {
  video_id: string;
  title: string;
  thumbnail: string;
  current_time?: float32;
  is_playing?: boolean;
}

model Room {
  room_id: string;
  name: string;
  creator_id: string;
  creator_name: string;
  creator_icon_url?: string;
  has_password: boolean;
  member_count: int32;
  max_members: int32;
  current_video?: VideoInfo;
  short_id?: string;
}

model RoomListResponse {
  rooms: Room[];
  total: int32;
}

model CreateRoomRequest {
  room_id: string;
  password?: string;
}

model CreateRoomResponse {
  short_id: string;
}

model VerifyPasswordRequest {
  password: string;
}

model VerifyPasswordResponse {
  valid: boolean;
}

model ChangePasswordRequest {
  old_password?: string;
  new_password: string;
}

model SuccessResponse {
  success: boolean;
}

@route("/api/rooms")
interface Rooms {
  @get
  list(@query include_locked?: boolean): RoomListResponse | Error;

  @post
  create(@body body: CreateRoomRequest): CreateRoomResponse | Error;

  @post
  @route("/{room_id}/verify-password")
  verifyPassword(
    @path room_id: string,
    @body body: VerifyPasswordRequest,
  ): VerifyPasswordResponse | Error;

  @put
  @route("/{room_id}/password")
  changePassword(
    @path room_id: string,
    @body body: ChangePasswordRequest,
  ): SuccessResponse | Error;

  @delete
  @route("/{room_id}/password")
  deletePassword(
    @path room_id: string,
    @body body: VerifyPasswordRequest,
  ): SuccessResponse | Error;

  @delete
  @route("/{room_id}")
  deleteRoom(@path room_id: string): SuccessResponse | Error;
}

// ============================================
// Short URLs
// ============================================

model ShortURLResponse {
  room_id: string;
  has_password: boolean;
}

@route("/api/r")
interface ShortURLs {
  @get
  @route("/{short_id}")
  resolve(@path short_id: string): ShortURLResponse | Error;
}

// ============================================
// Upload
// ============================================

model UploadResponse {
  url: string;
}

@route("/api/upload")
interface Upload {
  @post
  @route("/icon")
  uploadIcon(@header contentType: "multipart/form-data"): UploadResponse | Error;
}

// ============================================
// YouTube
// ============================================

model YouTubeVideo {
  video_id: string;
  title: string;
  description?: string;
  thumbnail: string;
  channel_title: string;
  published_at: string;
  duration?: string;
}

model YouTubeSearchResponse {
  items: YouTubeVideo[];
  next_page_token?: string;
}

@route("/api/youtube")
interface YouTube {
  @get
  @route("/search")
  search(
    @query q: string,
    @query max_results?: int32,
    @query page_token?: string,
  ): YouTubeSearchResponse | Error;

  @get
  @route("/videos/{video_id}")
  getVideo(@path video_id: string): YouTubeVideo | Error;
}

// ============================================
// Reports
// ============================================

model CreateReportRequest {
  room_id: string;
  target_id: string;
  message_text: string;
  reason: string;
}

model CreateReportResponse {
  id: int32;
}

model Report {
  id: int32;
  room_id: string;
  reporter_id: string;
  target_id: string;
  message_text: string;
  reason: string;
  status: string;
  created_at: string;
}

model ReportListResponse {
  reports: Report[];
}

@route("/api/reports")
interface Reports {
  @post
  create(
    @header x_user_id: string,
    @body body: CreateReportRequest,
  ): CreateReportResponse | Error;
}

// ============================================
// Admin
// ============================================

model UpdateReportStatusRequest {
  status: string;
}

model CreateBanRequest {
  user_id: string;
  reason: string;
  expires_at?: string;
}

model Ban {
  id: int32;
  user_id: string;
  reason: string;
  banned_at: string;
  expires_at?: string;
}

model BanListResponse {
  bans: Ban[];
}

@route("/api/admin")
@useAuth(BasicAuth)
interface Admin {
  @get
  @route("/reports")
  listReports(): ReportListResponse | Error;

  @put
  @route("/reports/{report_id}")
  updateReportStatus(
    @path report_id: int32,
    @body body: UpdateReportStatusRequest,
  ): SuccessResponse | Error;

  @get
  @route("/bans")
  listBans(): BanListResponse | Error;

  @post
  @route("/bans")
  createBan(@body body: CreateBanRequest): SuccessResponse | Error;

  @delete
  @route("/bans/{user_id}")
  deleteBan(@path user_id: string): SuccessResponse | Error;
}

// ============================================
// Ban Check
// ============================================

model BanStatusResponse {
  is_banned: boolean;
  reason?: string;
  expires_at?: string;
}

@route("/api/bans")
interface Bans {
  @get
  @route("/check/{user_id}")
  checkBanStatus(@path user_id: string): BanStatusResponse | Error;
}
