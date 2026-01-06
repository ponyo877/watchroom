/**
 * 同期システム型定義
 *
 * 【責務】
 * - 同期関連の型・インターフェース・定数を一元管理
 * - モバイル/デスクトップ環境に応じたタイミング定数を提供
 *
 * 【設計根拠】
 * - WatchRoom P2P Video Sync Protocol v2.0準拠
 * - モバイルブラウザの制約（遅い初期化、自動再生ポリシー）に対応
 */

import type { YouTubePlayer } from '@/types/youtube';
import type {
  SyncMessage,
  StateRequestMessage,
  StateResponseMessage,
  HeartbeatMessage,
  DataStreamMessage,
} from '@/types/message';

// ============================================================
// 環境検出
// ============================================================

/**
 * モバイルデバイス判定
 * iOSおよびAndroidデバイスを検出
 */
export const isMobile =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ============================================================
// タイミング定数
// ============================================================

/**
 * 同期システムのタイミング定数
 *
 * 【モバイル対応】
 * - STATE_RESPONSE_TIMEOUT: モバイルはP2P接続が遅いため長め
 * - MAX_VIDEO_READY_RETRIES: モバイルはプレイヤー初期化が遅いため多め
 */
export const TIMING_CONSTANTS = {
  /** 同期閾値（秒）- この差分を超えたらシーク */
  SYNC_THRESHOLD: 2,

  /** ハートビート送信間隔（ミリ秒） */
  HEARTBEAT_INTERVAL: 5000,

  /** State Response待機タイムアウト（ミリ秒） */
  STATE_RESPONSE_TIMEOUT: isMobile ? 5000 : 3000,

  /** ビデオ準備待機リトライ回数（100ms間隔） */
  MAX_VIDEO_READY_RETRIES: isMobile ? 100 : 50,

  /** 非コントローラーの応答遅延（ミリ秒） */
  CONTROLLER_RESPONSE_DELAY: 500,

  /** ページ復帰時の再生遅延（ミリ秒） */
  VISIBILITY_RESUME_DELAY: 100,

  /** syncToState後の同期中フラグ解除遅延（ミリ秒） */
  SYNC_COOLDOWN: 100,
} as const;

// ============================================================
// YouTube プレイヤー状態
// ============================================================

/**
 * YouTube IFrame API プレイヤー状態コード
 */
export const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export type PlayerStateCode = (typeof PLAYER_STATE)[keyof typeof PLAYER_STATE];

// ============================================================
// 同期状態
// ============================================================

/**
 * 同期エンジンの状態
 *
 * 【状態遷移】
 * DISCONNECTED → INITIALIZING → READY
 *                              ↓
 *                    REQUESTING_STATE → SYNCED ⇄ AUTHORITY
 */
export type SyncStatus =
  | 'disconnected'    // P2P未接続
  | 'initializing'    // プレイヤー初期化中
  | 'ready'           // 初期化完了、同期開始可能
  | 'requesting_state' // State Request送信中
  | 'synced'          // 同期完了（フォロワー）
  | 'authority';      // 権限者として動作中

/**
 * 再生状態（プレイヤーの現在状態）
 */
export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  lastUpdated: number;
}

/**
 * 同期エンジンのスナップショット状態
 * useSyncExternalStoreで購読される
 */
export interface SyncSnapshot {
  /** 同期ステータス */
  status: SyncStatus;

  /** プレイヤー準備完了 */
  isPlayerReady: boolean;

  /** 初期同期完了 */
  hasInitialSync: boolean;

  /** 現在のビデオID */
  currentVideoId: string | null;

  /** 現在の再生時間（秒） */
  currentTime: number;

  /** 再生中かどうか */
  isPlaying: boolean;

  /** 再生速度 */
  playbackRate: number;

  /** 現在のエポック */
  epoch: number;

  /** ミュート状態（自動再生ポリシー対応） */
  isMuted: boolean;
}

/**
 * デフォルトのスナップショット状態
 */
export const DEFAULT_SYNC_SNAPSHOT: SyncSnapshot = {
  status: 'disconnected',
  isPlayerReady: false,
  hasInitialSync: false,
  currentVideoId: null,
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1,
  epoch: 0,
  isMuted: false,
};

// ============================================================
// PlayerController 関連
// ============================================================

/**
 * PlayerControllerのイベント型
 */
export type PlayerEventType =
  | 'ready'           // プレイヤー準備完了
  | 'stateChange'     // 再生状態変更
  | 'error'           // エラー発生
  | 'muteChange';     // ミュート状態変更

/**
 * PlayerControllerのイベントデータ
 */
export interface PlayerEventData {
  ready: void;
  stateChange: PlayerStateCode;
  error: number;
  muteChange: boolean;
}

/**
 * PlayerControllerの設定
 */
export interface PlayerControllerConfig {
  elementId: string;
  videoId: string;
  onMutedChange?: (isMuted: boolean) => void;
}

// ============================================================
// NetworkManager 関連
// ============================================================

/**
 * NetworkManagerのイベント型
 */
export type NetworkEventType =
  | 'sync'
  | 'stateRequest'
  | 'stateResponse'
  | 'heartbeat';

/**
 * NetworkManagerのイベントデータ
 */
export interface NetworkEventData {
  sync: SyncMessage;
  stateRequest: StateRequestMessage;
  stateResponse: StateResponseMessage;
  heartbeat: HeartbeatMessage;
}

/**
 * メッセージ送信関数の型
 */
export type SendMessageFn = (message: DataStreamMessage) => Promise<boolean>;

// ============================================================
// SyncEngine 関連
// ============================================================

/**
 * SyncEngineのイベント型
 */
export type SyncEngineEventType =
  | 'statusChange'     // 同期ステータス変更
  | 'snapshotChange'   // スナップショット変更
  | 'error';           // エラー発生

/**
 * SyncEngineの設定
 */
export interface SyncEngineConfig {
  /** プレイヤー要素ID */
  elementId: string;

  /** 初期ビデオID */
  videoId: string;

  /** ユーザーID */
  userId: string;

  /** メッセージ送信関数 */
  sendMessage: SendMessageFn;

  /** メッセージフィールド生成関数 */
  createMessageFields: (senderId: string) => {
    senderId: string;
    timestamp: number;
    logicalClock: number;
    vectorClock: Record<string, number>;
    sequenceNumber: number;
    viewNumber: number;
  };

  /** ミュート状態変更コールバック */
  onMutedChange?: (isMuted: boolean) => void;
}

// ============================================================
// useVideoSync フック関連
// ============================================================

/**
 * useVideoSyncフックのオプション
 */
export interface UseVideoSyncOptions {
  /** プレイヤー要素ID */
  elementId: string;

  /** ビデオID */
  videoId: string | null;

  /** 再生状態（Zustandストアから） */
  playbackState: PlaybackState;

  /** 制御権限を持っているか */
  hasControlPermission: boolean;

  /** メッセージ送信関数 */
  sendMessage: SendMessageFn;

  /** メッセージフィールド生成関数 */
  createMessageFields: (senderId: string) => {
    senderId: string;
    timestamp: number;
    logicalClock: number;
    vectorClock: Record<string, number>;
    sequenceNumber: number;
    viewNumber: number;
  };

  /** ミュート状態変更コールバック */
  onMutedChange?: (isMuted: boolean) => void;
}

/**
 * useVideoSyncフックの戻り値
 */
export interface UseVideoSyncReturn {
  /** YouTubeプレイヤーインスタンス */
  player: YouTubePlayer | null;

  /** プレイヤー準備完了 */
  isReady: boolean;

  /** 初期同期完了 */
  isInitialSyncComplete: boolean;

  /** 現在のエポック */
  epoch: number;

  /** 同期スナップショット */
  snapshot: SyncSnapshot;

  /** 再生開始 */
  play: () => void;

  /** 一時停止 */
  pause: () => void;

  /** シーク */
  seek: (time: number) => void;

  /** 再生速度設定 */
  setPlaybackRate: (rate: number) => void;

  /** ビデオ読み込み */
  loadVideo: (videoId: string, title?: string, thumbnail?: string) => void;

  /** State Requestメッセージ処理 */
  handleStateRequest: (message: StateRequestMessage) => void;

  /** State Responseメッセージ処理 */
  handleStateResponse: (message: StateResponseMessage) => void;

  /** Heartbeatメッセージ処理 */
  handleHeartbeat: (message: HeartbeatMessage) => void;

  /**
   * ユーザー操作済みフラグを設定
   *
   * JoinOverlay（視聴開始ボタン）のクリック時に呼び出し、
   * 音声付き自動再生を許可する。
   *
   * 【重要】
   * クリックイベントハンドラ内から同期的に呼び出すこと。
   */
  setUserInteraction: () => void;
}

// ============================================================
// E2Eテスト用観測性インターフェース
// ============================================================

/**
 * window.__WATCHROOM_TEST__.sync の型
 * E2Eテストから同期状態を観測するためのインターフェース
 */
export interface WatchRoomTestSyncState {
  status: SyncStatus;
  epoch: number;
  isPlayerReady: boolean;
  hasInitialSync: boolean;
  currentVideoId: string | null;
  currentTime: number;
  isPlaying: boolean;
}

// TypeScript のグローバル型拡張
declare global {
  interface Window {
    __WATCHROOM_TEST__?: {
      p2p?: {
        isConnected: boolean;
        isDataStreamReady: boolean;
        memberCount: number;
        myMemberId: string | null;
      };
      sync?: WatchRoomTestSyncState;
    };
  }
}
