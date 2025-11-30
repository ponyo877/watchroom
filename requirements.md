# WatchRoom - YouTube同時視聴サービス 要件定義書

## 1. サービス概要

### 1.1 サービス名
**WatchRoom**（ウォッチルーム）

### 1.2 サービス概要
YouTubeの動画を不特定多数のユーザーと同時視聴できるWebサービス。ユーザーは部屋を作成し、同じ部屋にいるユーザー同士でリアルタイムに動画を同期再生しながら、テキストチャットやリアクションで交流できる。

### 1.3 主要機能
- 部屋の作成・参加・退出
- YouTube動画の同期再生（再生/停止/シーク/速度変更）
- リアルタイムテキストチャット
- 絵文字リアクション（画面上に流れる形式）
- 部屋のパスワード保護
- 操作権限の管理
- 部屋一覧の閲覧

---

## 2. ユーザー要件

### 2.1 ユーザー識別
- **ログイン機能なし**
- ユーザー名とアイコン画像をブラウザのlocalStorageに保存
- 再訪問時は保存された情報をプリセット
- ユーザーは部屋一覧画面でユーザー名・アイコンを設定/変更可能

### 2.2 ユーザーアイコン
- ユーザーが自由に画像をアップロード
- アップロード先: **Cloudflare R2**
- サイズ制限: **最大1MB**
- 対応形式: JPEG, PNG, GIF, WebP

### 2.3 ユーザー情報の保存
```typescript
interface UserProfile {
  id: string;          // UUID v4（localStorage生成）
  name: string;        // ユーザー名
  iconUrl: string;     // アップロード済みアイコンのURL
}
```

---

## 3. 部屋機能

### 3.1 部屋の作成
- 部屋名（任意、未設定の場合は自動生成）
- パスワード（任意、設定すると鍵付き部屋になる）
- 作成者は自動的に操作権限を持つ

### 3.2 部屋の参加
- 部屋一覧から選択して参加
- シェアURL（短縮形式）から直接参加
- パスワード付き部屋はパスワード入力画面を表示
- ユーザー名未設定の場合は入力を求める

### 3.3 部屋のシェアURL
- 形式: `https://{domain}/r/{shortId}`
- shortId: 6-8文字の英数字
- ワンクリックでクリップボードにコピー

### 3.4 部屋の設定変更（部屋作成者のみ）
- 部屋名の変更
- パスワードの追加/変更/削除
- 権限設定の変更

### 3.5 部屋の永続性
- **全員退出したら自動削除**
- チャット履歴は部屋が存在する間のみメモリ上に保持

### 3.6 部屋の同時接続人数
- **最大4人**（P2P通信で快適に利用可能な範囲）
- 将来的に5人以上対応する場合はSFUへの切り替えを検討

---

## 4. 部屋一覧機能

### 4.1 一覧表示内容
各部屋について以下の情報を表示:
- 部屋名
- 作成者のユーザー名・アイコン
- 現在視聴中の動画情報
  - サムネイル画像
  - 動画タイトル
  - 現在の再生時間
- 参加人数
- 鍵アイコン（パスワード付きの場合）

### 4.2 サムネイル表示
- 通常時: 静止画サムネイル + 再生時間表示
- ホバー時: 再生中の動画をライブプレビュー（ミュート状態）

### 4.3 更新方式
- **手動リロード / 一定間隔ポーリング**（30秒間隔を推奨）
- リアルタイム更新は不要

### 4.4 フィルタリング
- 鍵なし部屋のみ表示（デフォルト）
- 全部屋表示（鍵付き含む）

---

## 5. 動画再生機能

### 5.1 YouTube動画の選択
- **検索機能**: YouTube Data APIを使用したキーワード検索
- **URL直接指定**: YouTube動画URLを貼り付けて選択
- 検索結果は候補として表示し、選択して再生

### 5.2 動画プレイヤー操作
- 再生/停止
- シーク（再生位置の変更）
- 再生速度変更（0.25x〜2x）
- 全画面表示
- 音量調整（個人設定、同期対象外）

### 5.3 動画同期
- **可能な限り高精度**（ネットワーク遅延は許容）
- 権限を持つユーザーが操作すると、全員の動画に同期反映
- 同期対象: 再生/停止、シーク位置、再生速度
- 同期対象外: 音量、全画面表示

### 5.4 再生履歴
- **部屋単位**で再生履歴を保持
- 履歴から動画を選択して再度再生可能
- 履歴件数: 最大20件（古いものから削除）

### 5.5 エラーハンドリング
- 動画が利用不可（削除済み、地域制限など）の場合:
  - エラーメッセージを表示
  - 別の動画を選択するよう促す

---

## 6. チャット機能

### 6.1 テキストチャット
- 部屋内のユーザーとリアルタイムでテキストメッセージを送受信
- メッセージには送信者のユーザー名・アイコン・タイムスタンプを表示
- チャット履歴は部屋が存在する間のみ保持

### 6.2 リアクション機能
- 任意の絵文字を使用可能
- 絵文字は動画再生画面上を**上から下に流れる**（Google Meet風）
- 流れる速度・サイズは固定

### 6.3 通報機能
- チャットメッセージを通報可能
- 通報されたメッセージは管理者に通知
- 部屋作成者は通報されたユーザーをキック/BAN可能

---

## 7. 権限管理

### 7.1 権限の種類
2段階の権限システム:
- **操作可能**: 動画の再生/停止/シーク/速度変更が可能
- **操作不可能**: 視聴のみ

### 7.2 権限設定オプション
- **部屋作成者のみ**（デフォルト）
- **特定のユーザーに許可**: 個別に操作権限を付与
- **全員に許可**: 部屋内の全ユーザーが操作可能

### 7.3 権限の変更
- 部屋作成者のみが権限設定を変更可能

---

## 8. 管理機能

### 8.1 管理者ダッシュボード
- 通報一覧の確認
- 部屋一覧の管理
- ユーザーのBAN管理

### 8.2 モデレーション
- 部屋作成者によるユーザーのキック
- 部屋作成者によるユーザーのBAN（その部屋への再参加禁止）
- 管理者による全体BAN（サービス全体での利用禁止）

---

## 9. UI/UX要件

### 9.1 画面レイアウト
- **レスポンシブ対応**
  - PC: 動画（左）+ チャット（右サイドバー）
  - モバイル: 動画（上）+ チャット（下、縦積み）

### 9.2 ダークモード
- **対応必須**
- システム設定に追従 + 手動切り替え可能

### 9.3 多言語対応
- **日本語のみ**

### 9.4 主要画面構成

#### 9.4.1 部屋一覧画面（トップページ）
- ユーザープロファイル設定（ユーザー名、アイコン）
- 部屋一覧（グリッド表示）
- 部屋作成ボタン
- フィルター（鍵なしのみ / 全て）

#### 9.4.2 部屋画面
- 動画プレイヤー
  - @next/third-parties/google
   - 詳細: https://nextjs.org/docs/app/guides/third-party-libraries#youtube-embed
  - プレイヤーコントロール
  - リアクション表示オーバーレイ
- 動画検索/選択パネル
- 視聴中ユーザー一覧
- チャットパネル
  - メッセージ履歴
  - メッセージ入力
  - リアクションボタン
- 部屋設定パネル
  - 部屋名変更
  - パスワード設定
  - 権限設定
  - シェアURL表示・コピー
- 再生履歴パネル
- 退出ボタン

#### 9.4.3 管理者ダッシュボード
- 通報一覧
- 部屋管理
- BAN管理

---

## 10. 技術要件

### 10.1 フロントエンド
- **Vite** - ビルドツール
- **React 19** - UIライブラリ
- **TypeScript** - 型安全性
- **shadcn/ui 3.5.1** - UIコンポーネント
- **Tailwind CSS v4** - スタイリング

### 10.2 リアルタイム通信（SkyWay）
SkyWayを**最大限活用**し、以下の機能を実装:

#### 10.2.1 SkyWay P2P Roomで実現する機能
- 部屋の作成・参加・退出
- メンバー一覧の管理
- **DataStream**を使用したデータ通信:
  - 動画同期メッセージ（再生/停止/シーク/速度変更）
  - チャットメッセージ
  - リアクション
  - 権限変更通知
  - キック/BAN通知

#### 10.2.2 SkyWay Room Metadata活用
- 部屋名
- 現在再生中の動画情報
- 権限設定
- 再生履歴

#### 10.2.3 SkyWay Member Metadata活用
- ユーザー名
- アイコンURL
- 操作権限フラグ
- BAN状態

### 10.3 バックエンド（Go）
SkyWayで実現できない機能のみGoバックエンドで実装:

#### 10.3.1 必須機能
- **SkyWay Auth Token生成**: JWTトークンの生成（Secret Keyの保護）
- **パスワード検証**: 部屋のパスワード照合（セキュリティ）
- **画像アップロード**: Cloudflare R2へのアップロードProxy
- **YouTube Data API Proxy**: APIキーの保護、検索クエリの中継
- **部屋一覧取得**: SkyWay Channel APIを使用した部屋情報取得
- **短縮URL管理**: shortId と roomId のマッピング

#### 10.3.2 管理機能
- 通報の保存・取得
- 全体BANユーザーの管理
- 管理者認証

### 10.4 外部サービス

#### 10.4.1 SkyWay
- **用途**: リアルタイム通信（P2P Room、DataStream）
- **必要情報**: Application ID, Secret Key
- **SDK**: `@skyway-sdk/room`, `@skyway-sdk/token`

#### 10.4.2 YouTube
- **IFrame Player API**: 動画再生（フロントエンド）
- **Data API v3**: 動画検索（バックエンド経由）
- **必要情報**: Google Cloud API Key

#### 10.4.3 Cloudflare R2
- **用途**: ユーザーアイコン画像の保存
- **必要情報**: Account ID, Access Key ID, Secret Access Key, Bucket Name

---

## 11. データ構造

### 11.1 SkyWay Room Metadata
```typescript
interface RoomMetadata {
  name: string;                    // 部屋名
  creatorId: string;               // 作成者のユーザーID
  hasPassword: boolean;            // パスワード設定有無
  currentVideo: {
    videoId: string;               // YouTube Video ID
    title: string;                 // 動画タイトル
    thumbnail: string;             // サムネイルURL
  } | null;
  playbackState: {
    isPlaying: boolean;            // 再生中フラグ
    currentTime: number;           // 現在の再生位置（秒）
    playbackRate: number;          // 再生速度
    lastUpdated: number;           // 最終更新タイムスタンプ
  };
  permissionMode: 'creator' | 'specific' | 'all';  // 権限モード
  allowedUserIds: string[];        // 操作許可ユーザーID一覧
  playHistory: Array<{
    videoId: string;
    title: string;
    thumbnail: string;
    playedAt: number;
  }>;                              // 再生履歴（最大20件）
}
```

### 11.2 SkyWay Member Metadata
```typescript
interface MemberMetadata {
  id: string;                      // ユーザーID
  name: string;                    // ユーザー名
  iconUrl: string;                 // アイコンURL
  isCreator: boolean;              // 部屋作成者フラグ
  isBanned: boolean;               // BAN状態
}
```

### 11.3 DataStream メッセージ形式
```typescript
// 動画同期メッセージ
interface SyncMessage {
  type: 'sync';
  action: 'play' | 'pause' | 'seek' | 'rate' | 'video';
  payload: {
    currentTime?: number;
    playbackRate?: number;
    videoId?: string;
    videoTitle?: string;
    thumbnail?: string;
  };
  senderId: string;
  timestamp: number;
}

// チャットメッセージ
interface ChatMessage {
  type: 'chat';
  payload: {
    messageId: string;
    text: string;
    senderName: string;
    senderIconUrl: string;
  };
  senderId: string;
  timestamp: number;
}

// リアクションメッセージ
interface ReactionMessage {
  type: 'reaction';
  payload: {
    emoji: string;
  };
  senderId: string;
  timestamp: number;
}

// 権限変更通知
interface PermissionMessage {
  type: 'permission';
  payload: {
    mode: 'creator' | 'specific' | 'all';
    allowedUserIds: string[];
  };
  senderId: string;
  timestamp: number;
}

// キック/BAN通知
interface ModerationMessage {
  type: 'moderation';
  action: 'kick' | 'ban';
  payload: {
    targetUserId: string;
  };
  senderId: string;
  timestamp: number;
}
```

### 11.4 バックエンド データモデル（Go）

```go
// 部屋パスワード管理
type RoomPassword struct {
    RoomID       string    `json:"room_id"`
    PasswordHash string    `json:"password_hash"`
    CreatedAt    time.Time `json:"created_at"`
}

// 短縮URL管理
type ShortURL struct {
    ShortID   string    `json:"short_id"`
    RoomID    string    `json:"room_id"`
    CreatedAt time.Time `json:"created_at"`
}

// 通報
type Report struct {
    ID          string    `json:"id"`
    RoomID      string    `json:"room_id"`
    ReporterID  string    `json:"reporter_id"`
    TargetID    string    `json:"target_id"`
    MessageText string    `json:"message_text"`
    Reason      string    `json:"reason"`
    Status      string    `json:"status"` // pending, reviewed, resolved
    CreatedAt   time.Time `json:"created_at"`
}

// 全体BANユーザー
type GlobalBan struct {
    UserID    string    `json:"user_id"`
    Reason    string    `json:"reason"`
    BannedAt  time.Time `json:"banned_at"`
    ExpiresAt time.Time `json:"expires_at"` // null = 永久BAN
}
```

---

## 12. API設計（Goバックエンド）

### 12.1 認証関連
```
POST /api/auth/token
  - SkyWay Auth Tokenの生成
  - Request: { userId: string, roomName?: string }
  - Response: { token: string, expiresAt: number }
```

### 12.2 部屋関連
```
GET /api/rooms
  - 部屋一覧の取得（SkyWay Channel API経由）
  - Response: { rooms: Room[] }

POST /api/rooms
  - 部屋の作成（パスワード設定）
  - Request: { roomId: string, password?: string }
  - Response: { shortId: string }

POST /api/rooms/:roomId/verify-password
  - パスワード検証
  - Request: { password: string }
  - Response: { valid: boolean }

PUT /api/rooms/:roomId/password
  - パスワード変更
  - Request: { oldPassword?: string, newPassword: string }
  - Response: { success: boolean }

DELETE /api/rooms/:roomId/password
  - パスワード削除
  - Request: { password: string }
  - Response: { success: boolean }
```

### 12.3 短縮URL関連
```
GET /api/r/:shortId
  - 短縮URLから部屋IDを取得
  - Response: { roomId: string, hasPassword: boolean }
```

### 12.4 画像アップロード
```
POST /api/upload/icon
  - ユーザーアイコンのアップロード
  - Request: multipart/form-data (image file)
  - Response: { url: string }
```

### 12.5 YouTube検索
```
GET /api/youtube/search
  - YouTube動画検索
  - Query: q (検索クエリ), maxResults (件数)
  - Response: { items: YouTubeVideo[] }
```

### 12.6 通報関連
```
POST /api/reports
  - 通報の作成
  - Request: { roomId, targetId, messageText, reason }
  - Response: { id: string }

GET /api/admin/reports
  - 通報一覧（管理者用）
  - Response: { reports: Report[] }

PUT /api/admin/reports/:id
  - 通報ステータス更新（管理者用）
  - Request: { status: string }
  - Response: { success: boolean }
```

### 12.7 BAN関連
```
POST /api/admin/bans
  - 全体BAN追加（管理者用）
  - Request: { userId, reason, expiresAt? }
  - Response: { success: boolean }

GET /api/admin/bans
  - BAN一覧（管理者用）
  - Response: { bans: GlobalBan[] }

DELETE /api/admin/bans/:userId
  - BAN解除（管理者用）
  - Response: { success: boolean }

GET /api/bans/check/:userId
  - BAN状態確認
  - Response: { isBanned: boolean, reason?: string }
```

---

## 13. セキュリティ要件

### 13.1 SkyWay Auth Token
- Secret Keyはバックエンドでのみ使用
- トークン有効期限: 24時間
- 必要最小限の権限のみ付与

### 13.2 パスワード保護
- パスワードはbcryptでハッシュ化して保存
- パスワード検証はバックエンドで実行

### 13.3 入力値検証
- XSS対策: チャットメッセージのサニタイズ
- ファイルアップロード: MIMEタイプ・サイズ検証

### 13.4 管理者認証
- 管理者ダッシュボードへのアクセスは認証必須
- 環境変数で管理者クレデンシャルを設定

---

## 14. デプロイ要件

### 14.1 インフラ構成
- **GCP VM** 上に Docker/Docker Compose でデプロイ
- Cloudflareで DNS (Aレコード) + HTTPS化

### 14.2 Docker構成
```yaml
services:
  frontend:
    # Nginx + Vite build成果物
    ports:
      - "80:80"

  backend:
    # Go APIサーバー
    ports:
      - "8080:8080"
    environment:
      - SKYWAY_APP_ID
      - SKYWAY_SECRET_KEY
      - YOUTUBE_API_KEY
      - R2_ACCOUNT_ID
      - R2_ACCESS_KEY_ID
      - R2_SECRET_ACCESS_KEY
      - R2_BUCKET_NAME
      - ADMIN_USERNAME
      - ADMIN_PASSWORD
```

### 14.3 環境変数
```
# SkyWay
SKYWAY_APP_ID=xxx
SKYWAY_SECRET_KEY=xxx

# YouTube
YOUTUBE_API_KEY=xxx

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_PUBLIC_URL=xxx

# Admin
ADMIN_USERNAME=xxx
ADMIN_PASSWORD=xxx
```

---

## 15. 開発環境

### 15.1 ローカル開発
- Node.js v24.11.1+
- Go 1.25+
- Docker / Docker Compose v3

### 15.2 開発サーバー
```bash
# フロントエンド
cd frontend && npm run dev  # http://localhost:5173

# バックエンド
cd backend && go run main.go  # http://localhost:8080
```

---

## 16. ディレクトリ構成

```
youtube-friend-watch/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── room/            # 部屋関連コンポーネント
│   │   │   ├── chat/            # チャット関連コンポーネント
│   │   │   ├── player/          # 動画プレイヤー関連
│   │   │   └── common/          # 共通コンポーネント
│   │   ├── hooks/
│   │   │   ├── useSkyWay.ts     # SkyWay接続管理
│   │   │   ├── useVideoSync.ts  # 動画同期ロジック
│   │   │   └── useChat.ts       # チャットロジック
│   │   ├── lib/
│   │   │   ├── skyway.ts        # SkyWay初期化
│   │   │   ├── youtube.ts       # YouTube Player API
│   │   │   └── api.ts           # バックエンドAPI
│   │   ├── stores/
│   │   │   ├── userStore.ts     # ユーザー状態管理
│   │   │   └── roomStore.ts     # 部屋状態管理
│   │   ├── pages/
│   │   │   ├── Home.tsx         # 部屋一覧
│   │   │   ├── Room.tsx         # 部屋画面
│   │   │   └── Admin.tsx        # 管理者ダッシュボード
│   │   ├── types/
│   │   │   └── index.ts         # 型定義
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── handler/
│   │   │   ├── auth.go          # 認証ハンドラー
│   │   │   ├── room.go          # 部屋ハンドラー
│   │   │   ├── upload.go        # アップロードハンドラー
│   │   │   ├── youtube.go       # YouTube検索ハンドラー
│   │   │   ├── report.go        # 通報ハンドラー
│   │   │   └── admin.go         # 管理者ハンドラー
│   │   ├── middleware/
│   │   │   ├── cors.go
│   │   │   └── auth.go
│   │   ├── service/
│   │   │   ├── skyway.go        # SkyWay Token生成
│   │   │   ├── youtube.go       # YouTube API
│   │   │   └── r2.go            # Cloudflare R2
│   │   ├── repository/
│   │   │   ├── password.go      # パスワード保存
│   │   │   ├── shorturl.go      # 短縮URL保存
│   │   │   ├── report.go        # 通報保存
│   │   │   └── ban.go           # BAN保存
│   │   └── model/
│   │       └── models.go
│   ├── go.mod
│   └── go.sum
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.backend
└── requirements.md
```

---

## 17. 実装優先順位

### Phase 1: MVP（最小限の動作）
1. SkyWay接続・部屋作成/参加
2. YouTube動画の再生
3. 動画同期（再生/停止/シーク）
4. 基本的なチャット機能
5. 部屋一覧表示

### Phase 2: コア機能完成
1. パスワード保護機能
2. 権限管理機能
3. リアクション機能
4. 再生履歴機能
5. シェアURL機能

### Phase 3: 管理・品質向上
1. 通報機能
2. 管理者ダッシュボード
3. キック/BAN機能
4. ダークモード対応
5. レスポンシブ対応

---

## 18. SkyWay実装詳細

### 18.1 SkyWay Auth Token生成（バックエンド）
```go
// SkyWay Auth Token v3 生成
func GenerateSkyWayToken(appID, secretKey, userID string, roomName *string) (string, error) {
    now := time.Now()

    claims := jwt.MapClaims{
        "jti":     uuid.New().String(),
        "iat":     now.Unix(),
        "exp":     now.Add(24 * time.Hour).Unix(),
        "version": 3,
        "scope": map[string]interface{}{
            "app": map[string]interface{}{
                "id":      appID,
                "turn":    true,
                "actions": []string{"read"},
                "channels": []map[string]interface{}{
                    {
                        "id":   "*",
                        "name": roomName, // nilの場合は全部屋アクセス可
                        "actions": []string{"write"},
                        "members": []map[string]interface{}{
                            {
                                "id":   "*",
                                "name": "*",
                                "actions": []string{"write"},
                                "publication": map[string]interface{}{
                                    "actions": []string{"write"},
                                },
                                "subscription": map[string]interface{}{
                                    "actions": []string{"write"},
                                },
                            },
                        },
                    },
                },
            },
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secretKey))
}
```

### 18.2 SkyWay Room初期化（フロントエンド）
```typescript
import { SkyWayContext, SkyWayRoom, LocalDataStream } from '@skyway-sdk/room';

export async function initializeSkyWay(token: string) {
  const context = await SkyWayContext.Create(token);
  return context;
}

export async function createOrJoinRoom(
  context: SkyWayContext,
  roomName: string,
  memberName: string,
  memberMetadata: MemberMetadata
) {
  // P2P Roomを使用（DataStream対応のため）
  const room = await SkyWayRoom.FindOrCreate(context, {
    type: 'p2p',
    name: roomName,
  });

  const member = await room.join({
    name: memberName,
    metadata: JSON.stringify(memberMetadata),
  });

  return { room, member };
}

export async function createDataStream() {
  const dataStream = new LocalDataStream();
  return dataStream;
}
```

### 18.3 DataStream通信（フロントエンド）
```typescript
// メッセージ送信
export function sendMessage(
  member: LocalP2PRoomMember,
  dataStream: LocalDataStream,
  message: SyncMessage | ChatMessage | ReactionMessage
) {
  dataStream.write(JSON.stringify(message));
}

// メッセージ受信
export function subscribeToDataStream(
  subscription: RoomSubscription<RemoteDataStream>,
  onMessage: (message: any) => void
) {
  subscription.stream.onData.add((data) => {
    const message = JSON.parse(data as string);
    onMessage(message);
  });
}
```

### 18.4 Room Metadata更新
```typescript
// 部屋メタデータの更新
export async function updateRoomMetadata(
  room: P2PRoom,
  metadata: Partial<RoomMetadata>
) {
  const currentMetadata = room.metadata
    ? JSON.parse(room.metadata)
    : {};

  const newMetadata = {
    ...currentMetadata,
    ...metadata,
  };

  await room.updateMetadata(JSON.stringify(newMetadata));
}
```

---

## 19. 注意事項・制約

### 19.1 SkyWayの制約
- **DataStreamはP2Pモードのみ対応**（SFU Roomでは使用不可）
- P2Pは4人程度が快適な上限
- 将来的に5人以上対応する場合は、チャット・同期機能をバックエンド（WebSocket）に移行する必要あり

### 19.2 YouTube APIの制約
- Data API v3には日次クォータ制限あり（10,000単位/日）
- 検索は100単位/リクエスト消費
- 必要に応じてキャッシュを実装

### 19.3 ブラウザ制限
- YouTube IFrame Playerは自動再生にユーザーインタラクション必要
- 音声付き自動再生は制限あり

---

## 20. テスト要件

### 20.1 フロントエンド
- コンポーネント単体テスト（Vitest + React Testing Library）
- E2Eテスト（Playwright）推奨

### 20.2 バックエンド
- ユニットテスト（Go標準testing）
- APIテスト

### 20.3 テストシナリオ
- 部屋作成・参加・退出フロー
- 動画同期の精度確認
- チャットメッセージの送受信
- 権限による操作制限
- パスワード検証
