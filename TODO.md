# WatchRoom 実装TODO

## Phase 0: プロジェクト初期化

### 0.1 基盤ファイル作成
- [ ] `go.mod` - Goモジュール初期化
- [ ] `go.sum` - 依存関係ロック
- [ ] `.env.example` - 環境変数テンプレート
- [ ] `.gitignore` - Git除外設定

### 0.2 Taskfile設定
- [ ] `Taskfile.yml` - タスクランナー定義

### 0.3 Docker環境
- [ ] `docker-compose.yml` - ローカル開発環境
- [ ] `docker/local/api-server.local.Dockerfile` - API開発用
- [ ] `docker/local/web.local.Dockerfile` - Web開発用
- [ ] `cmd/api-server/air.toml` - ホットリロード設定

---

## Phase 1: MVP（最小限の動作）

### 1.1 コード生成パイプライン

#### TypeSpec
- [ ] `typespec/package.json` - TypeSpec依存関係
- [ ] `typespec/tspconfig.yaml` - TypeSpec設定
- [ ] `typespec/main.tsp` - API仕様定義 (Auth, Rooms, YouTube)

#### sqlc
- [ ] `db/sqlc.yml` - sqlc設定
- [ ] `db/init/schema.sql` - DBスキーマ定義
- [ ] `db/init/seed.sql` - 初期データ（空ファイル）
- [ ] `db/queries/query.sql` - SQLクエリ定義
- [ ] `task sqlc` 実行確認

#### ogen
- [ ] `cmd/api-server/main.go` - go:generate ディレクティブ追加
- [ ] `task ogen` 実行確認

#### orval
- [ ] `web/package.json` - フロントエンド依存関係
- [ ] `web/orval.config.ts` - orval設定
- [ ] `task openapi-client` 実行確認

### 1.2 バックエンド基盤

#### 設定・ミドルウェア
- [ ] `internal/config/config.go` - 環境変数読み込み
- [ ] `internal/middleware/cors.go` - CORS設定
- [ ] `internal/middleware/logging.go` - リクエストログ

#### SkyWay Token生成
- [ ] `internal/service/skyway_service.go` - JWT Token生成
- [ ] `internal/adapter/auth_handler.go` - POST /api/auth/token

#### 部屋管理（Phase 1では最小限）
- [ ] `internal/model/room.go` - RoomPassword モデル
- [ ] `internal/repository/room_repository.go` - パスワードDB操作
- [ ] `internal/usecase/room_usecase.go` - 部屋作成ロジック
- [ ] `internal/adapter/room_handler.go` - POST /api/rooms, GET /api/rooms

#### 短縮URL
- [ ] `internal/model/shorturl.go` - ShortURL モデル
- [ ] `internal/repository/shorturl_repository.go` - 短縮URL DB操作
- [ ] GET /api/r/{short_id} 実装

#### YouTube検索Proxy
- [ ] `internal/service/youtube_service.go` - YouTube Data API連携
- [ ] `internal/usecase/youtube_usecase.go` - 検索ロジック
- [ ] `internal/adapter/youtube_handler.go` - GET /api/youtube/search

#### サーバー起動
- [ ] `cmd/api-server/main.go` - HTTPサーバー起動処理
- [ ] DB接続処理
- [ ] ハンドラー登録

### 1.3 フロントエンド基盤

#### プロジェクト初期化
- [ ] `web/vite.config.ts` - Vite設定
- [ ] `web/tsconfig.json` - TypeScript設定
- [ ] `web/index.html` - HTMLテンプレート
- [ ] `web/tailwind.config.js` - Tailwind CSS v4設定
- [ ] `web/components.json` - shadcn/ui設定
- [ ] `web/src/styles/globals.css` - グローバルスタイル

#### 共通ライブラリ
- [ ] `web/src/lib/api.ts` - Axios設定（orval mutator）
- [ ] `web/src/lib/storage.ts` - localStorage操作
- [ ] `web/src/lib/utils.ts` - 汎用ユーティリティ

#### 型定義
- [ ] `web/src/types/skyway.ts` - SkyWay関連型
- [ ] `web/src/types/message.ts` - DataStreamメッセージ型
- [ ] `web/src/types/room.ts` - 部屋関連型

#### 状態管理
- [ ] `web/src/stores/userStore.ts` - ユーザー状態 (zustand)
- [ ] `web/src/stores/roomStore.ts` - 部屋状態
- [ ] `web/src/stores/uiStore.ts` - UI状態

#### SkyWay接続
- [ ] `web/src/lib/skyway.ts` - SkyWay初期化ヘルパー
- [ ] `web/src/hooks/useSkyWay.ts` - SkyWay接続管理フック
- [ ] `web/src/hooks/useRoom.ts` - 部屋状態管理フック

#### YouTube再生
- [ ] `web/src/lib/youtube.ts` - YouTube IFrame Player API
- [ ] `web/src/hooks/useVideoSync.ts` - 動画同期ロジック
- [ ] `web/src/components/player/YouTubePlayer.tsx` - プレイヤーコンポーネント
- [ ] `web/src/components/player/PlayerControls.tsx` - コントロールUI

#### 部屋一覧ページ
- [ ] `web/src/pages/HomePage.tsx` - 部屋一覧ページ
- [ ] `web/src/components/room/RoomList.tsx` - 部屋一覧
- [ ] `web/src/components/room/RoomCard.tsx` - 部屋カード
- [ ] `web/src/components/room/CreateRoomDialog.tsx` - 部屋作成ダイアログ

#### 部屋ページ
- [ ] `web/src/pages/RoomPage.tsx` - 部屋画面
- [ ] `web/src/components/room/MemberList.tsx` - メンバー一覧

#### 動画検索
- [ ] `web/src/components/player/VideoSearch.tsx` - 動画検索UI

#### ルーティング
- [ ] `web/src/App.tsx` - ルートコンポーネント
- [ ] `web/src/main.tsx` - エントリーポイント

#### 共通UIコンポーネント (shadcn/ui)
- [ ] `web/src/components/ui/button.tsx`
- [ ] `web/src/components/ui/card.tsx`
- [ ] `web/src/components/ui/dialog.tsx`
- [ ] `web/src/components/ui/input.tsx`
- [ ] `web/src/components/common/Header.tsx`
- [ ] `web/src/components/common/Loading.tsx`
- [ ] `web/src/components/common/ErrorBoundary.tsx`

### 1.4 基本チャット

#### フロントエンド
- [ ] `web/src/hooks/useChat.ts` - チャットロジック
- [ ] `web/src/components/chat/ChatPanel.tsx` - チャットパネル
- [ ] `web/src/components/chat/ChatMessage.tsx` - メッセージ表示
- [ ] `web/src/components/chat/ChatInput.tsx` - 入力欄

---

## Phase 2: コア機能完成

### 2.1 パスワード保護機能

#### バックエンド
- [ ] POST /api/rooms/{room_id}/verify-password 実装
- [ ] PUT /api/rooms/{room_id}/password 実装
- [ ] DELETE /api/rooms/{room_id}/password 実装
- [ ] bcryptハッシュ化処理

#### フロントエンド
- [ ] `web/src/components/room/PasswordDialog.tsx` - パスワード入力ダイアログ
- [ ] パスワード付き部屋の入室フロー

### 2.2 権限管理機能

#### フロントエンド
- [ ] `web/src/hooks/usePermission.ts` - 権限管理フック
- [ ] `web/src/components/room/RoomSettings.tsx` - 部屋設定パネル
- [ ] 権限モード切り替えUI (creator/specific/all)
- [ ] 個別ユーザーへの権限付与UI
- [ ] PermissionMessage 送受信処理

### 2.3 リアクション機能

#### フロントエンド
- [ ] `web/src/hooks/useReaction.ts` - リアクションロジック
- [ ] `web/src/components/chat/ReactionPicker.tsx` - 絵文字選択
- [ ] `web/src/components/player/ReactionOverlay.tsx` - 画面オーバーレイ
- [ ] ReactionMessage 送受信処理
- [ ] アニメーション実装（上から下に流れる）

### 2.4 再生履歴機能

#### フロントエンド
- [ ] `web/src/components/player/PlayHistory.tsx` - 再生履歴パネル
- [ ] Room Metadata への履歴保存
- [ ] 履歴からの動画選択再生

### 2.5 シェアURL機能

#### フロントエンド
- [ ] `web/src/components/room/ShareButton.tsx` - シェアボタン
- [ ] クリップボードコピー機能
- [ ] `/r/{shortId}` ルーティング対応

---

## Phase 3: 管理・品質向上

### 3.1 通報機能

#### バックエンド
- [ ] `internal/model/report.go` - Report モデル
- [ ] `internal/repository/report_repository.go` - 通報DB操作
- [ ] `internal/usecase/report_usecase.go` - 通報処理
- [ ] `internal/adapter/report_handler.go` - POST /api/reports

#### フロントエンド
- [ ] `web/src/components/chat/ReportDialog.tsx` - 通報ダイアログ
- [ ] チャットメッセージからの通報UI

### 3.2 管理者ダッシュボード

#### バックエンド
- [ ] `internal/middleware/auth.go` - Basic認証ミドルウェア
- [ ] `internal/adapter/admin_handler.go` - 管理者API
- [ ] GET /api/admin/reports 実装
- [ ] PUT /api/admin/reports/{id} 実装
- [ ] GET /api/admin/bans 実装
- [ ] POST /api/admin/bans 実装
- [ ] DELETE /api/admin/bans/{user_id} 実装

#### フロントエンド
- [ ] `web/src/pages/AdminPage.tsx` - 管理者ダッシュボード
- [ ] `web/src/components/admin/AdminDashboard.tsx` - ダッシュボード
- [ ] `web/src/components/admin/ReportList.tsx` - 通報一覧
- [ ] `web/src/components/admin/BanList.tsx` - BAN一覧
- [ ] `web/src/components/admin/RoomManagement.tsx` - 部屋管理

### 3.3 キック/BAN機能

#### バックエンド
- [ ] `internal/model/ban.go` - GlobalBan モデル
- [ ] `internal/repository/ban_repository.go` - BAN DB操作
- [ ] `internal/usecase/ban_usecase.go` - BAN管理
- [ ] GET /api/bans/check/{user_id} 実装

#### フロントエンド
- [ ] ModerationMessage 送受信処理
- [ ] キック通知表示
- [ ] BAN確認処理（入室時）

### 3.4 ダークモード対応

#### フロントエンド
- [ ] `web/src/hooks/useTheme.ts` - テーマ管理
- [ ] `web/src/components/common/ThemeToggle.tsx` - 切り替えボタン
- [ ] Tailwind CSS ダークモード設定
- [ ] システム設定追従

### 3.5 レスポンシブ対応

#### フロントエンド
- [ ] PC レイアウト（動画左 + チャット右）
- [ ] モバイル レイアウト（動画上 + チャット下）
- [ ] ブレークポイント設定

### 3.6 画像アップロード

#### バックエンド
- [ ] `internal/service/r2_service.go` - Cloudflare R2連携
- [ ] `internal/repository/r2_repository.go` - R2操作
- [ ] `internal/usecase/upload_usecase.go` - アップロード処理
- [ ] `internal/adapter/upload_handler.go` - POST /api/upload/icon
- [ ] MIMEタイプ検証
- [ ] サイズ制限 (1MB)

#### フロントエンド
- [ ] `web/src/components/user/UserProfile.tsx` - プロフィール設定
- [ ] `web/src/components/user/UserAvatar.tsx` - アバター表示
- [ ] `web/src/components/user/IconUploader.tsx` - アイコンアップロード

---

## Phase 4: MSW・テスト・本番環境

### 4.1 MSW (Mock Service Worker)

- [ ] `web/mocks/browser.ts` - ブラウザ用セットアップ
- [ ] `web/mocks/handlers.ts` - APIハンドラー定義
- [ ] `web/mocks/fixtures/rooms.ts` - 部屋モックデータ
- [ ] `web/mocks/fixtures/users.ts` - ユーザーモックデータ
- [ ] `web/mocks/fixtures/videos.ts` - 動画モックデータ
- [ ] `web/public/mockServiceWorker.js` - Service Worker
- [ ] `web/src/main.tsx` - MSW初期化処理

### 4.2 テスト

#### バックエンド
- [ ] ユニットテスト (usecase層)
- [ ] 統合テスト (repository層)
- [ ] APIテスト (handler層)

#### フロントエンド
- [ ] Vitest設定
- [ ] コンポーネントテスト (React Testing Library)
- [ ] E2Eテスト (Playwright) - オプション

### 4.3 本番環境

- [ ] `docker-compose.prod.yml` - 本番環境
- [ ] `docker/production/api-server.Dockerfile` - API本番用
- [ ] `docker/production/web.Dockerfile` - Web本番用 (Nginx)
- [ ] `docker/production/nginx.conf` - Nginx設定
- [ ] CI/CD設定（GitHub Actions）

---

## 依存関係

### Go 依存パッケージ
```
github.com/ogen-go/ogen
github.com/golang-jwt/jwt/v5
github.com/google/uuid
github.com/go-sql-driver/mysql
golang.org/x/crypto/bcrypt
github.com/aws/aws-sdk-go-v2 (R2用)
google.golang.org/api/youtube/v3
```

### npm 依存パッケージ
```
react, react-dom
@tanstack/react-query
axios
zustand
react-router-dom
@skyway-sdk/room
@skyway-sdk/token
tailwindcss
@radix-ui/react-* (shadcn/ui)
msw
vitest, @testing-library/react
orval
```

### TypeSpec 依存パッケージ
```
@typespec/compiler
@typespec/http
@typespec/rest
@typespec/openapi
@typespec/openapi3
```

---

## 実装順序ガイド

1. **Phase 0** → プロジェクト基盤
2. **Phase 1.1** → コード生成パイプライン（ここで全体の型が決まる）
3. **Phase 1.2** → バックエンドAPI
4. **Phase 1.3** → フロントエンド基盤
5. **Phase 1.4** → チャット（これでMVP完成）
6. **Phase 2** → コア機能（優先度順に実装）
7. **Phase 3** → 管理・品質（優先度順に実装）
8. **Phase 4** → テスト・本番

各Phaseは独立してデプロイ可能な単位になっています。
