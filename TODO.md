# WatchRoom 実装TODO

## 進捗サマリー

| Phase | 状態 | 説明 |
|-------|------|------|
| Phase 0 | ✅ 完了 | プロジェクト初期化 |
| Phase 1 | ✅ 完了 | MVP基盤 |
| Phase 2 | ✅ 完了 | コア機能 |
| Phase 3 | ✅ 完了 | 管理・品質向上 |
| Phase 4 | ✅ 完了 | MSW・テスト・本番環境 |
| Phase 5 | ✅ 完了 | 外部サービス統合・API接続 |

---

## Phase 5: 外部サービス統合・API接続 ✅ 完了

### 5.1 YouTube 統合 ✅ 完了

#### 5.1.1 YouTube Data API 設定
- [x] `.env` に `YOUTUBE_API_KEY` 追加（既存）
- [x] `internal/config/config.go` で API キー読み込み（既存）

#### 5.1.2 動画検索 API 実装
- [x] `internal/service/youtube_service.go` 作成
- [x] YouTube Data API v3 呼び出し実装
- [x] ページネーション対応

#### 5.1.3 動画メタデータ取得 API 実装
- [x] `GetVideo` メソッド実装
- [x] 動画時間取得対応

#### 5.1.4 YouTube IFrame Player 統合
- [x] `RoomPage.tsx` で `useVideoSync` フック使用
- [x] YouTube IFrame API 読み込み
- [x] `PlayerControls` とプレイヤー接続

### 5.2 チャット・リアクション接続 ✅ 完了

#### 5.2.1 RoomPage で useRoom フック活用
- [x] `RoomPage.tsx` で `useRoom` から `sendChatMessage`, `sendReaction` を取得
- [x] `handleSendChatMessage` 実装
- [x] `handleSendReaction` 実装

#### 5.2.2 SkyWay 接続の統合
- [x] `RoomPage` で `useSkyWay` を `useRoom` 経由で使用
- [x] メッセージ送受信の動作確認

### 5.3 ルーム管理 API 接続 ✅ 完了

#### 5.3.1 ルーム作成 API 呼び出し
- [x] `CreateRoomDialog.tsx` で `POST /api/rooms` 呼び出し
- [x] 作成後のルーム ID でナビゲート

#### 5.3.2 パスワード検証 API 接続
- [x] バックエンドでパスワードハッシュ検証実装

### 5.4 データベース接続確認 ✅ 完了

#### 5.4.1 Docker Compose で MySQL 起動確認
- [x] `docker compose up mysql`
- [x] スキーマ適用確認 (`db/init/schema.sql`)

#### 5.4.2 Go バックエンドの DB 接続
- [x] `internal/repository` の実装確認
- [x] CRUD 操作テスト

#### 5.4.3 API エンドポイントの動作確認
- [x] 実 API テスト
- [x] フロントエンド → バックエンド → DB の疎通確認

### 5.5 画像アップロード ✅ 完了

#### 5.5.1 Cloudflare R2 設定
- [x] `.env` に R2 認証情報追加
- [x] `internal/config/config.go` で読み込み

#### 5.5.2 Presigned URL 生成 API
- [x] `internal/service/upload_service.go` 実装
- [x] `internal/adapter/upload_handler.go` 実装
- [x] S3 互換 SDK で署名付き URL 生成

### 5.6 管理者機能完成 ✅ 完了

#### 5.6.1 通報 API 接続
- [x] `POST /api/reports` のバックエンド実装
- [x] `GET /api/admin/reports` のバックエンド実装
- [x] DB への永続化

#### 5.6.2 BAN 機能実装
- [x] `POST /api/admin/bans` のバックエンド実装
- [x] BAN チェックミドルウェア
- [x] フロントエンド管理画面をBasic Auth対応

---

## 未実装機能詳細

### MSW モックエンドポイント一覧

| エンドポイント | メソッド | バックエンド実装 | 備考 |
|---------------|---------|-----------------|------|
| `/api/auth/token` | POST | ✅ 実装済み | SkyWay トークン生成 |
| `/api/rooms` | GET | ✅ 実装済み | ルーム一覧取得 |
| `/api/rooms` | POST | ✅ 実装済み | ルーム作成 |
| `/api/rooms/:roomId` | GET | ❌ 未実装 | ルーム詳細取得 |
| `/api/rooms/:roomId/verify-password` | POST | ✅ 実装済み | パスワード検証 |
| `/api/rooms/:roomId/password` | PUT | ✅ 実装済み | パスワード設定 |
| `/api/rooms/:roomId/password` | DELETE | ✅ 実装済み | パスワード削除 |
| `/api/r/:shortId` | GET | ✅ 実装済み | 短縮URL解決 |
| `/api/youtube/search` | GET | ✅ 実装済み | 動画検索 |
| `/api/youtube/videos/:videoId` | GET | ✅ 実装済み | 動画詳細 |
| `/api/reports` | POST | ✅ 実装済み | 通報送信 |
| `/api/uploads/presign` | POST | ✅ 実装済み | 署名付きURL |
| `/api/bans/check/:userId` | GET | ✅ 実装済み | BAN確認 |
| `/api/admin/reports` | GET | ✅ 実装済み | 通報一覧 |
| `/api/admin/reports/:reportId` | PATCH | ✅ 実装済み | 通報処理 |
| `/api/admin/bans` | GET | ✅ 実装済み | BAN一覧 |
| `/api/admin/bans` | POST | ✅ 実装済み | BAN追加 |
| `/api/admin/bans/:banId` | DELETE | ✅ 実装済み | BAN解除 |

### フロントエンドの TODO コメント箇所

| ファイル | 行 | 内容 | 状態 |
|----------|-----|------|------|
| ~~`web/src/pages/RoomPage.tsx`~~ | ~~157~~ | ~~`// TODO: Implement with SkyWay` (チャット)~~ | ✅ 実装済み |
| ~~`web/src/pages/RoomPage.tsx`~~ | ~~162~~ | ~~`// TODO: Implement with SkyWay` (リアクション)~~ | ✅ 実装済み |
| ~~`web/src/components/player/VideoSearch.tsx`~~ | ~~42~~ | ~~`// TODO: Replace with actual API call`~~ | ✅ 実装済み |
| ~~`web/src/components/room/RoomList.tsx`~~ | ~~5~~ | ~~`// TODO: Replace with actual API call`~~ | ✅ 実装済み |
| ~~`web/src/components/room/CreateRoomDialog.tsx`~~ | ~~26~~ | ~~`// TODO: Call API to create room`~~ | ✅ 実装済み |
| ~~`web/src/hooks/useSkyWay.ts`~~ | ~~188~~ | ~~`// TODO: Implement proper permission system`~~ | ✅ 実装済み |

### バックエンドの TODO コメント箇所

| ファイル | 行 | 内容 |
|----------|-----|------|
| `internal/adapter/youtube_handler.go` | 35 | `// TODO: Implement YouTube Data API call` |
| `internal/adapter/youtube_handler.go` | 62 | `// TODO: Implement YouTube Data API call` |

---

## 実装優先度マトリクス

| 優先度 | 機能 | 理由 | 工数目安 |
|--------|------|------|---------|
| 🔴 Critical | YouTube Player 統合 | MVP の核心機能 | 1日 |
| 🔴 Critical | チャット接続 | 同時視聴体験に必須 | 0.5日 |
| 🟠 High | ルーム作成 API | ユーザーがルームを作れない | 0.5日 |
| 🟠 High | DB 接続確認 | 永続化に必須 | 0.5日 |
| 🟡 Medium | 画像アップロード | UX 向上 | 1日 |
| 🟢 Low | 管理者機能完成 | 運用フェーズで必要 | 1日 |

---

## 完了済み Phase (参考)

<details>
<summary>Phase 0-4 (クリックで展開)</summary>

### Phase 0: プロジェクト初期化 ✅

- [x] `go.mod` - Goモジュール初期化
- [x] `.env.example` - 環境変数テンプレート
- [x] `.gitignore` - Git除外設定
- [x] `Taskfile.yml` - タスクランナー定義
- [x] `docker-compose.yml` - ローカル開発環境
- [x] Docker設定ファイル

### Phase 1: MVP基盤 ✅

- [x] TypeSpec API定義
- [x] sqlc設定・スキーマ
- [x] ogen設定
- [x] orval設定
- [x] バックエンド基盤 (config, middleware, handlers)
- [x] SkyWay Token生成
- [x] フロントエンド基盤 (Vite, TypeScript, Tailwind)
- [x] 状態管理 (Zustand stores)
- [x] SkyWay接続フック
- [x] チャット基盤

### Phase 2: コア機能 ✅

- [x] パスワード保護UI
- [x] 権限管理UI
- [x] リアクション機能
- [x] 再生履歴機能
- [x] シェアURL機能

### Phase 3: 管理・品質向上 ✅

- [x] 通報ダイアログ
- [x] 管理者ダッシュボードUI
- [x] キック/BAN UI
- [x] ダークモード
- [x] レスポンシブ対応
- [x] 画像アップロードUI

### Phase 4: MSW・テスト・本番環境 ✅

- [x] MSW設定
- [x] Vitest設定・テスト
- [x] 本番用Docker設定
- [x] GitHub Actions CI/CD

</details>

---

## 更新履歴

- 2025-12-26: Phase 5 追加、完了済み Phase をまとめ
- 2025-12-25: Phase 0-4 実装完了
