/**
 * ネットワーク管理クラス
 *
 * 【責務】
 * - P2Pメッセージの送信をラップ
 * - 受信メッセージのタイプ別ディスパッチ
 * - イベントベースで受信を通知
 *
 * 【設計根拠】
 * - SkyWay DataStreamの詳細を隠蔽
 * - メッセージタイプごとにイベントを発火してハンドラを分離
 * - 送信関数を外部から注入してテスト容易性を向上
 *
 * 【メッセージフロー】
 * ```
 * [送信]
 * SyncEngine → NetworkManager.sendSync() → sendMessage() → SkyWay
 *
 * [受信]
 * SkyWay → useSkyWay.handleMessage() → NetworkManager.handleMessage()
 *        → emit('sync', message) → SyncEngine
 * ```
 */

import { EventEmitter } from './EventEmitter';
import type {
  DataStreamMessage,
  SyncMessage,
  StateRequestMessage,
  StateResponseMessage,
  HeartbeatMessage,
} from '@/types/message';
import type { NetworkEventType, NetworkEventData, SendMessageFn } from '../types';

/**
 * NetworkManagerの設定
 */
export interface NetworkManagerConfig {
  /**
   * メッセージ送信関数
   * SkyWay DataStreamを経由してP2Pメッセージを送信
   */
  sendMessage: SendMessageFn;
}

/**
 * ネットワーク管理クラス
 *
 * P2Pメッセージの送受信を管理。
 * 受信メッセージをタイプ別にディスパッチする。
 */
export class NetworkManager extends EventEmitter<NetworkEventType, NetworkEventData> {
  /** メッセージ送信関数 */
  private sendMessage: SendMessageFn;

  /**
   * コンストラクタ
   *
   * @param config - 設定オブジェクト
   */
  constructor(config: NetworkManagerConfig) {
    super();
    this.sendMessage = config.sendMessage;
  }

  // ============================================================
  // メッセージ送信
  // ============================================================

  /**
   * Syncメッセージを送信
   *
   * 再生操作（play, pause, seek, rate, video）をブロードキャスト。
   *
   * @param message - Syncメッセージ
   * @returns 送信成功かどうか
   */
  async sendSync(message: SyncMessage): Promise<boolean> {
    console.log('[NetworkManager] Sending sync:', message.action);
    return this.sendMessage(message);
  }

  /**
   * State Requestメッセージを送信
   *
   * Late Joinerが現在の再生状態をリクエスト。
   *
   * @param message - State Requestメッセージ
   * @returns 送信成功かどうか
   */
  async sendStateRequest(message: StateRequestMessage): Promise<boolean> {
    console.log('[NetworkManager] Sending state request:', message.payload.requestId);
    return this.sendMessage(message);
  }

  /**
   * State Responseメッセージを送信
   *
   * State Requestに対する応答。
   *
   * @param message - State Responseメッセージ
   * @returns 送信成功かどうか
   */
  async sendStateResponse(message: StateResponseMessage): Promise<boolean> {
    console.log('[NetworkManager] Sending state response:', message.payload.requestId);
    return this.sendMessage(message);
  }

  /**
   * Heartbeatメッセージを送信
   *
   * 権限者が定期的に状態をブロードキャスト。
   *
   * @param message - Heartbeatメッセージ
   * @returns 送信成功かどうか
   */
  async sendHeartbeat(message: HeartbeatMessage): Promise<boolean> {
    return this.sendMessage(message);
  }

  // ============================================================
  // メッセージ受信
  // ============================================================

  /**
   * 受信メッセージを処理
   *
   * メッセージタイプに応じたイベントを発火。
   * 外部（useSkyWay）から呼び出される。
   *
   * @param message - 受信したメッセージ
   *
   * 【ディスパッチフロー】
   * ```
   * handleMessage(message)
   *     │
   *     ├─ type === 'sync'
   *     │   └─ emit('sync', message)
   *     │
   *     ├─ type === 'state_request'
   *     │   └─ emit('stateRequest', message)
   *     │
   *     ├─ type === 'state_response'
   *     │   └─ emit('stateResponse', message)
   *     │
   *     └─ type === 'heartbeat'
   *         └─ emit('heartbeat', message)
   * ```
   */
  handleMessage(message: DataStreamMessage): void {
    switch (message.type) {
      case 'sync':
        this.emit('sync', message as SyncMessage);
        break;

      case 'state_request':
        this.emit('stateRequest', message as StateRequestMessage);
        break;

      case 'state_response':
        this.emit('stateResponse', message as StateResponseMessage);
        break;

      case 'heartbeat':
        this.emit('heartbeat', message as HeartbeatMessage);
        break;

      // 他のメッセージタイプ（chat, reaction等）は別のハンドラで処理
      default:
        // 同期システムでは処理しないメッセージタイプ
        break;
    }
  }

  // ============================================================
  // 送信関数の更新
  // ============================================================

  /**
   * メッセージ送信関数を更新
   *
   * SkyWay接続が再確立された場合などに使用。
   *
   * @param sendMessage - 新しい送信関数
   */
  updateSendMessage(sendMessage: SendMessageFn): void {
    this.sendMessage = sendMessage;
  }

  // ============================================================
  // クリーンアップ
  // ============================================================

  /**
   * リソースを解放
   */
  dispose(): void {
    console.log('[NetworkManager] Disposing');
    this.removeAllListeners();
  }
}
