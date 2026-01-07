/**
 * State Request Protocol
 *
 * 【責務】
 * - 遅延参加者（Late Joiner）の初期状態取得
 * - NTPスタイルのRTT計算と時刻補正
 * - 複数応答からの最適選択
 *
 * 【設計根拠】
 * - NTP RFC 5905: 正確なRTT推定と時刻オフセット計算
 * - Primary-Backup Replication: コントローラー応答を優先
 *
 * 【シーケンス図: Late Joiner同期】
 * ```
 * LateJoiner              All Members            Authority
 *     |                        |                     |
 *     |-- STATE_REQUEST ------>|-------------------->|
 *     |   (t1 = now)           |                     |
 *     |                        |                     |
 *     |                        |<-- STATE_RESPONSE --|  (即座に応答)
 *     |                        |    (t2, t3, state)  |
 *     |<-- STATE_RESPONSE -----|                     |
 *     |    (controller)        |                     |
 *     |                        |                     |
 *     |<-- STATE_RESPONSE -----|                     |  (500ms遅延後)
 *     |    (non-controller)    |                     |
 *     |                        |                     |
 *     | [3秒後: タイムアウト]   |                     |
 *     |                        |                     |
 *     | [最適応答選択]         |                     |
 *     | 1. コントローラー応答を優先                   |
 *     | 2. 同優先度では responderTime 最新を選択     |
 *     |                        |                     |
 *     | [RTT計算]              |                     |
 *     | RTT = (t4-t1)-(t3-t2)  |                     |
 *     | offset = ((t2-t1)+(t3-t4))/2                 |
 *     |                        |                     |
 *     | [時間補正]             |                     |
 *     | elapsed = (t4 - wallClockAtTime) - offset   |
 *     | adjustedTime = currentTime + elapsed * rate |
 *     |                        |                     |
 *     | [プレイヤー同期]       |                     |
 *     | player.seekTo(adjustedTime)                 |
 *     | player.play() / pause()                     |
 * ```
 */

import type { ClockManager } from '../core/ClockManager';
import type { NetworkManager } from '../core/NetworkManager';
import type { PlayerController } from '../core/PlayerController';
import type {
  StateRequestMessage,
  StateResponseMessage,
} from '@/types/message';
import { TIMING_CONSTANTS, PLAYER_STATE, type PlaybackState } from '../types';
import { useRoomStore } from '@/stores/roomStore';

/**
 * StateRequestProtocolの設定
 */
export interface StateRequestProtocolConfig {
  /** ユーザーID */
  userId: string;

  /** 現在のビデオID取得関数 */
  getCurrentVideoId: () => string | null;

  /** 制御権限取得関数 */
  hasControlPermission: () => boolean;

  /**
   * 現在Authorityとして動作中かどうか（heartbeat送信中かどうか）
   * State Responseの isController フィールドに使用
   */
  isAuthority: () => boolean;

  /** メッセージフィールド生成関数 */
  createMessageFields: (senderId: string) => {
    senderId: string;
    timestamp: number;
    logicalClock: number;
    vectorClock: Record<string, number>;
    sequenceNumber: number;
    viewNumber: number;
  };
}

/**
 * State Request Protocol クラス
 *
 * Late Joiner同期プロトコルを実装。
 * NTPスタイルのタイムスタンプで正確な時刻補正を行う。
 */
export class StateRequestProtocol {
  /** ネットワーク管理 */
  private networkManager: NetworkManager;

  /** 時刻管理 */
  private clockManager: ClockManager;

  /** プレイヤーコントローラー */
  private playerController: PlayerController;

  /** 設定 */
  private config: StateRequestProtocolConfig;

  /** 保留中のリクエストID */
  private pendingRequestId: string | null = null;

  /** 収集した応答 */
  private responses: StateResponseMessage[] = [];

  /** 応答タイムアウト */
  private responseTimeout: ReturnType<typeof setTimeout> | null = null;

  /** リクエスト送信時刻（t1） */
  private requestT1: number = 0;

  /** リクエスト解決用Promise */
  private resolveRequest: ((state: PlaybackState | null) => void) | null = null;

  /**
   * 直近のState Requestでauthority（heartbeat送信中のユーザー）が応答したかどうか
   * SyncEngineがheartbeat開始を決定する際に参照する
   */
  private _authorityResponded = false;

  /**
   * コンストラクタ
   */
  constructor(
    networkManager: NetworkManager,
    clockManager: ClockManager,
    playerController: PlayerController,
    config: StateRequestProtocolConfig
  ) {
    this.networkManager = networkManager;
    this.clockManager = clockManager;
    this.playerController = playerController;
    this.config = config;

    // State Response受信をリッスン
    this.networkManager.on('stateResponse', this.handleStateResponse.bind(this));

    // State Request受信をリッスン
    this.networkManager.on('stateRequest', this.handleStateRequest.bind(this));
  }

  // ============================================================
  // State Request 送信
  // ============================================================

  /**
   * State Requestを送信し、応答を待機
   *
   * @returns 同期すべき再生状態（応答なしの場合はnull）
   *
   * 【処理フロー】
   * 1. ビデオ準備待機（UNSTARTED/BUFFERINGでない状態まで）
   * 2. State Request送信
   * 3. タイムアウトまで応答を収集
   * 4. 最適な応答を選択して時刻補正
   * 5. 補正済み再生状態を返却
   */
  async requestState(): Promise<PlaybackState | null> {
    // Reset authority flag for new request
    this._authorityResponded = false;

    // ビデオ準備待機
    await this.waitForVideoReady();

    // リクエストIDを生成
    const requestId = this.generateRequestId();
    this.pendingRequestId = requestId;
    this.responses = [];

    // t1を記録
    const t1 = Date.now();
    this.requestT1 = t1;

    // State Requestメッセージを作成・送信
    const message: StateRequestMessage = {
      type: 'state_request',
      payload: {
        requestId,
        t1,
        requesterState: {
          hasVideo: !!this.config.getCurrentVideoId(),
          videoId: this.config.getCurrentVideoId() ?? undefined,
          lastKnownEpoch: this.clockManager.getEpoch(),
        },
      },
      ...this.config.createMessageFields(this.config.userId),
    };

    console.log('[StateRequestProtocol] Sending state request:', requestId);
    await this.networkManager.sendStateRequest(message);

    // 応答待機（Promiseで結果を返す）
    return new Promise((resolve) => {
      this.resolveRequest = resolve;

      // タイムアウト設定
      this.responseTimeout = setTimeout(() => {
        this.processResponses();
      }, TIMING_CONSTANTS.STATE_RESPONSE_TIMEOUT);
    });
  }

  /**
   * ビデオ準備待機
   *
   * プレイヤーがUNSTARTED(-1)またはBUFFERING(3)でない状態になるまで待機。
   * モバイルではプレイヤー初期化が遅いため、長めにリトライ。
   */
  private waitForVideoReady(): Promise<void> {
    return new Promise((resolve) => {
      let retryCount = 0;

      const check = () => {
        const playerState = this.playerController.getPlayerState();

        // タイムアウト
        if (retryCount >= TIMING_CONSTANTS.MAX_VIDEO_READY_RETRIES) {
          console.warn('[StateRequestProtocol] Video ready timeout, proceeding anyway');
          resolve();
          return;
        }

        // UNSTARTED(-1) or BUFFERING(3) は準備中
        if (playerState === PLAYER_STATE.UNSTARTED || playerState === PLAYER_STATE.BUFFERING) {
          retryCount++;
          setTimeout(check, 100);
        } else {
          // 準備完了
          resolve();
        }
      };

      // 100ms後にチェック開始
      setTimeout(check, 100);
    });
  }

  /**
   * リクエストID生成
   */
  private generateRequestId(): string {
    return `${this.config.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ============================================================
  // State Request 受信（応答側）
  // ============================================================

  /**
   * State Requestを受信し、応答を送信
   *
   * @param message - 受信したState Request
   *
   * 【応答優先度制御】
   * - コントローラー: 即座に応答
   * - 非コントローラー: 500ms遅延して応答（コントローラー応答を優先させる）
   */
  private handleStateRequest(message: StateRequestMessage): void {
    // プレイヤー未準備なら応答しない
    if (!this.playerController.isPlayerReady()) return;

    // ビデオなしなら応答しない
    const videoId = this.config.getCurrentVideoId();
    if (!videoId) return;

    // 自分のリクエストには応答しない
    if (message.senderId === this.config.userId) return;

    const sendResponse = () => {
      // 再度条件チェック（遅延中に状態が変わった可能性）
      if (!this.playerController.isPlayerReady()) return;
      const currentVideoId = this.config.getCurrentVideoId();
      if (!currentVideoId) return;

      const t2 = Date.now(); // サーバー受信時刻
      const currentTime = this.playerController.getCurrentTime();
      const currentIsPlaying = this.playerController.isPlayerPlaying();
      const currentRate = this.playerController.getPlaybackRate();
      const t3 = Date.now(); // サーバー送信時刻

      const response: StateResponseMessage = {
        type: 'state_response',
        payload: {
          requestId: message.payload.requestId,
          t1: message.payload.t1 || message.timestamp,
          t2,
          t3,
          videoId: currentVideoId,
          currentTime,
          isPlaying: currentIsPlaying,
          playbackRate: currentRate,
          wallClockAtTime: t3,
          responderId: this.config.userId,
          responderTime: t3,
          // isController now means "I am currently acting as authority (sending heartbeats)"
          // not just "I have permission to control"
          isController: this.config.isAuthority(),
          epoch: this.clockManager.getEpoch(),
        },
        ...this.config.createMessageFields(this.config.userId),
      };

      this.networkManager.sendStateResponse(response);
    };

    // コントローラーは即座に応答、非コントローラーは遅延
    if (this.config.hasControlPermission()) {
      sendResponse();
    } else {
      setTimeout(sendResponse, TIMING_CONSTANTS.CONTROLLER_RESPONSE_DELAY);
    }
  }

  // ============================================================
  // State Response 受信
  // ============================================================

  /**
   * State Responseを受信し、応答リストに追加
   *
   * @param message - 受信したState Response
   */
  private handleStateResponse(message: StateResponseMessage): void {
    // 保留中のリクエストがない場合は無視
    if (!this.pendingRequestId) return;

    // 別のリクエストに対する応答は無視
    if (message.payload.requestId !== this.pendingRequestId) return;

    console.log('[StateRequestProtocol] Received state response:', {
      isController: message.payload.isController,
      epoch: message.payload.epoch,
    });

    // 応答を収集
    this.responses.push(message);
  }

  // ============================================================
  // 応答処理
  // ============================================================

  /**
   * 収集した応答を処理し、最適な状態を返す
   */
  private processResponses(): void {
    // タイムアウトをクリア
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }

    // 応答がない場合
    if (this.responses.length === 0) {
      console.log('[StateRequestProtocol] No responses received');
      this.pendingRequestId = null;
      this.resolveRequest?.(null);
      this.resolveRequest = null;
      return;
    }

    // Check if any responder is currently acting as authority (sending heartbeats)
    this._authorityResponded = this.responses.some((r) => r.payload.isController);

    // 最適な応答を選択
    const bestResponse = this.selectBestResponse(this.responses);

    console.log('[StateRequestProtocol] Processing best response:', {
      isController: bestResponse.payload.isController,
      authorityResponded: this._authorityResponded,
      epoch: bestResponse.payload.epoch,
      totalResponses: this.responses.length,
    });

    // 時刻補正を計算
    const adjustedState = this.calculateAdjustedState(bestResponse);

    // エポックを更新
    if (bestResponse.payload.epoch) {
      this.clockManager.updateEpoch(bestResponse.payload.epoch);
    }

    // roomStoreのplaybackStateを更新
    // 【重要】JoinOverlay表示中でもplaybackStateを最新に保つことで、
    // performDeferredSyncが正確な時刻を取得できる
    useRoomStore.getState().setPlaybackState(adjustedState);
    console.log('[StateRequestProtocol] Updated roomStore playbackState:', {
      currentTime: adjustedState.currentTime.toFixed(2),
      isPlaying: adjustedState.isPlaying,
    });

    // リセット
    this.pendingRequestId = null;
    this.responses = [];

    // 結果を返す
    this.resolveRequest?.(adjustedState);
    this.resolveRequest = null;
  }

  /**
   * 最適な応答を選択
   *
   * 【選択アルゴリズム】
   * 1. コントローラー応答を優先
   * 2. 同じ優先度の場合、responderTimeが最新のものを選択
   *
   * @param responses - 応答リスト
   * @returns 最適な応答
   */
  private selectBestResponse(responses: StateResponseMessage[]): StateResponseMessage {
    // コントローラー応答をフィルタ
    const controllerResponses = responses.filter((r) => r.payload.isController);

    // コントローラー応答があればその中から、なければ全体から選択
    const candidates = controllerResponses.length > 0 ? controllerResponses : responses;

    // responderTimeが最新のものを選択
    return candidates.reduce((best, current) =>
      current.payload.responderTime > best.payload.responderTime ? current : best
    );
  }

  /**
   * 時刻補正済みの再生状態を計算
   *
   * @param response - State Response
   * @returns 補正済み再生状態
   *
   * 【計算式】
   * 1. RTT = (t4 - t1) - (t3 - t2)
   * 2. offset = ((t2 - t1) + (t3 - t4)) / 2
   * 3. elapsed = (t4 - wallClockAtTime) - offset
   * 4. adjustedTime = currentTime + elapsed * rate (if playing)
   */
  private calculateAdjustedState(response: StateResponseMessage): PlaybackState {
    const t4 = Date.now(); // クライアント受信時刻
    const t1 = response.payload.t1 || this.requestT1;
    const t2 = response.payload.t2 || response.timestamp;
    const t3 = response.payload.t3 || response.payload.responderTime;

    // RTTサンプルを追加
    this.clockManager.addRttSample(t1, t2, t3, t4);

    // 時刻オフセットを計算
    const clockOffset = this.clockManager.calculateClockOffset(t1, t2, t3, t4);

    // 経過時間を計算
    const wallClockAtTime = response.payload.wallClockAtTime || response.payload.responderTime;
    const elapsedMs = (t4 - wallClockAtTime) - clockOffset;
    const elapsedSeconds = Math.max(0, elapsedMs / 1000);

    // 再生位置を補正
    let adjustedTime = response.payload.currentTime;
    if (response.payload.isPlaying) {
      adjustedTime += elapsedSeconds * response.payload.playbackRate;
    }

    return {
      currentTime: adjustedTime,
      isPlaying: response.payload.isPlaying,
      playbackRate: response.payload.playbackRate,
      lastUpdated: Date.now(),
    };
  }

  // ============================================================
  // 状態取得
  // ============================================================

  /**
   * 直近のState Requestでauthority（heartbeat送信中）が応答したかどうか
   *
   * SyncEngineがheartbeat開始を決定する際に使用:
   * - true: 誰かがすでにheartbeatを送信中 → heartbeatを開始しない
   * - false: 誰もheartbeatを送信していない → heartbeatを開始する
   */
  get authorityResponded(): boolean {
    return this._authorityResponded;
  }

  // ============================================================
  // クリーンアップ
  // ============================================================

  /**
   * リソースを解放
   */
  dispose(): void {
    console.log('[StateRequestProtocol] Disposing');

    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }

    this.pendingRequestId = null;
    this.responses = [];
    this.resolveRequest = null;
  }
}
