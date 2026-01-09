/**
 * Heartbeat Protocol
 *
 * 【責務】
 * - 権限者（Authority）による定期的な状態ブロードキャスト
 * - フォロワーの継続的な同期維持
 * - パケットロス検出（シーケンス番号）
 *
 * 【設計根拠】
 * - RTP/RTCP RFC 3550: Sender Reportパターン
 * - 5秒間隔で状態をブロードキャスト
 * - wallClockAtTimeで正確な時刻補正を可能に
 *
 * 【シーケンス図: ハートビート同期】
 * ```
 * Authority                      Followers
 *     |                              |
 *     |-- HEARTBEAT (seq=1) -------->|
 *     |   {                          |
 *     |     videoId,                 |
 *     |     currentTime,             |
 *     |     isPlaying,               |
 *     |     playbackRate,            |
 *     |     wallClockAtTime,  -------|--→ [時刻補正の基準]
 *     |     epoch,                   |
 *     |     heartbeatSequence        |
 *     |   }                          |
 *     |                              |
 *     |                              | [時間補正]
 *     |                              | elapsed = now - wallClockAtTime
 *     |                              | adjusted = currentTime + elapsed * rate
 *     |                              |
 *     |                              | [ドリフト判定]
 *     |                              | localTime = player.getCurrentTime()
 *     |                              | drift = |adjusted - localTime|
 *     |                              | if drift > SYNC_THRESHOLD (2秒)
 *     |                              |   → player.seekTo(adjusted)
 *     |                              |
 *     |-- HEARTBEAT (seq=2) -------->| (5秒後)
 *     |   ...                        |
 *     |                              |
 *     | [seq gap検出]                |
 *     | if seq=4 after seq=2         |
 *     |   → seq=3 was lost           |
 * ```
 */

import type { ClockManager } from '../core/ClockManager';
import type { NetworkManager } from '../core/NetworkManager';
import type { PlayerController } from '../core/PlayerController';
import type { HeartbeatMessage } from '@/types/message';
import { TIMING_CONSTANTS, type PlaybackState } from '../types';

/**
 * HeartbeatProtocolの設定
 */
export interface HeartbeatProtocolConfig {
  /** ユーザーID */
  userId: string;

  /** 現在のビデオID取得関数 */
  getCurrentVideoId: () => string | null;

  /** 制御権限取得関数 */
  hasControlPermission: () => boolean;

  /** メッセージフィールド生成関数 */
  createMessageFields: (senderId: string) => {
    senderId: string;
    timestamp: number;
    logicalClock: number;
    vectorClock: Record<string, number>;
    sequenceNumber: number;
    viewNumber: number;
  };

  /** 同期コールバック（フォロワー用） */
  onSyncNeeded?: (state: PlaybackState) => void;

  /** Authority喪失コールバック（heartbeatタイムアウト時） */
  onAuthorityLost?: () => void;

  /** playbackState更新コールバック（JoinOverlay表示中でも最新状態を維持するため） */
  onPlaybackStateUpdate?: (state: PlaybackState) => void;
}

/**
 * Heartbeat Protocol クラス
 *
 * 権限者が定期的に状態をブロードキャストし、
 * フォロワーが継続的に同期を維持するプロトコル。
 */
export class HeartbeatProtocol {
  /** ネットワーク管理 */
  private networkManager: NetworkManager;

  /** 時刻管理 */
  private clockManager: ClockManager;

  /** プレイヤーコントローラー */
  private playerController: PlayerController;

  /** 設定 */
  private config: HeartbeatProtocolConfig;

  /** ハートビートインターバルID */
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** ハートビートシーケンス番号 */
  private heartbeatSequence: number = 0;

  /** 最後に受信したシーケンス番号（ロス検出用） */
  private lastReceivedSequence: number = 0;

  /** 初期同期完了フラグ（フォロワー用） */
  private hasInitialSync = false;

  /** 最後にheartbeatを受信した時刻 */
  private lastHeartbeatReceived = 0;

  /** heartbeatタイムアウト監視タイマーID */
  private heartbeatTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** heartbeatタイムアウト監視中かどうか */
  private isWatchingHeartbeat = false;

  /** イベントリスナー解除関数 */
  private unsubscribeHeartbeat: (() => void) | null = null;

  /**
   * コンストラクタ
   */
  constructor(
    networkManager: NetworkManager,
    clockManager: ClockManager,
    playerController: PlayerController,
    config: HeartbeatProtocolConfig
  ) {
    this.networkManager = networkManager;
    this.clockManager = clockManager;
    this.playerController = playerController;
    this.config = config;

    // Heartbeat受信をリッスン（解除関数を保存）
    this.unsubscribeHeartbeat = this.networkManager.on('heartbeat', this.handleHeartbeat.bind(this));
  }

  // ============================================================
  // ハートビート送信（Authority側）
  // ============================================================

  /**
   * ハートビート送信を開始
   *
   * 権限者のみが呼び出す。
   * 5秒間隔で現在の再生状態をブロードキャスト。
   */
  start(): void {
    // 既に開始している場合は何もしない
    if (this.intervalId) {
      return;
    }

    console.log('[HeartbeatProtocol] Starting heartbeat');

    // 即座に最初のハートビートを送信
    this.sendHeartbeat();

    // 定期送信を開始
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, TIMING_CONSTANTS.HEARTBEAT_INTERVAL);
  }

  /**
   * ハートビート送信を停止
   */
  stop(): void {
    if (this.intervalId) {
      console.log('[HeartbeatProtocol] Stopping heartbeat');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * ハートビートメッセージを送信
   */
  private sendHeartbeat(): void {
    // プレイヤー未準備なら送信しない
    if (!this.playerController.isPlayerReady()) {
      return;
    }

    // ビデオなしなら送信しない
    const videoId = this.config.getCurrentVideoId();
    if (!videoId) {
      return;
    }

    // 権限がなければ送信しない
    if (!this.config.hasControlPermission()) {
      return;
    }

    const now = Date.now();
    this.heartbeatSequence++;

    const message: HeartbeatMessage = {
      type: 'heartbeat',
      payload: {
        videoId,
        currentTime: this.playerController.getCurrentTime(),
        isPlaying: this.playerController.isPlayerPlaying(),
        playbackRate: this.playerController.getPlaybackRate(),
        wallClockAtTime: now,
        epoch: this.clockManager.getEpoch(),
        memberCount: 0, // 現在未使用（quorum detection用に予約）
        heartbeatSequence: this.heartbeatSequence,
      },
      ...this.config.createMessageFields(this.config.userId),
    };

    this.networkManager.sendHeartbeat(message);
  }

  // ============================================================
  // ハートビート受信（Follower側）
  // ============================================================

  /**
   * ハートビートを受信し、同期を維持
   *
   * @param message - 受信したHeartbeat
   *
   * 【処理フロー】
   * 1. 自分のハートビートは無視
   * 2. 自分がハートビート送信中なら無視（Authority役割中）
   * 3. タイムアウト監視を開始/リセット
   * 4. 時刻補正を計算
   * 5. playbackStateを更新（コールバック経由、JoinOverlay用）
   * 6. 初期同期完了済みならドリフト判定＆シーク
   *
   * 【全員操作可能モード対応】
   * hasControlPermissionではなくisRunning()でチェックすることで、
   * 「全員操作可能」モードでも正しく同期される。
   * - ハートビート送信中の人: 他者のハートビートを無視
   * - それ以外の人: 他者のハートビートで同期
   */
  private handleHeartbeat(message: HeartbeatMessage): void {
    // 自分のハートビートは無視
    if (message.senderId === this.config.userId) {
      return;
    }

    // 自分がハートビート送信中なら無視（Authority役割中）
    // 【重要】hasControlPermissionではなくisRunning()でチェック
    // これにより「全員操作可能」モードでも、実際にハートビートを送信している人以外は同期を受ける
    if (this.isRunning()) {
      return;
    }

    // heartbeat受信時刻を記録
    this.lastHeartbeatReceived = Date.now();

    // 初回heartbeat受信時にタイムアウト監視を開始
    if (!this.isWatchingHeartbeat) {
      this.isWatchingHeartbeat = true;
      console.log('[HeartbeatProtocol] Starting heartbeat timeout watch');
      this.resetHeartbeatTimeout();
    } else {
      // 既に監視中ならタイマーをリセット
      this.resetHeartbeatTimeout();
    }

    // パケットロス検出
    this.detectPacketLoss(message.payload.heartbeatSequence);

    // エポックを更新
    if (message.payload.epoch) {
      this.clockManager.updateEpoch(message.payload.epoch);
    }

    // 時刻補正を計算
    const now = Date.now();
    const wallClockAtTime = message.payload.wallClockAtTime || message.timestamp;
    const elapsedMs = now - wallClockAtTime;
    const elapsedSeconds = Math.max(0, elapsedMs / 1000);

    let adjustedTime = message.payload.currentTime;
    if (message.payload.isPlaying) {
      adjustedTime += elapsedSeconds * message.payload.playbackRate;
    }

    // playbackStateを更新（JoinOverlay表示中でも最新状態を維持するため）
    const playbackState: PlaybackState = {
      currentTime: adjustedTime,
      isPlaying: message.payload.isPlaying,
      playbackRate: message.payload.playbackRate,
      lastUpdated: now,
    };
    this.config.onPlaybackStateUpdate?.(playbackState);

    // 初期同期未完了ならプレイヤー同期はスキップ（JoinOverlay表示中）
    if (!this.hasInitialSync) {
      return;
    }

    // ドリフト判定
    if (this.playerController.isPlayerReady()) {
      const localTime = this.playerController.getCurrentTime();
      const drift = Math.abs(localTime - adjustedTime);

      // 閾値を超えたらシーク
      if (drift > TIMING_CONSTANTS.SYNC_THRESHOLD) {
        console.log(`[HeartbeatProtocol] Drift detected: ${drift.toFixed(2)}s, syncing to ${adjustedTime.toFixed(2)}s`);

        // コールバックで同期を通知
        this.config.onSyncNeeded?.(playbackState);
      }
    }
  }

  /**
   * パケットロスを検出
   *
   * @param sequence - 受信したシーケンス番号
   */
  private detectPacketLoss(sequence: number): void {
    if (this.lastReceivedSequence === 0) {
      // 初回受信
      this.lastReceivedSequence = sequence;
      return;
    }

    const expectedSequence = this.lastReceivedSequence + 1;
    if (sequence !== expectedSequence && sequence > this.lastReceivedSequence) {
      const lostCount = sequence - this.lastReceivedSequence - 1;
      console.warn(`[HeartbeatProtocol] Packet loss detected: ${lostCount} heartbeat(s) lost`);
    }

    this.lastReceivedSequence = sequence;
  }

  // ============================================================
  // タイムアウト監視
  // ============================================================

  /**
   * heartbeatタイムアウトタイマーをリセット
   *
   * heartbeatを受信するたびに呼び出し、タイマーをリセット。
   * 15秒間heartbeatがなければonAuthorityLostコールバックを発火。
   */
  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
    }

    this.heartbeatTimeoutId = setTimeout(() => {
      console.log('[HeartbeatProtocol] Authority heartbeat timeout detected');
      this.isWatchingHeartbeat = false;
      this.config.onAuthorityLost?.();
    }, TIMING_CONSTANTS.HEARTBEAT_TIMEOUT);
  }

  /**
   * heartbeatタイムアウト監視を停止
   */
  stopWatchingHeartbeat(): void {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
    this.isWatchingHeartbeat = false;
  }

  /**
   * 最後にheartbeatを受信した時刻を取得
   */
  getLastHeartbeatTime(): number {
    return this.lastHeartbeatReceived;
  }

  // ============================================================
  // 状態管理
  // ============================================================

  /**
   * 初期同期完了を設定
   *
   * State Request Protocolで初期同期が完了した後に呼び出す。
   */
  setInitialSyncComplete(): void {
    this.hasInitialSync = true;
  }

  /**
   * 初期同期完了状態を取得
   */
  isInitialSyncComplete(): boolean {
    return this.hasInitialSync;
  }

  /**
   * ハートビートが実行中かどうか
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  // ============================================================
  // クリーンアップ
  // ============================================================

  /**
   * リソースを解放
   */
  dispose(): void {
    this.stop();
    this.stopWatchingHeartbeat();

    // イベントリスナーを解除
    if (this.unsubscribeHeartbeat) {
      this.unsubscribeHeartbeat();
      this.unsubscribeHeartbeat = null;
    }

    this.hasInitialSync = false;
    this.heartbeatSequence = 0;
    this.lastReceivedSequence = 0;
    this.lastHeartbeatReceived = 0;
  }
}
