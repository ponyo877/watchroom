/**
 * YouTubeプレイヤーコントローラー
 *
 * 【責務】
 * - YouTubeプレイヤーのライフサイクル管理
 * - プレイヤー操作（play, pause, seek, rate, loadVideo）
 * - 外部状態への同期（syncToState）
 * - 自動再生ポリシー対応
 * - useSyncExternalStore用のsubscribe/getSnapshot
 *
 * 【設計根拠】
 * - YouTube IFrame APIをカプセル化してテスト容易性を向上
 * - イベントベースで状態変化を通知（useEffect削減）
 * - コンストラクタでイベントリスナーを登録（ライフサイクル管理）
 *
 * 【自動再生ポリシー対応】
 * ```
 * [Late Joiner参加時]
 *   └─ ユーザー操作の有無を確認
 *      ├─ 操作あり → 通常再生（音声あり）
 *      └─ 操作なし → ミュートして再生
 *         └─ wasMutedForAutoplay = true
 *
 * [ユーザー操作検出時 (click/touchstart)]
 *   └─ wasMutedForAutoplay == true
 *      └─ player.unMute() → ミュート解除
 *      └─ emit('muteChange', false) → UIに通知
 * ```
 */

import { EventEmitter } from './EventEmitter';
import type { YouTubePlayer, YouTubePlayerEvent } from '@/types/youtube';
import { createPlayer, isPlaying as checkIsPlaying } from '@/lib/youtube';
import {
  type PlayerEventType,
  type PlayerEventData,
  type PlaybackState,
  type PlayerStateCode,
  TIMING_CONSTANTS,
  PLAYER_STATE,
} from '../types';

/**
 * PlayerControllerの設定
 */
export interface PlayerControllerConfig {
  /** プレイヤーを配置するHTML要素のID */
  elementId: string;

  /** ミュート状態変更コールバック（オプション） */
  onMutedChange?: (isMuted: boolean) => void;
}

/**
 * プレイヤーの内部状態
 */
interface PlayerState {
  isReady: boolean;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  isMuted: boolean;
  videoId: string | null;
}

/**
 * YouTubeプレイヤーコントローラークラス
 *
 * YouTube IFrame APIをラップし、同期システムに必要な機能を提供。
 * イベント駆動で状態変化を通知する。
 */
export class PlayerController extends EventEmitter<PlayerEventType, PlayerEventData> {
  /** YouTubeプレイヤーインスタンス */
  private player: YouTubePlayer | null = null;

  /** プレイヤー要素ID */
  private elementId: string;

  /** 内部状態 */
  private state: PlayerState = {
    isReady: false,
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1,
    isMuted: false,
    videoId: null,
  };

  /** ユーザー操作検出フラグ */
  private hasUserInteraction = false;

  /** 自動再生ポリシー対応でミュートしたフラグ */
  private wasMutedForAutoplay = false;

  /** 初期化中フラグ（二重初期化防止） */
  private isInitializing = false;

  /** 同期中フラグ（イベント発火抑制） */
  private isSyncing = false;

  /** クリーンアップハンドラ */
  private cleanupHandlers: Array<() => void> = [];

  /** 状態変更購読者（useSyncExternalStore用） */
  private subscribers = new Set<() => void>();

  /** 外部ミュート状態変更コールバック */
  private onMutedChange?: (isMuted: boolean) => void;

  /**
   * コンストラクタ
   *
   * @param config - 設定オブジェクト
   */
  constructor(config: PlayerControllerConfig) {
    super();
    this.elementId = config.elementId;
    this.onMutedChange = config.onMutedChange;

    // ユーザー操作追跡のイベントリスナーを登録
    this.setupUserInteractionTracking();
  }

  // ============================================================
  // 初期化
  // ============================================================

  /**
   * プレイヤーを初期化
   *
   * @param videoId - 初期ビデオID
   * @returns プレイヤー準備完了を示すPromise
   *
   * 【処理フロー】
   * 1. 二重初期化チェック
   * 2. YouTube IFrame APIでプレイヤー作成
   * 3. onReady/onStateChangeイベント登録
   * 4. 準備完了イベント発火
   */
  async initialize(videoId: string): Promise<void> {
    // 二重初期化防止
    if (this.isInitializing || this.player) {
      console.log('[PlayerController] Already initializing or initialized');
      return;
    }

    this.isInitializing = true;
    this.state.videoId = videoId;

    try {
      const player = await createPlayer(this.elementId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          enablejsapi: 1,
          playsinline: 1,
        },
        events: {
          onReady: this.handleReady.bind(this),
          onStateChange: this.handleStateChange.bind(this),
          onError: this.handleError.bind(this),
        },
      });

      this.player = player;
    } catch (error) {
      console.error('[PlayerController] Failed to initialize player:', error);
      this.isInitializing = false;
      throw error;
    }
  }

  /**
   * プレイヤー準備完了ハンドラ
   */
  private handleReady(): void {
    console.log('[PlayerController] Player ready');
    this.state.isReady = true;
    this.isInitializing = false;
    this.notifySubscribers();
    this.emit('ready');
  }

  /**
   * プレイヤー状態変更ハンドラ
   */
  private handleStateChange(event: YouTubePlayerEvent): void {
    const playerState = event.data as PlayerStateCode;
    console.log('[PlayerController] State change:', playerState);

    // 状態を更新
    this.updateInternalState();

    // 同期中は外部への通知を抑制
    if (!this.isSyncing) {
      this.emit('stateChange', playerState);
    }
  }

  /**
   * プレイヤーエラーハンドラ
   */
  private handleError(event: YouTubePlayerEvent): void {
    console.error('[PlayerController] Player error:', event.data);
    this.emit('error', event.data as number);
  }

  // ============================================================
  // ユーザー操作追跡（自動再生ポリシー対応）
  // ============================================================

  /**
   * ユーザー操作追跡を設定
   *
   * 【自動再生ポリシー】
   * モバイルブラウザではユーザー操作なしに音声付き動画を再生できない。
   * ユーザー操作を検出したら、自動再生のためにミュートした音声を解除する。
   */
  private setupUserInteractionTracking(): void {
    const handler = () => {
      this.hasUserInteraction = true;

      // 自動再生のためにミュートした場合、ユーザー操作でアンミュート
      if (this.wasMutedForAutoplay && this.player) {
        console.log('[PlayerController] Auto-unmuting after user interaction');
        this.player.unMute();
        this.wasMutedForAutoplay = false;
        this.state.isMuted = false;
        this.notifySubscribers();
        this.emit('muteChange', false);
        this.onMutedChange?.(false);
      }
    };

    window.addEventListener('click', handler);
    window.addEventListener('touchstart', handler);

    this.cleanupHandlers.push(() => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    });
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
   * 同期的に呼び出す必要がある。非同期呼び出しではブラウザが
   * ユーザー操作として認識しない。
   */
  setUserInteraction(): void {
    console.log('[PlayerController] User interaction set manually');
    this.hasUserInteraction = true;
  }

  /**
   * ユーザー操作済みかどうかを取得
   */
  hasUserInteractionFlag(): boolean {
    return this.hasUserInteraction;
  }

  // ============================================================
  // 同期操作
  // ============================================================

  /**
   * 外部状態に同期
   *
   * @param target - 同期先の再生状態
   * @param isInitialSync - 初期同期かどうか（自動再生ポリシー対応用）
   *
   * 【シーケンス図: 初期同期（Late Joiner）】
   * ```
   * syncToState(target, isInitialSync=true)
   *     │
   *     ├─ シーク（差分が閾値を超える場合）
   *     │   └─ player.seekTo(target.currentTime)
   *     │
   *     ├─ 再生状態同期
   *     │   ├─ target.isPlaying && !currentlyPlaying
   *     │   │   ├─ isInitialSync && !hasUserInteraction
   *     │   │   │   └─ 再生しない（JoinOverlayでユーザー操作を待つ）
   *     │   │   └─ hasUserInteraction
   *     │   │       └─ player.playVideo()（音声あり）
   *     │   │
   *     │   └─ !target.isPlaying && currentlyPlaying
   *     │       └─ player.pauseVideo()
   *     │
   *     └─ 再生速度同期
   *         └─ player.setPlaybackRate(target.playbackRate)
   * ```
   */
  syncToState(target: PlaybackState, isInitialSync = false): void {
    if (!this.player || !this.state.isReady) {
      console.log('[PlayerController] syncToState called but player not ready');
      return;
    }

    console.log('[PlayerController] syncToState:', {
      isInitialSync,
      targetTime: target.currentTime,
      targetIsPlaying: target.isPlaying,
      targetRate: target.playbackRate,
      hasUserInteraction: this.hasUserInteraction,
    });

    this.isSyncing = true;

    const currentTime = this.player.getCurrentTime();
    const diff = Math.abs(currentTime - target.currentTime);

    // シーク（差分が閾値を超える場合）
    if (diff > TIMING_CONSTANTS.SYNC_THRESHOLD) {
      this.player.seekTo(target.currentTime, true);
    }

    // 再生状態同期
    const currentlyPlaying = checkIsPlaying(this.player);
    if (target.isPlaying && !currentlyPlaying) {
      if (isInitialSync && !this.hasUserInteraction) {
        // 【自動再生ポリシー対応】
        // 初期同期時でユーザー操作がない場合は再生を開始しない
        // JoinOverlayでユーザーが「視聴開始」をクリックするのを待つ
        // このアプローチにより、ブラウザの自動再生ブロックを回避し、
        // 最初から音声付きで再生できる
        console.log('[PlayerController] Waiting for user interaction before playing');
      } else {
        // ユーザー操作あり：音声付きで再生開始
        this.player.playVideo();
      }
    } else if (!target.isPlaying && currentlyPlaying) {
      this.player.pauseVideo();
    }

    // 再生速度同期
    if (this.player.getPlaybackRate() !== target.playbackRate) {
      this.player.setPlaybackRate(target.playbackRate);
    }

    // 内部状態を更新
    this.updateInternalState();

    // 同期フラグを解除（少し遅延させてイベント発火を抑制）
    setTimeout(() => {
      this.isSyncing = false;
    }, TIMING_CONSTANTS.SYNC_COOLDOWN);
  }

  // ============================================================
  // プレイヤー操作
  // ============================================================

  /**
   * 再生開始
   */
  play(): void {
    if (!this.player || !this.state.isReady) return;
    this.player.playVideo();
    this.updateInternalState();
  }

  /**
   * 一時停止
   */
  pause(): void {
    if (!this.player || !this.state.isReady) return;
    this.player.pauseVideo();
    this.updateInternalState();
  }

  /**
   * シーク
   *
   * @param time - シーク先の時間（秒）
   */
  seek(time: number): void {
    if (!this.player || !this.state.isReady) return;
    this.player.seekTo(time, true);
    this.updateInternalState();
  }

  /**
   * 再生速度設定
   *
   * @param rate - 再生速度（0.25〜2.0）
   */
  setPlaybackRate(rate: number): void {
    if (!this.player || !this.state.isReady) return;
    this.player.setPlaybackRate(rate);
    this.updateInternalState();
  }

  /**
   * ビデオ読み込み
   *
   * @param videoId - YouTube動画ID
   */
  loadVideo(videoId: string): void {
    if (!this.player || !this.state.isReady) return;
    this.player.loadVideoById(videoId);
    this.state.videoId = videoId;
    this.updateInternalState();
  }

  /**
   * ミュート
   */
  mute(): void {
    if (!this.player || !this.state.isReady) return;
    this.player.mute();
    this.state.isMuted = true;
    this.notifySubscribers();
    this.emit('muteChange', true);
    this.onMutedChange?.(true);
  }

  /**
   * アンミュート
   */
  unMute(): void {
    if (!this.player || !this.state.isReady) return;
    this.player.unMute();
    this.state.isMuted = false;
    this.wasMutedForAutoplay = false;
    this.notifySubscribers();
    this.emit('muteChange', false);
    this.onMutedChange?.(false);
  }

  // ============================================================
  // 状態取得
  // ============================================================

  /**
   * プレイヤー準備完了かどうか
   */
  isPlayerReady(): boolean {
    return this.state.isReady;
  }

  /**
   * 現在再生中かどうか
   */
  isPlayerPlaying(): boolean {
    if (!this.player || !this.state.isReady) return false;
    return checkIsPlaying(this.player);
  }

  /**
   * プレイヤー状態コードを取得
   */
  getPlayerState(): PlayerStateCode {
    if (!this.player || !this.state.isReady) return PLAYER_STATE.UNSTARTED;
    return this.player.getPlayerState() as PlayerStateCode;
  }

  /**
   * 現在の再生時間を取得
   */
  getCurrentTime(): number {
    if (!this.player || !this.state.isReady) return 0;
    return this.player.getCurrentTime();
  }

  /**
   * 現在の再生速度を取得
   */
  getPlaybackRate(): number {
    if (!this.player || !this.state.isReady) return 1;
    return this.player.getPlaybackRate();
  }

  /**
   * 現在のビデオIDを取得
   */
  getVideoId(): string | null {
    return this.state.videoId;
  }

  /**
   * YouTubeプレイヤーインスタンスを取得
   * （既存コードとの互換性のため）
   */
  getPlayer(): YouTubePlayer | null {
    return this.player;
  }

  /**
   * ミュート状態を取得
   */
  isMuted(): boolean {
    return this.state.isMuted;
  }

  // ============================================================
  // useSyncExternalStore インターフェース
  // ============================================================

  /**
   * 状態変更を購読
   *
   * @param callback - 状態変更時に呼び出されるコールバック
   * @returns unsubscribe関数
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * 現在の状態スナップショットを取得
   */
  getSnapshot(): PlayerState {
    return { ...this.state };
  }

  /**
   * 購読者に通知
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  /**
   * 内部状態を更新
   */
  private updateInternalState(): void {
    if (!this.player || !this.state.isReady) return;

    this.state.currentTime = this.player.getCurrentTime();
    this.state.isPlaying = checkIsPlaying(this.player);
    this.state.playbackRate = this.player.getPlaybackRate();

    this.notifySubscribers();
  }

  // ============================================================
  // クリーンアップ
  // ============================================================

  /**
   * リソースを解放
   */
  dispose(): void {
    console.log('[PlayerController] Disposing');

    // イベントリスナーを解除
    this.cleanupHandlers.forEach((cleanup) => cleanup());
    this.cleanupHandlers = [];

    // プレイヤーを破棄
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    // 状態をリセット
    this.state = {
      isReady: false,
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
      isMuted: false,
      videoId: null,
    };

    // 購読者をクリア
    this.subscribers.clear();

    // イベントリスナーをクリア
    this.removeAllListeners();

    this.isInitializing = false;
    this.isSyncing = false;
    this.hasUserInteraction = false;
    this.wasMutedForAutoplay = false;
  }
}
