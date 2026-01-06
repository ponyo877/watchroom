/**
 * 同期システム公開API
 *
 * 【エクスポート一覧】
 *
 * フック:
 * - useVideoSync: メインのReactフック
 *
 * 型:
 * - UseVideoSyncOptions: useVideoSyncのオプション型
 * - UseVideoSyncReturn: useVideoSyncの戻り値型
 * - SyncSnapshot: 同期状態のスナップショット型
 * - PlaybackState: 再生状態型
 * - SyncStatus: 同期ステータス型
 *
 * 定数:
 * - TIMING_CONSTANTS: タイミング関連定数
 * - DEFAULT_SYNC_SNAPSHOT: デフォルトスナップショット
 *
 * クラス（上級者向け）:
 * - SyncEngine: 同期エンジンクラス
 * - PlayerController: プレイヤーコントローラークラス
 * - NetworkManager: ネットワーク管理クラス
 * - ClockManager: 時刻管理クラス
 * - EventEmitter: イベントエミッター基底クラス
 *
 * プロトコル（上級者向け）:
 * - StateRequestProtocol: State Requestプロトコル
 * - HeartbeatProtocol: Heartbeatプロトコル
 */

// ============================================================
// メインフック
// ============================================================

export { useVideoSync } from './hooks/useVideoSync';

// ============================================================
// 型定義
// ============================================================

export type {
  // フック関連
  UseVideoSyncOptions,
  UseVideoSyncReturn,

  // 状態関連
  SyncSnapshot,
  PlaybackState,
  SyncStatus,

  // 設定関連
  SyncEngineConfig,
  PlayerControllerConfig,
  SendMessageFn,

  // イベント関連
  PlayerEventType,
  PlayerEventData,
  NetworkEventType,
  NetworkEventData,
  SyncEngineEventType,

  // E2Eテスト関連
  WatchRoomTestSyncState,
} from './types';

// ============================================================
// 定数
// ============================================================

export {
  TIMING_CONSTANTS,
  PLAYER_STATE,
  DEFAULT_SYNC_SNAPSHOT,
  isMobile,
} from './types';

// ============================================================
// コアクラス（上級者向け）
// ============================================================

export { SyncEngine } from './core/SyncEngine';
export { PlayerController } from './core/PlayerController';
export { NetworkManager } from './core/NetworkManager';
export { ClockManager } from './core/ClockManager';
export { EventEmitter } from './core/EventEmitter';

// ============================================================
// プロトコル（上級者向け）
// ============================================================

export { StateRequestProtocol } from './protocols/StateRequestProtocol';
export { HeartbeatProtocol } from './protocols/HeartbeatProtocol';
