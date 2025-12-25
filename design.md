# WatchRoom - 設計書

## 1. システム概要

### 1.1 アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                                │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  React 19 + Vite + shadcn/ui + Tailwind CSS v4                          │ │
│ │  - orval生成 API Client (React Query)                                   │ │
│ │  - SkyWay SDK (@skyway-sdk/room, @skyway-sdk/token)                     │ │
│ │  - YouTube IFrame Player API                                             │ │
│ └───────────────────────┬─────────────────────────────────────────────────┘ │
└─────────────────────────┼───────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌────────────┐   ┌───────────┐
    │ REST API │   │  SkyWay    │   │ YouTube   │
    │ (Go)     │   │  Cloud     │   │ IFrame    │
    │ :8080    │   │  (P2P)     │   │ Player    │
    └────┬─────┘   └────────────┘   └───────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend (Go 1.25+)                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  ogen生成 HTTP Server                                                    │ │
│ │  - SkyWay Auth Token 生成                                                │ │
│ │  - Room Password 管理                                                    │ │
│ │  - Short URL 管理                                                        │ │
│ │  - YouTube Data API Proxy                                                │ │
│ │  - Cloudflare R2 Image Upload                                            │ │
│ │  - 管理者機能 (通報/BAN)                                                 │ │
│ └───────────────────────┬─────────────────────────────────────────────────┘ │
└─────────────────────────┼───────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌────────────┐   ┌───────────┐
    │  MySQL   │   │ Cloudflare │   │ YouTube   │
    │  8.4     │   │    R2      │   │ Data API  │
    └──────────┘   └────────────┘   └───────────┘
```

### 1.2 リアルタイム通信アーキテクチャ (SkyWay)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SkyWay P2P Room                                   │
│                                                                              │
│   ┌─────────┐     DataStream      ┌─────────┐                               │
│   │ Member  │◄───────────────────►│ Member  │                               │
│   │   A     │      (JSON)         │   B     │                               │
│   └─────────┘                     └─────────┘                               │
│       ▲                               ▲                                      │
│       │         DataStream            │                                      │
│       └───────────────┬───────────────┘                                      │
│                       │                                                      │
│                       ▼                                                      │
│                 ┌─────────┐                                                  │
│                 │ Member  │                                                  │
│                 │   C     │                                                  │
│                 └─────────┘                                                  │
│                                                                              │
│   Room Metadata:                    Member Metadata:                         │
│   - name: string                    - id: string                             │
│   - creatorId: string               - name: string                           │
│   - hasPassword: boolean            - iconUrl: string                        │
│   - currentVideo: VideoInfo         - isCreator: boolean                     │
│   - playbackState: PlaybackState                                             │
│   - permissionMode: PermissionMode                                           │
│   - playHistory: VideoInfo[]                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

DataStream メッセージ種別:
┌──────────────────┬────────────────────────────────────────────────────────┐
│ type: 'sync'     │ 動画同期 (play/pause/seek/rate/video)                  │
│ type: 'chat'     │ チャットメッセージ                                      │
│ type: 'reaction' │ 絵文字リアクション                                      │
│ type: 'permission'│ 権限変更通知                                           │
│ type: 'moderation'│ キック/BAN通知                                         │
└──────────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. ディレクトリ構成

```
youtube-friend-watch/
├── cmd/                                    # アプリケーションエントリーポイント
│   └── api-server/
│       ├── main.go                        # HTTPサーバーエントリーポイント
│       ├── air.toml                       # ホットリロード設定
│       └── openapi/                       # ogen生成コード (自動生成)
│           ├── oas_cfg_gen.go
│           ├── oas_client_gen.go
│           ├── oas_handlers_gen.go
│           ├── oas_json_gen.go
│           ├── oas_router_gen.go
│           ├── oas_schemas_gen.go
│           ├── oas_server_gen.go
│           ├── oas_unimplemented_gen.go
│           └── oas_validators_gen.go
│
├── internal/                              # 内部パッケージ
│   ├── adapter/                           # HTTPハンドラー実装
│   │   ├── handler.go                    # Handler インターフェース実装
│   │   ├── auth_handler.go               # 認証ハンドラー
│   │   ├── room_handler.go               # 部屋ハンドラー
│   │   ├── upload_handler.go             # アップロードハンドラー
│   │   ├── youtube_handler.go            # YouTube検索ハンドラー
│   │   ├── report_handler.go             # 通報ハンドラー
│   │   └── admin_handler.go              # 管理者ハンドラー
│   │
│   ├── usecase/                           # ビジネスロジック
│   │   ├── auth_usecase.go               # SkyWay Token生成
│   │   ├── room_usecase.go               # 部屋管理ロジック
│   │   ├── upload_usecase.go             # 画像アップロード
│   │   ├── youtube_usecase.go            # YouTube検索
│   │   ├── report_usecase.go             # 通報処理
│   │   └── ban_usecase.go                # BAN管理
│   │
│   ├── repository/                        # データアクセス層
│   │   ├── room_repository.go            # 部屋DB操作
│   │   ├── shorturl_repository.go        # 短縮URL操作
│   │   ├── report_repository.go          # 通報DB操作
│   │   ├── ban_repository.go             # BAN DB操作
│   │   └── r2_repository.go              # Cloudflare R2操作
│   │
│   ├── model/                             # ドメインモデル
│   │   ├── room.go                       # Room, RoomPassword
│   │   ├── shorturl.go                   # ShortURL
│   │   ├── report.go                     # Report
│   │   ├── ban.go                        # GlobalBan
│   │   └── youtube.go                    # YouTubeVideo
│   │
│   ├── service/                           # 外部サービス連携
│   │   ├── skyway_service.go             # SkyWay Token生成
│   │   ├── youtube_service.go            # YouTube Data API
│   │   └── r2_service.go                 # Cloudflare R2
│   │
│   ├── middleware/                        # HTTPミドルウェア
│   │   ├── cors.go                       # CORS設定
│   │   ├── auth.go                       # 管理者認証
│   │   └── logging.go                    # リクエストログ
│   │
│   └── config/                            # 設定
│       └── config.go                     # 環境変数読み込み
│
├── db/                                    # データベース関連
│   ├── generated_sql/                    # sqlc生成コード (自動生成)
│   │   ├── db.go
│   │   ├── models.go
│   │   └── query.sql.go
│   ├── init/
│   │   ├── schema.sql                    # スキーマ定義
│   │   └── seed.sql                      # 初期データ
│   ├── queries/
│   │   └── query.sql                     # SQLクエリ定義
│   └── sqlc.yml                          # sqlc設定
│
├── typespec/                              # API仕様定義
│   ├── main.tsp                          # TypeSpec定義
│   ├── package.json                      # TypeSpec依存関係
│   ├── tspconfig.yaml                    # TypeSpec設定
│   └── tsp-output/                       # 生成OpenAPI (自動生成)
│       └── @typespec/openapi3/
│           └── openapi.yaml
│
├── web/                                   # フロントエンド
│   ├── src/
│   │   ├── main.tsx                      # エントリーポイント
│   │   ├── App.tsx                       # ルートコンポーネント
│   │   │
│   │   ├── generated-client/             # orval生成 (自動生成)
│   │   │   ├── watchRoomApi.ts          # API関数 + React Query hooks
│   │   │   └── watchRoomApi.schemas.ts  # 型定義
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                       # shadcn/ui コンポーネント
│   │   │   ├── room/                     # 部屋関連
│   │   │   ├── player/                   # 動画プレイヤー
│   │   │   ├── chat/                     # チャット関連
│   │   │   ├── user/                     # ユーザー関連
│   │   │   ├── admin/                    # 管理者関連
│   │   │   └── common/                   # 共通
│   │   │
│   │   ├── hooks/                        # カスタムフック
│   │   │   ├── useSkyWay.ts             # SkyWay接続管理
│   │   │   ├── useRoom.ts               # 部屋状態管理
│   │   │   ├── useVideoSync.ts          # 動画同期ロジック
│   │   │   ├── useChat.ts               # チャットロジック
│   │   │   ├── useReaction.ts           # リアクションロジック
│   │   │   ├── usePermission.ts         # 権限管理
│   │   │   ├── useLocalStorage.ts       # localStorage操作
│   │   │   └── useTheme.ts              # テーマ管理
│   │   │
│   │   ├── lib/                          # ユーティリティ
│   │   │   ├── skyway.ts                # SkyWay初期化・ヘルパー
│   │   │   ├── youtube.ts               # YouTube Player API
│   │   │   ├── api.ts                   # Axios設定
│   │   │   ├── storage.ts               # localStorage操作
│   │   │   └── utils.ts                 # 汎用ユーティリティ
│   │   │
│   │   ├── stores/                       # 状態管理 (zustand)
│   │   │   ├── userStore.ts             # ユーザー状態
│   │   │   ├── roomStore.ts             # 部屋状態
│   │   │   └── uiStore.ts               # UI状態
│   │   │
│   │   ├── pages/                        # ページコンポーネント
│   │   │   ├── HomePage.tsx             # 部屋一覧 (トップ)
│   │   │   ├── RoomPage.tsx             # 部屋画面
│   │   │   ├── AdminPage.tsx            # 管理者ダッシュボード
│   │   │   └── NotFoundPage.tsx         # 404
│   │   │
│   │   ├── types/                        # 型定義
│   │   │   ├── skyway.ts                # SkyWay関連型
│   │   │   ├── room.ts                  # 部屋関連型
│   │   │   ├── message.ts               # DataStreamメッセージ型
│   │   │   └── youtube.ts               # YouTube関連型
│   │   │
│   │   └── styles/
│   │       └── globals.css              # グローバルスタイル
│   │
│   ├── mocks/                            # MSW モック
│   │   ├── browser.ts                   # ブラウザ用セットアップ
│   │   ├── handlers.ts                  # APIハンドラー定義
│   │   └── fixtures/                    # テストデータ
│   │       ├── rooms.ts
│   │       ├── users.ts
│   │       └── videos.ts
│   │
│   ├── public/
│   │   └── mockServiceWorker.js         # MSW Service Worker
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── orval.config.ts                  # orval設定
│   ├── tailwind.config.js
│   └── components.json                  # shadcn/ui設定
│
├── docker/
│   ├── local/
│   │   ├── api-server.local.Dockerfile  # 開発用 (Air)
│   │   └── web.local.Dockerfile         # 開発用 (Vite)
│   └── production/
│       ├── api-server.Dockerfile        # 本番用
│       └── web.Dockerfile               # 本番用 (Nginx)
│
├── docker-compose.yml                    # ローカル開発環境
├── docker-compose.prod.yml              # 本番環境
├── Taskfile.yml                          # タスク定義
├── go.mod
├── go.sum
├── requirements.md                       # 要件定義書
└── design.md                             # 設計書 (本ファイル)
```

---

## 3. データベース設計

### 3.1 ER図

```
┌─────────────────────────┐
│      room_passwords     │
├─────────────────────────┤
│ id           INT PK     │
│ room_id      VARCHAR UK │──┐
│ password_hash VARCHAR   │  │
│ created_at   TIMESTAMP  │  │
│ updated_at   TIMESTAMP  │  │
└─────────────────────────┘  │
                             │
┌─────────────────────────┐  │  ┌─────────────────────────┐
│      short_urls         │  │  │       reports           │
├─────────────────────────┤  │  ├─────────────────────────┤
│ id           INT PK     │  │  │ id           INT PK     │
│ short_id     VARCHAR UK │  │  │ room_id      VARCHAR    │──┘
│ room_id      VARCHAR    │──┘  │ reporter_id  VARCHAR    │
│ created_at   TIMESTAMP  │     │ target_id    VARCHAR    │
└─────────────────────────┘     │ message_text TEXT       │
                                │ reason       VARCHAR    │
┌─────────────────────────┐     │ status       VARCHAR    │
│      global_bans        │     │ created_at   TIMESTAMP  │
├─────────────────────────┤     │ updated_at   TIMESTAMP  │
│ id           INT PK     │     └─────────────────────────┘
│ user_id      VARCHAR UK │
│ reason       TEXT       │
│ banned_at    TIMESTAMP  │
│ expires_at   TIMESTAMP  │ (NULL = 永久)
│ created_at   TIMESTAMP  │
└─────────────────────────┘
```

### 3.2 スキーマ定義 (`db/init/schema.sql`)

```sql
-- 部屋パスワード管理
CREATE TABLE room_passwords (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    room_id       VARCHAR(255) NOT NULL UNIQUE COMMENT 'SkyWay Room ID',
    password_hash VARCHAR(255) NOT NULL COMMENT 'bcryptハッシュ',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 短縮URL管理
CREATE TABLE short_urls (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    short_id   VARCHAR(8) NOT NULL UNIQUE COMMENT '6-8文字の英数字',
    room_id    VARCHAR(255) NOT NULL COMMENT 'SkyWay Room ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_short_id (short_id),
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通報管理
CREATE TABLE reports (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    room_id      VARCHAR(255) NOT NULL COMMENT 'SkyWay Room ID',
    reporter_id  VARCHAR(255) NOT NULL COMMENT '通報者のユーザーID',
    target_id    VARCHAR(255) NOT NULL COMMENT '対象者のユーザーID',
    message_text TEXT NOT NULL COMMENT '通報対象メッセージ',
    reason       VARCHAR(255) NOT NULL COMMENT '通報理由',
    status       VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending/reviewed/resolved',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 全体BAN管理
CREATE TABLE global_bans (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    user_id    VARCHAR(255) NOT NULL UNIQUE COMMENT 'ユーザーID (localStorage UUID)',
    reason     TEXT NOT NULL COMMENT 'BAN理由',
    banned_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL COMMENT 'NULL = 永久BAN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 sqlc設定 (`db/sqlc.yml`)

```yaml
version: "2"
sql:
  - engine: "mysql"
    queries: "queries/"
    schema: "init/schema.sql"
    gen:
      go:
        package: "generated_sql"
        out: "generated_sql"
        emit_json_tags: true
        emit_db_tags: true
```

### 3.4 SQLクエリ定義 (`db/queries/query.sql`)

```sql
-- Room Passwords
-- name: CreateRoomPassword :execresult
INSERT INTO room_passwords (room_id, password_hash) VALUES (?, ?);

-- name: GetRoomPassword :one
SELECT id, room_id, password_hash, created_at, updated_at
FROM room_passwords WHERE room_id = ?;

-- name: UpdateRoomPassword :exec
UPDATE room_passwords SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?;

-- name: DeleteRoomPassword :exec
DELETE FROM room_passwords WHERE room_id = ?;

-- name: HasPassword :one
SELECT EXISTS(SELECT 1 FROM room_passwords WHERE room_id = ?) as has_password;

-- Short URLs
-- name: CreateShortURL :execresult
INSERT INTO short_urls (short_id, room_id) VALUES (?, ?);

-- name: GetShortURL :one
SELECT id, short_id, room_id, created_at FROM short_urls WHERE short_id = ?;

-- name: GetShortURLByRoomID :one
SELECT id, short_id, room_id, created_at FROM short_urls WHERE room_id = ?;

-- name: DeleteShortURLByRoomID :exec
DELETE FROM short_urls WHERE room_id = ?;

-- Reports
-- name: CreateReport :execresult
INSERT INTO reports (room_id, reporter_id, target_id, message_text, reason, status)
VALUES (?, ?, ?, ?, ?, 'pending');

-- name: GetReport :one
SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
FROM reports WHERE id = ?;

-- name: ListReports :many
SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- name: ListPendingReports :many
SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
FROM reports WHERE status = 'pending' ORDER BY created_at DESC;

-- name: UpdateReportStatus :exec
UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;

-- Global Bans
-- name: CreateGlobalBan :execresult
INSERT INTO global_bans (user_id, reason, expires_at) VALUES (?, ?, ?);

-- name: GetGlobalBan :one
SELECT id, user_id, reason, banned_at, expires_at, created_at
FROM global_bans WHERE user_id = ?;

-- name: ListGlobalBans :many
SELECT id, user_id, reason, banned_at, expires_at, created_at
FROM global_bans ORDER BY banned_at DESC;

-- name: IsUserBanned :one
SELECT EXISTS(
    SELECT 1 FROM global_bans
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
) as is_banned;

-- name: DeleteGlobalBan :exec
DELETE FROM global_bans WHERE user_id = ?;

-- name: DeleteExpiredBans :exec
DELETE FROM global_bans WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP;
```

---

## 4. API設計 (TypeSpec)

### 4.1 TypeSpec定義 (`typespec/main.tsp`)

```typespec
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
  @post @route("/token")
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
  @get list(@query include_locked?: boolean): RoomListResponse | Error;
  @post create(@body body: CreateRoomRequest): CreateRoomResponse | Error;
  @post @route("/{room_id}/verify-password")
  verifyPassword(@path room_id: string, @body body: VerifyPasswordRequest): VerifyPasswordResponse | Error;
  @put @route("/{room_id}/password")
  changePassword(@path room_id: string, @body body: ChangePasswordRequest): SuccessResponse | Error;
  @delete @route("/{room_id}/password")
  deletePassword(@path room_id: string, @body body: VerifyPasswordRequest): SuccessResponse | Error;
  @delete @route("/{room_id}")
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
  @get @route("/{short_id}")
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
  @post @route("/icon")
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
  @get @route("/search")
  search(@query q: string, @query max_results?: int32, @query page_token?: string): YouTubeSearchResponse | Error;
  @get @route("/videos/{video_id}")
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
  @post create(@header x_user_id: string, @body body: CreateReportRequest): CreateReportResponse | Error;
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
  @get @route("/reports") listReports(): ReportListResponse | Error;
  @put @route("/reports/{report_id}")
  updateReportStatus(@path report_id: int32, @body body: UpdateReportStatusRequest): SuccessResponse | Error;
  @get @route("/bans") listBans(): BanListResponse | Error;
  @post @route("/bans") createBan(@body body: CreateBanRequest): SuccessResponse | Error;
  @delete @route("/bans/{user_id}") deleteBan(@path user_id: string): SuccessResponse | Error;
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
  @get @route("/check/{user_id}")
  checkBanStatus(@path user_id: string): BanStatusResponse | Error;
}
```

### 4.2 TypeSpec 設定 (`typespec/tspconfig.yaml`)

```yaml
emit:
  - "@typespec/openapi3"
options:
  "@typespec/openapi3":
    emitter-output-dir: "{project-root}/tsp-output"
```

### 4.3 TypeSpec package.json (`typespec/package.json`)

```json
{
  "name": "watchroom-typespec",
  "private": true,
  "dependencies": {
    "@typespec/compiler": "^0.62.0",
    "@typespec/http": "^0.62.0",
    "@typespec/rest": "^0.62.0",
    "@typespec/openapi": "^0.62.0",
    "@typespec/openapi3": "^0.62.0"
  },
  "scripts": {
    "compile": "tsp compile main.tsp"
  }
}
```

---

## 5. コード生成フロー

### 5.1 全体フロー図

```
┌───────────────────┐
│  typespec/        │
│  main.tsp         │
└─────────┬─────────┘
          │ task tsp
          ▼
┌───────────────────────────────┐
│  typespec/tsp-output/         │
│  openapi.yaml                 │
└─────────┬─────────────────────┘
          │
  ┌───────┴───────┐
  │               │
  ▼               ▼
task ogen    task openapi-client
  │               │
  ▼               ▼
┌──────────────────┐ ┌──────────────────────────┐
│ cmd/api-server/  │ │ web/src/generated-client/│
│ openapi/         │ │ watchRoomApi.ts          │
│ (Go Server)      │ │ (TypeScript Client)      │
└──────────────────┘ └──────────────────────────┘

┌───────────────────┐
│  db/queries/      │
│  query.sql        │
└─────────┬─────────┘
          │ task sqlc
          ▼
┌───────────────────┐
│  db/generated_sql/│
│  (Go DB Code)     │
└───────────────────┘
```

### 5.2 ogen生成コマンド (`cmd/api-server/main.go`)

```go
package main

//go:generate go run github.com/ogen-go/ogen/cmd/ogen@latest \
//    --target ./openapi \
//    --package openapi \
//    --clean \
//    ../../typespec/tsp-output/@typespec/openapi3/openapi.yaml

func main() {
    // サーバー起動
}
```

### 5.3 orval設定 (`web/orval.config.ts`)

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  watchroom: {
    input: '../typespec/tsp-output/@typespec/openapi3/openapi.yaml',
    output: {
      target: './src/generated-client/watchRoomApi.ts',
      schemas: './src/generated-client/watchRoomApi.schemas.ts',
      client: 'react-query',
      mode: 'split',
      override: {
        mutator: {
          path: './src/lib/api.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
```

---

## 6. MSW (Mock Service Worker) 設計

### 6.1 セットアップ (`web/mocks/browser.ts`)

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### 6.2 開発環境での初期化 (`web/src/main.tsx`)

```typescript
async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('../mocks/browser');
    return worker.start({ onUnhandledRequest: 'bypass' });
  }
  return Promise.resolve();
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
```

### 6.3 ハンドラー定義 (`web/mocks/handlers.ts`)

```typescript
import { http, HttpResponse, delay } from 'msw';

const API_BASE = 'http://localhost:8080/api';

export const handlers = [
  http.post(`${API_BASE}/auth/token`, async ({ request }) => {
    await delay(100);
    const body = await request.json();
    return HttpResponse.json({
      token: `mock-skyway-token-${body.user_id}`,
      expires_at: Date.now() + 24 * 60 * 60 * 1000,
    });
  }),

  http.get(`${API_BASE}/rooms`, async ({ request }) => {
    await delay(200);
    return HttpResponse.json({ rooms: mockRooms, total: mockRooms.length });
  }),

  http.get(`${API_BASE}/youtube/search`, async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    return HttpResponse.json({
      items: generateMockYouTubeResults(query),
      next_page_token: 'mock-token',
    });
  }),
];
```

---

## 7. Docker Compose 設計

### 7.1 ローカル開発環境 (`docker-compose.yml`)

```yaml
services:
  mysql:
    image: mysql:8.4
    container_name: watchroom-mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-watchroom}
      MYSQL_USER: ${MYSQL_USER:-watchroom}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-watchroom}
      TZ: Asia/Tokyo
    volumes:
      - mysql_data:/var/lib/mysql
      - ./db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - watchroom-network

  api-server:
    build:
      context: .
      dockerfile: docker/local/api-server.local.Dockerfile
    container_name: watchroom-api
    ports:
      - "8080:8080"
    environment:
      MYSQL_HOST: mysql
      MYSQL_PORT: 3306
      MYSQL_DATABASE: ${MYSQL_DATABASE:-watchroom}
      MYSQL_USER: ${MYSQL_USER:-watchroom}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-watchroom}
      SKYWAY_APP_ID: ${SKYWAY_APP_ID}
      SKYWAY_SECRET_KEY: ${SKYWAY_SECRET_KEY}
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET_NAME: ${R2_BUCKET_NAME}
      R2_PUBLIC_URL: ${R2_PUBLIC_URL}
      ADMIN_USERNAME: ${ADMIN_USERNAME:-admin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-admin123}
    volumes:
      - .:/app
      - /app/tmp
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - watchroom-network

  web:
    build:
      context: .
      dockerfile: docker/local/web.local.Dockerfile
    container_name: watchroom-web
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://localhost:8080
      VITE_ENABLE_MSW: ${VITE_ENABLE_MSW:-false}
    volumes:
      - ./web:/app
      - /app/node_modules
    networks:
      - watchroom-network

volumes:
  mysql_data:

networks:
  watchroom-network:
    driver: bridge
```

### 7.2 開発用Dockerfile (`docker/local/api-server.local.Dockerfile`)

```dockerfile
FROM golang:1.25-alpine

RUN apk add --no-cache git gcc musl-dev
RUN go install github.com/air-verse/air@latest

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY . .

EXPOSE 8080

CMD ["air", "-c", "./cmd/api-server/air.toml"]
```

### 7.3 フロントエンド開発用Dockerfile (`docker/local/web.local.Dockerfile`)

```dockerfile
FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install

COPY web/ .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
```

---

## 8. Taskfile 設計

### 8.1 Taskfile定義 (`Taskfile.yml`)

```yaml
version: '3'

vars:
  TYPESPEC_DIR: ./typespec
  WEB_DIR: ./web
  DB_DIR: ./db

tasks:
  # Code Generation
  tsp:
    desc: TypeSpecをコンパイル
    dir: "{{.TYPESPEC_DIR}}"
    cmds:
      - pnpm install
      - pnpm run compile

  ogen:
    desc: ogenでGoサーバーコードを生成
    deps: [tsp]
    cmds:
      - go generate ./cmd/api-server/main.go

  sqlc:
    desc: sqlcでGoデータベースコードを生成
    dir: "{{.DB_DIR}}"
    cmds:
      - sqlc generate

  openapi-client:
    desc: orvalでTypeScriptクライアントを生成
    dir: "{{.WEB_DIR}}"
    deps: [tsp]
    cmds:
      - pnpm install
      - pnpm run generate-client

  msw:
    desc: MSW Service Workerを生成
    dir: "{{.WEB_DIR}}"
    cmds:
      - pnpm msw init public --save

  generate:
    desc: すべてのコード生成を実行
    deps: [tsp]
    cmds:
      - task: ogen
      - task: sqlc
      - task: openapi-client

  # Development
  dev:
    desc: 開発環境を起動
    cmds:
      - docker compose up -d
      - docker compose logs -f

  dev:msw:
    desc: MSWモック有効でフロントエンドを起動
    dir: "{{.WEB_DIR}}"
    env:
      VITE_ENABLE_MSW: "true"
    cmds:
      - pnpm dev

  # Infrastructure
  up:
    desc: Docker Composeで起動
    cmds:
      - docker compose up -d

  down:
    desc: Docker Composeで停止
    cmds:
      - docker compose down

  reset:
    desc: Docker Composeをリセット
    cmds:
      - docker compose down -v
      - docker compose up -d --build

  logs:
    desc: ログを表示
    cmds:
      - docker compose logs -f --tail=100

  # Database
  db:shell:
    desc: MySQLシェルに接続
    cmds:
      - docker compose exec mysql mysql -uwatchroom -pwatchroom watchroom

  db:reset:
    desc: データベースをリセット
    cmds:
      - docker compose exec -T mysql mysql -uroot -prootpassword -e "DROP DATABASE IF EXISTS watchroom; CREATE DATABASE watchroom;"
      - docker compose exec -T mysql mysql -uwatchroom -pwatchroom watchroom < db/init/schema.sql

  # Code Quality
  fmt:
    desc: Goコードをフォーマット
    cmds:
      - go fmt ./...

  lint:
    desc: Goコードをリント
    cmds:
      - golangci-lint run ./...

  test:
    desc: テストを実行
    cmds:
      - go test -v ./...

  # Build
  build:
    desc: 本番用ビルド
    cmds:
      - docker compose -f docker-compose.prod.yml build

  # Utilities
  clean:
    desc: 生成ファイルを削除
    cmds:
      - rm -rf ./cmd/api-server/openapi
      - rm -rf ./db/generated_sql
      - rm -rf ./typespec/tsp-output
      - rm -rf ./web/src/generated-client

  install:tools:
    desc: 開発ツールをインストール
    cmds:
      - go install github.com/air-verse/air@latest
      - go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
      - go install github.com/ogen-go/ogen/cmd/ogen@latest
      - go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

---

## 9. SkyWay 実装設計

### 9.1 SkyWay Auth Token生成 (`internal/service/skyway_service.go`)

```go
package service

import (
    "time"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
)

type SkyWayService struct {
    appID     string
    secretKey string
}

func NewSkyWayService(appID, secretKey string) *SkyWayService {
    return &SkyWayService{appID: appID, secretKey: secretKey}
}

func (s *SkyWayService) GenerateToken(userID string, roomName *string) (string, int64, error) {
    now := time.Now()
    expiresAt := now.Add(24 * time.Hour)

    channelConfig := map[string]interface{}{
        "id": "*", "name": "*", "actions": []string{"write"},
        "members": []map[string]interface{}{{
            "id": "*", "name": "*", "actions": []string{"write"},
            "publication":  map[string]interface{}{"actions": []string{"write"}},
            "subscription": map[string]interface{}{"actions": []string{"write"}},
        }},
    }

    if roomName != nil {
        channelConfig["name"] = *roomName
    }

    claims := jwt.MapClaims{
        "jti": uuid.New().String(),
        "iat": now.Unix(),
        "exp": expiresAt.Unix(),
        "version": 3,
        "scope": map[string]interface{}{
            "app": map[string]interface{}{
                "id": s.appID, "turn": true, "actions": []string{"read"},
                "channels": []map[string]interface{}{channelConfig},
            },
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    signedToken, err := token.SignedString([]byte(s.secretKey))
    return signedToken, expiresAt.Unix(), err
}
```

### 9.2 フロントエンド SkyWay Hook (`web/src/hooks/useSkyWay.ts`)

```typescript
import { useCallback, useRef, useState } from 'react';
import { SkyWayContext, SkyWayRoom, LocalDataStream, P2PRoom } from '@skyway-sdk/room';
import { useAuthCreateToken } from '../generated-client/watchRoomApi';
import type { RoomMetadata, MemberMetadata, DataStreamMessage } from '../types/skyway';

export function useSkyWay(options: UseSkyWayOptions) {
  const { mutateAsync: createToken } = useAuthCreateToken();
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<P2PRoom | null>(null);
  const dataStreamRef = useRef<LocalDataStream | null>(null);

  const sendMessage = useCallback((message: DataStreamMessage) => {
    dataStreamRef.current?.write(JSON.stringify(message));
  }, []);

  const updateRoomMetadata = useCallback(async (metadata: Partial<RoomMetadata>) => {
    if (!room) return;
    const current = room.metadata ? JSON.parse(room.metadata) : {};
    await room.updateMetadata(JSON.stringify({ ...current, ...metadata }));
  }, [room]);

  return { isConnected, room, sendMessage, updateRoomMetadata };
}
```

---

## 10. フロントエンド型定義

### 10.1 SkyWay型定義 (`web/src/types/skyway.ts`)

```typescript
export interface RoomMetadata {
  name: string;
  creatorId: string;
  hasPassword: boolean;
  currentVideo: VideoInfo | null;
  playbackState: PlaybackState;
  permissionMode: 'creator' | 'specific' | 'all';
  allowedUserIds: string[];
  playHistory: VideoHistoryItem[];
}

export interface MemberMetadata {
  id: string;
  name: string;
  iconUrl: string;
  isCreator: boolean;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  lastUpdated: number;
}
```

### 10.2 メッセージ型定義 (`web/src/types/message.ts`)

```typescript
export interface SyncMessage {
  type: 'sync';
  action: 'play' | 'pause' | 'seek' | 'rate' | 'video';
  payload: { currentTime?: number; playbackRate?: number; videoId?: string };
  senderId: string;
  timestamp: number;
}

export interface ChatMessage {
  type: 'chat';
  payload: { messageId: string; text: string; senderName: string; senderIconUrl: string };
  senderId: string;
  timestamp: number;
}

export interface ReactionMessage {
  type: 'reaction';
  payload: { emoji: string };
  senderId: string;
  timestamp: number;
}

export type DataStreamMessage = SyncMessage | ChatMessage | ReactionMessage;
```

---

## 11. 環境変数

```bash
# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=watchroom
MYSQL_USER=watchroom
MYSQL_PASSWORD=watchroom

# SkyWay
SKYWAY_APP_ID=your-skyway-app-id
SKYWAY_SECRET_KEY=your-skyway-secret-key

# YouTube
YOUTUBE_API_KEY=your-youtube-api-key

# Cloudflare R2
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=watchroom-icons
R2_PUBLIC_URL=https://your-r2-public-url.com

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password

# Frontend
VITE_API_BASE_URL=http://localhost:8080
VITE_ENABLE_MSW=false
```

---

## 12. 開発フロー

```bash
# 初回セットアップ
git clone https://github.com/ponyo877/youtube-friend-watch.git
cd youtube-friend-watch
task install:tools
cp .env.example .env
task generate
task dev

# 日常開発
task dev          # 全サービス起動
task dev:msw      # MSWモックでフロントエンド
task logs         # ログ確認
task db:reset     # DBリセット

# コード生成
task generate     # 全生成
task tsp          # TypeSpec
task ogen         # Go Server
task sqlc         # Go DB
task openapi-client  # TS Client
```

---

## 13. 実装優先順位

### Phase 1: MVP
1. インフラ構築 (Docker Compose, MySQL, Taskfile)
2. コード生成パイプライン (TypeSpec, ogen, sqlc, orval)
3. バックエンド基盤 (SkyWay Token, パスワード, 短縮URL)
4. フロントエンド基盤 (SkyWay接続, YouTube再生, 動画同期)
5. 基本チャット

### Phase 2: コア機能
1. パスワード保護
2. 権限管理
3. リアクション
4. 再生履歴
5. シェアURL

### Phase 3: 管理・品質
1. 通報機能
2. 管理者ダッシュボード
3. キック/BAN
4. ダークモード/レスポンシブ
5. 画像アップロード

---

## 14. 命名規則

| 種類 | Go | TypeScript | DB |
|------|-----|------------|-----|
| 型 | PascalCase | PascalCase | - |
| 関数 | PascalCase | camelCase | - |
| 変数 | camelCase | camelCase | - |
| ファイル | snake_case | PascalCase/camelCase | - |
| テーブル | - | - | snake_case |

---

## 15. セキュリティ要件

- SkyWay Secret Key: バックエンドのみ
- パスワード: bcrypt (cost 12)
- 入力検証: XSS対策, MIMEタイプ検証
- 管理者認証: Basic認証 + HTTPS

---

## 16. パフォーマンス考慮

- SkyWay P2P: 4人上限
- YouTube API: 10,000単位/日 (キャッシュ推奨)
- フロントエンド: React Query キャッシュ, 30秒ポーリング

---

この設計書は requirements.md と prime-checker リポジトリを基に、TypeSpec + ogen + sqlc + orval + MSW + Docker Compose + Taskfile 構成で作成されました。
