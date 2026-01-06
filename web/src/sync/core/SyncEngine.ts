/**
 * 同期エンジン（メインコーディネーター）
 *
 * 【責務】
 * - 全コンポーネント（PlayerController, NetworkManager, ClockManager）の調整
 * - プロトコル（StateRequestProtocol, HeartbeatProtocol）の管理
 * - useSyncExternalStore用のsubscribe/getSnapshot提供
 * - ページビジビリティ対応
 *
 * 【アーキテクチャ】
 * ```
 * +------------------------------------------------------------------+
 * |                         SyncEngine                               |
 * |  +------------------+  +------------------+  +----------------+  |
 * |  | PlayerController |  | NetworkManager   |  | ClockManager   |  |
 * |  | - YouTube操作    |  | - P2P送受信      |  | - 論理時刻     |  |
 * |  +------------------+  +------------------+  +----------------+  |
 * |                                                                  |
 * |  +---------------------------+  +---------------------------+   |
 * |  | StateRequestProtocol      |  | HeartbeatProtocol         |   |
 * |  | - Late Joiner同期         |  | - 定期ブロードキャスト    |   |
 * |  +---------------------------+  +---------------------------+   |
 * +------------------------------------------------------------------+
 *                    ↑ useSyncExternalStore で購読
 *                    |
 *               useVideoSync (React Hook)
 * ```
 *
 * 【状態遷移】
 * ```
 * disconnected → initializing → ready → requesting_state → synced ⇄ authority
 * ```
 */

import { EventEmitter } from './EventEmitter';
import { PlayerController } from './PlayerController';
import { NetworkManager } from './NetworkManager';
import { ClockManager } from './ClockManager';
import { StateRequestProtocol } from '../protocols/StateRequestProtocol';
import { HeartbeatProtocol } from '../protocols/HeartbeatProtocol';
import type { YouTubePlayer } from '@/types/youtube';
import type {
  SyncMessage,
  DataStreamMessage,
} from '@/types/message';
import {
  type SyncEngineConfig,
  type SyncSnapshot,
  type SyncStatus,
  type PlaybackState,
  type SyncEngineEventType,
  DEFAULT_SYNC_SNAPSHOT,
  TIMING_CONSTANTS,
} from '../types';
import { useRoomStore } from '@/stores/roomStore';

/**
 * SyncEngineのイベントデータ
 */
interface SyncEngineEventData {
  statusChange: SyncStatus;
  snapshotChange: SyncSnapshot;
  error: Error;
}

/**
 * 同期エンジンクラス
 *
 * 再生同期システムの中核。
 * 全てのコンポーネントを統合し、一貫した同期体験を提供。
 */
export class SyncEngine extends EventEmitter<SyncEngineEventType, SyncEngineEventData> {
  /** プレイヤーコントローラー */
  private playerController: PlayerController;

  /** ネットワーク管理 */
  private networkManager: NetworkManager;

  /** 時刻管理 */
  private clockManager: ClockManager;

  /** State Requestプロトコル */
  private stateRequestProtocol: StateRequestProtocol;

  /** Heartbeatプロトコル */
  private heartbeatProtocol: HeartbeatProtocol;

  /** 設定 */
  private config: SyncEngineConfig;

  /** 現在のスナップショット */
  private snapshot: SyncSnapshot = { ...DEFAULT_SYNC_SNAPSHOT };

  /** 購読者（useSyncExternalStore用） */
  private subscribers = new Set<() => void>();

  /** 初期同期完了フラグ */
  private hasInitialSync = false;

  /** 保留中の初期状態（プレイヤー準備前に受信した場合） */
  private pendingInitialState: PlaybackState | null = null;

  /** ページ非表示前の再生状態 */
  private wasPlayingBeforeHidden = false;

  /** クリーンアップハンドラ */
  private cleanupHandlers: Array<() => void> = [];

  /** 現在のビデオID */
  private currentVideoId: string | null = null;

  /** 制御権限 */
  private hasControlPermission = false;

  /**
   * コンストラクタ
   *
   * @param config - 設定オブジェクト
   */
  constructor(config: SyncEngineConfig) {
    super();
    this.config = config;
    this.currentVideoId = config.videoId;

    // ClockManager初期化
    this.clockManager = new ClockManager({
      localId: config.userId,
    });

    // NetworkManager初期化
    this.networkManager = new NetworkManager({
      sendMessage: config.sendMessage,
    });

    // PlayerController初期化
    this.playerController = new PlayerController({
      elementId: config.elementId,
      onMutedChange: (isMuted) => {
        this.updateSnapshot({ isMuted });
        config.onMutedChange?.(isMuted);
      },
    });

    // StateRequestProtocol初期化
    this.stateRequestProtocol = new StateRequestProtocol(
      this.networkManager,
      this.clockManager,
      this.playerController,
      {
        userId: config.userId,
        getCurrentVideoId: () => this.currentVideoId,
        hasControlPermission: () => this.hasControlPermission,
        createMessageFields: config.createMessageFields,
      }
    );

    // HeartbeatProtocol初期化
    this.heartbeatProtocol = new HeartbeatProtocol(
      this.networkManager,
      this.clockManager,
      this.playerController,
      {
        userId: config.userId,
        getCurrentVideoId: () => this.currentVideoId,
        hasControlPermission: () => this.hasControlPermission,
        createMessageFields: config.createMessageFields,
        onSyncNeeded: (state) => this.playerController.syncToState(state),
      }
    );

    // イベントハンドラ設定
    this.setupEventHandlers();

    // ページビジビリティ対応
    this.setupVisibilityHandler();
  }

  // ============================================================
  // 初期化
  // ============================================================

  /**
   * 同期エンジンを初期化
   *
   * @param videoId - 初期ビデオID
   *
   * 【処理フロー】
   * 1. 状態を'initializing'に更新
   * 2. プレイヤーを初期化
   * 3. 状態を'ready'に更新
   */
  async initialize(videoId: string): Promise<void> {
    console.log('[SyncEngine] Initializing with video:', videoId);

    this.currentVideoId = videoId;
    this.updateSnapshot({
      status: 'initializing',
      currentVideoId: videoId,
    });

    try {
      await this.playerController.initialize(videoId);
      // PlayerControllerの'ready'イベントで状態更新される
    } catch (error) {
      console.error('[SyncEngine] Initialization failed:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * イベントハンドラを設定
   */
  private setupEventHandlers(): void {
    // プレイヤー準備完了
    const unsubReady = this.playerController.on('ready', () => {
      console.log('[SyncEngine] Player ready');
      this.updateSnapshot({
        status: 'ready',
        isPlayerReady: true,
      });

      // 保留中の初期状態があれば適用
      if (this.pendingInitialState && !this.hasInitialSync) {
        console.log('[SyncEngine] Applying pending initial state');
        this.playerController.syncToState(this.pendingInitialState, true);
        this.hasInitialSync = true;
        this.heartbeatProtocol.setInitialSyncComplete();
        this.updateSnapshot({
          status: this.hasControlPermission ? 'authority' : 'synced',
          hasInitialSync: true,
        });
        this.pendingInitialState = null;
      }

      // E2Eテスト用の状態を更新
      this.updateTestState();
    });
    this.cleanupHandlers.push(unsubReady);

    // プレイヤー状態変更
    const unsubStateChange = this.playerController.on('stateChange', () => {
      this.updateSnapshot({
        currentTime: this.playerController.getCurrentTime(),
        isPlaying: this.playerController.isPlayerPlaying(),
        playbackRate: this.playerController.getPlaybackRate(),
      });
      this.updateTestState();
    });
    this.cleanupHandlers.push(unsubStateChange);

    // Syncメッセージ受信
    const unsubSync = this.networkManager.on('sync', (message) => {
      this.handleSyncMessage(message);
    });
    this.cleanupHandlers.push(unsubSync);
  }

  /**
   * ページビジビリティハンドラを設定
   *
   * 【ページビジビリティ対応】
   * モバイルでのタブ切り替え/アプリバックグラウンド時の対応
   */
  private setupVisibilityHandler(): void {
    const handler = () => {
      if (!this.playerController.isPlayerReady()) return;

      if (document.hidden) {
        // ページ非表示: 再生状態を保存
        this.wasPlayingBeforeHidden = this.playerController.isPlayerPlaying();
        console.log('[SyncEngine] Page hidden, was playing:', this.wasPlayingBeforeHidden);
      } else if (this.wasPlayingBeforeHidden) {
        // ページ復帰: 再生を再開
        console.log('[SyncEngine] Page visible, resuming playback');
        setTimeout(() => {
          this.playerController.play();
        }, TIMING_CONSTANTS.VISIBILITY_RESUME_DELAY);
      }
    };

    document.addEventListener('visibilitychange', handler);
    this.cleanupHandlers.push(() => {
      document.removeEventListener('visibilitychange', handler);
    });
  }

  // ============================================================
  // 初期同期（Late Joiner）
  // ============================================================

  /**
   * 初期同期を開始
   *
   * Late Joinerが部屋に参加した時に呼び出す。
   * State Request Protocolで現在の再生状態を取得。
   *
   * @param fallbackState - State Request失敗時のフォールバック状態
   */
  async startInitialSync(fallbackState?: PlaybackState): Promise<void> {
    if (this.hasInitialSync) {
      console.log('[SyncEngine] Already synced');
      return;
    }

    console.log('[SyncEngine] Starting initial sync');
    this.updateSnapshot({ status: 'requesting_state' });

    // State Requestを送信
    const state = await this.stateRequestProtocol.requestState();

    if (state) {
      // 応答あり: 同期実行
      console.log('[SyncEngine] Got state response, syncing');
      if (this.playerController.isPlayerReady()) {
        this.playerController.syncToState(state, true);
        this.hasInitialSync = true;
        this.heartbeatProtocol.setInitialSyncComplete();
        this.updateSnapshot({
          status: this.hasControlPermission ? 'authority' : 'synced',
          hasInitialSync: true,
        });
      } else {
        // プレイヤー未準備: 保留
        console.log('[SyncEngine] Player not ready, storing pending state');
        this.pendingInitialState = state;
      }
    } else if (fallbackState && fallbackState.lastUpdated > 0) {
      // 応答なし、フォールバック状態あり
      console.log('[SyncEngine] No response, using fallback state');
      if (this.playerController.isPlayerReady()) {
        this.playerController.syncToState(fallbackState, true);
        this.hasInitialSync = true;
        this.heartbeatProtocol.setInitialSyncComplete();
        this.updateSnapshot({
          status: this.hasControlPermission ? 'authority' : 'synced',
          hasInitialSync: true,
        });
      } else {
        this.pendingInitialState = fallbackState;
      }
    } else {
      // 応答なし、フォールバックなし（最初のユーザー）
      console.log('[SyncEngine] First user, no sync needed');
      this.hasInitialSync = true;
      this.heartbeatProtocol.setInitialSyncComplete();
      this.updateSnapshot({
        status: this.hasControlPermission ? 'authority' : 'synced',
        hasInitialSync: true,
      });
    }

    this.updateTestState();
  }

  // ============================================================
  // ハートビート管理
  // ============================================================

  /**
   * ハートビート送信を開始
   */
  startHeartbeat(): void {
    this.heartbeatProtocol.start();
  }

  /**
   * ハートビート送信を停止
   */
  stopHeartbeat(): void {
    this.heartbeatProtocol.stop();
  }

  // ============================================================
  // プレイヤー操作（権限者用）
  // ============================================================

  /**
   * 再生開始
   */
  play(): void {
    if (!this.hasControlPermission) return;
    this.playerController.play();
    this.sendSyncMessage('play', {
      currentTime: this.playerController.getCurrentTime(),
    });
  }

  /**
   * 一時停止
   */
  pause(): void {
    if (!this.hasControlPermission) return;
    this.playerController.pause();
    this.sendSyncMessage('pause', {
      currentTime: this.playerController.getCurrentTime(),
    });
  }

  /**
   * シーク
   *
   * @param time - シーク先時間（秒）
   */
  seek(time: number): void {
    if (!this.hasControlPermission) return;
    this.playerController.seek(time);
    this.sendSyncMessage('seek', {
      currentTime: time,
    });
  }

  /**
   * 再生速度設定
   *
   * @param rate - 再生速度
   */
  setPlaybackRate(rate: number): void {
    if (!this.hasControlPermission) return;
    this.playerController.setPlaybackRate(rate);
    this.sendSyncMessage('rate', {
      playbackRate: rate,
    });
  }

  /**
   * ビデオ読み込み
   *
   * @param videoId - YouTube動画ID
   * @param title - 動画タイトル
   * @param thumbnail - サムネイルURL
   */
  loadVideo(videoId: string, title?: string, thumbnail?: string): void {
    if (!this.hasControlPermission) return;
    this.currentVideoId = videoId;
    this.playerController.loadVideo(videoId);
    this.clockManager.incrementEpoch();
    this.sendSyncMessage('video', {
      videoId,
      title,
      thumbnail,
    });
    this.updateSnapshot({ currentVideoId: videoId });
  }

  /**
   * Syncメッセージを送信
   */
  private sendSyncMessage(
    action: SyncMessage['action'],
    payload: SyncMessage['payload']
  ): void {
    const now = Date.now();
    const message: SyncMessage = {
      type: 'sync',
      action,
      payload: {
        ...payload,
        wallClockAtTime: now,
      },
      ...this.config.createMessageFields(this.config.userId),
    };
    this.networkManager.sendSync(message);
  }

  // ============================================================
  // 外部状態への同期
  // ============================================================

  /**
   * 外部の再生状態に同期
   *
   * Zustandストアの状態変更時に呼び出される。
   *
   * @param state - 同期先の再生状態
   */
  syncToPlaybackState(state: PlaybackState): void {
    if (!this.hasInitialSync) return;
    if (!this.playerController.isPlayerReady()) return;

    this.playerController.syncToState(state);
  }

  /**
   * 遅延同期を実行
   *
   * 【用途】
   * JoinOverlay表示中にユーザー操作を待っていた場合、
   * ユーザー操作後に最新の再生状態に同期する。
   *
   * 【処理フロー】
   * 1. 現在のplaybackStateをZustandストアから取得
   * 2. lastUpdatedからの経過時間を計算
   * 3. 再生中の場合、経過時間×再生速度を加算
   * 4. PlayerControllerでシーク＆再生
   *
   * 【タイムライン例】
   * ```
   * T1: State Response受信、playbackState更新 (currentTime=10秒)
   * T1〜T2: Heartbeat受信で playbackState が更新される
   * T2: ユーザーが「視聴開始」をクリック
   *     └─ このメソッドが呼ばれる
   *     └─ lastUpdated からの経過時間を計算
   *     └─ currentTime + elapsed * playbackRate でシーク先を算出
   *     └─ プレイヤーを最新位置に同期
   * ```
   */
  performDeferredSync(): void {
    const { playbackState } = useRoomStore.getState();

    // playbackStateが一度も更新されていない場合はスキップ
    if (playbackState.lastUpdated === 0) {
      console.log('[SyncEngine] performDeferredSync: No playback state yet');
      return;
    }

    const now = Date.now();
    const elapsedMs = now - playbackState.lastUpdated;
    const elapsedSeconds = Math.max(0, elapsedMs / 1000);

    // 再生中の場合は経過時間を加算、一時停止中はそのまま
    const targetTime = playbackState.isPlaying
      ? playbackState.currentTime + elapsedSeconds * playbackState.playbackRate
      : playbackState.currentTime;

    console.log('[SyncEngine] performDeferredSync:', {
      originalTime: playbackState.currentTime,
      elapsedSeconds,
      playbackRate: playbackState.playbackRate,
      isPlaying: playbackState.isPlaying,
      targetTime,
    });

    // プレイヤーを最新位置に同期（isInitialSync=falseで呼ぶことで再生も行う）
    this.playerController.syncToState({
      currentTime: targetTime,
      isPlaying: playbackState.isPlaying,
      playbackRate: playbackState.playbackRate,
      lastUpdated: now,
    }, false);

    // 初期同期が完了していなければ完了とする
    if (!this.hasInitialSync) {
      this.hasInitialSync = true;
      this.heartbeatProtocol.setInitialSyncComplete();
      this.updateSnapshot({
        status: this.hasControlPermission ? 'authority' : 'synced',
        hasInitialSync: true,
      });
    }
  }

  // ============================================================
  // メッセージ受信
  // ============================================================

  /**
   * 受信メッセージを処理
   *
   * useSkyWayから呼び出される。
   *
   * @param message - 受信メッセージ
   */
  handleMessage(message: DataStreamMessage): void {
    this.networkManager.handleMessage(message);
  }

  /**
   * Syncメッセージを処理
   *
   * 【全員操作可能モード対応】
   * hasControlPermissionではなくheartbeatProtocol.isRunning()でチェック。
   * - ハートビート送信中の人: 他者のSyncメッセージを無視
   * - それ以外の人: 他者のSyncメッセージで同期
   * これにより「全員操作可能」モードでも正しく同期される。
   */
  private handleSyncMessage(message: SyncMessage): void {
    // 自分のメッセージは無視
    if (message.senderId === this.config.userId) return;

    // ハートビート送信中（Authority役割中）は他者のSyncメッセージを無視
    // 【重要】hasControlPermissionではなくisRunning()でチェック
    if (this.heartbeatProtocol.isRunning()) return;

    // 論理時刻を更新
    this.clockManager.updateLogicalClock(message.logicalClock);

    // 状態を同期
    const now = Date.now();
    const wallClockAtTime = message.payload.wallClockAtTime || message.timestamp;
    const elapsedMs = now - wallClockAtTime;
    const elapsedSeconds = Math.max(0, elapsedMs / 1000);

    let currentTime = message.payload.currentTime ?? this.playerController.getCurrentTime();
    let isPlaying = this.playerController.isPlayerPlaying();
    const playbackRate = message.payload.playbackRate ?? this.playerController.getPlaybackRate();

    switch (message.action) {
      case 'play':
        currentTime = (message.payload.currentTime ?? 0) + elapsedSeconds * playbackRate;
        isPlaying = true;
        break;
      case 'pause':
        currentTime = message.payload.currentTime ?? currentTime;
        isPlaying = false;
        break;
      case 'seek':
        currentTime = message.payload.currentTime ?? currentTime;
        break;
      case 'rate':
        // playbackRateは上で設定済み
        break;
      case 'video':
        if (message.payload.videoId) {
          this.currentVideoId = message.payload.videoId;
          this.playerController.loadVideo(message.payload.videoId);
        }
        return;
    }

    this.playerController.syncToState({
      currentTime,
      isPlaying,
      playbackRate,
      lastUpdated: now,
    });
  }

  // ============================================================
  // 権限管理
  // ============================================================

  /**
   * 制御権限を設定
   *
   * @param hasPermission - 権限の有無
   */
  setControlPermission(hasPermission: boolean): void {
    const wasAuthority = this.hasControlPermission;
    this.hasControlPermission = hasPermission;

    // 権限が付与された場合
    if (hasPermission && !wasAuthority) {
      this.updateSnapshot({ status: 'authority' });
      this.startHeartbeat();
    }
    // 権限が剥奪された場合
    else if (!hasPermission && wasAuthority) {
      this.updateSnapshot({ status: 'synced' });
      this.stopHeartbeat();
    }
  }

  // ============================================================
  // 状態取得
  // ============================================================

  /**
   * YouTubeプレイヤーインスタンスを取得
   */
  getPlayer(): YouTubePlayer | null {
    return this.playerController.getPlayer();
  }

  /**
   * プレイヤー準備完了かどうか
   */
  isReady(): boolean {
    return this.playerController.isPlayerReady();
  }

  /**
   * 初期同期完了かどうか
   */
  isInitialSyncComplete(): boolean {
    return this.hasInitialSync;
  }

  /**
   * 現在のエポックを取得
   */
  getEpoch(): number {
    return this.clockManager.getEpoch();
  }

  /**
   * ユーザー操作済みフラグを設定
   *
   * 【用途】
   * JoinOverlay（視聴開始ボタン）のクリック時に呼び出し、
   * 音声付き自動再生を許可する。
   *
   * 【重要】
   * このメソッドはユーザーのクリックイベントハンドラ内から
   * 同期的に呼び出す必要がある。
   */
  setUserInteraction(): void {
    this.playerController.setUserInteraction();
  }

  /**
   * ユーザー操作済みかどうかを取得
   */
  hasUserInteraction(): boolean {
    return this.playerController.hasUserInteractionFlag();
  }

  // ============================================================
  // useSyncExternalStore インターフェース
  // ============================================================

  /**
   * 状態変更を購読
   *
   * @param callback - 変更通知コールバック
   * @returns unsubscribe関数
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * 現在の状態スナップショットを取得
   */
  getSnapshot(): SyncSnapshot {
    return this.snapshot;
  }

  /**
   * スナップショットを更新
   */
  private updateSnapshot(partial: Partial<SyncSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.notifySubscribers();

    // ステータス変更イベント
    if (partial.status) {
      this.emit('statusChange', partial.status);
    }
  }

  /**
   * 購読者に通知
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  // ============================================================
  // E2Eテスト用
  // ============================================================

  /**
   * テスト観測用の状態を更新
   */
  private updateTestState(): void {
    if (typeof window !== 'undefined') {
      window.__WATCHROOM_TEST__ = window.__WATCHROOM_TEST__ || {};
      window.__WATCHROOM_TEST__.sync = {
        status: this.snapshot.status,
        epoch: this.clockManager.getEpoch(),
        isPlayerReady: this.playerController.isPlayerReady(),
        hasInitialSync: this.hasInitialSync,
        currentVideoId: this.currentVideoId,
        currentTime: this.playerController.getCurrentTime(),
        isPlaying: this.playerController.isPlayerPlaying(),
      };
    }
  }

  // ============================================================
  // クリーンアップ
  // ============================================================

  /**
   * リソースを解放
   */
  dispose(): void {
    console.log('[SyncEngine] Disposing');

    // クリーンアップハンドラを実行
    this.cleanupHandlers.forEach((cleanup) => cleanup());
    this.cleanupHandlers = [];

    // 各コンポーネントを解放
    this.heartbeatProtocol.dispose();
    this.stateRequestProtocol.dispose();
    this.networkManager.dispose();
    this.playerController.dispose();
    this.clockManager.reset();

    // 状態をリセット
    this.snapshot = { ...DEFAULT_SYNC_SNAPSHOT };
    this.subscribers.clear();
    this.hasInitialSync = false;
    this.pendingInitialState = null;
    this.currentVideoId = null;
    this.hasControlPermission = false;

    // イベントリスナーをクリア
    this.removeAllListeners();
  }
}
