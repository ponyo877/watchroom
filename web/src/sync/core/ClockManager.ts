/**
 * 時刻管理クラス
 *
 * 【責務】
 * - 分散システムの論理時刻（Lamport Clock）を管理
 * - RTT（Round-Trip Time）推定を管理
 * - エポック（状態バージョン）を管理
 *
 * 【理論的基盤】
 * - Lamport (1978): 論理時刻によるメッセージ順序付け
 * - NTP RFC 5905: RTT推定と時刻オフセット計算
 *
 * 【シーケンス図: RTT計算（NTPスタイル）】
 * ```
 * Client                    Server
 *   |                         |
 *   |-- t1 (request) -------->|
 *   |                         | t2 (受信)
 *   |                         | (処理中...)
 *   |                         | t3 (応答)
 *   |<-- t4 (receive) --------|
 *   |                         |
 *
 * RTT = (t4 - t1) - (t3 - t2)
 *       ^^^^^^^^^^^^^^^^^^^^
 *       往復時間からサーバー処理時間を除外
 *
 * Clock Offset = ((t2 - t1) + (t3 - t4)) / 2
 *                ^^^^^^^^^^^^^^^^^^^^^^^^^
 *                クライアントとサーバーの時刻差
 * ```
 *
 * 【設計根拠】
 * - message.tsのユーティリティクラスをラップして統一インターフェースを提供
 * - 責務を分離してテスト容易性を向上
 */

import {
  LamportClock,
  VectorClockManager,
  RTTEstimator,
  type VectorClock,
} from '@/types/message';

/**
 * ClockManagerの設定
 */
export interface ClockManagerConfig {
  /** ローカルユーザーID（VectorClock用） */
  localId: string;
}

/**
 * 時刻管理クラス
 *
 * 分散システムにおける時刻同期と順序付けを担当。
 * Lamport Clock、Vector Clock、RTT推定を統合管理する。
 */
export class ClockManager {
  /** Lamport Clock: メッセージの全順序付け */
  private lamportClock: LamportClock;

  /** Vector Clock: 並行操作の検出 */
  private vectorClockManager: VectorClockManager;

  /** RTT推定器: ネットワーク遅延の推定 */
  private rttEstimator: RTTEstimator;

  /** エポック: 状態のバージョン番号 */
  private epoch: number = 0;

  /** シーケンス番号: メッセージの連番（ロス検出用） */
  private sequenceNumber: number = 0;

  /** View番号: Authorityの世代番号 */
  private viewNumber: number = 0;

  /** ローカルユーザーID */
  private localId: string;

  /**
   * コンストラクタ
   *
   * @param config - 設定オブジェクト
   */
  constructor(config: ClockManagerConfig) {
    this.localId = config.localId;
    this.lamportClock = new LamportClock();
    this.vectorClockManager = new VectorClockManager(config.localId);
    this.rttEstimator = new RTTEstimator();
  }

  // ============================================================
  // Lamport Clock 操作
  // ============================================================

  /**
   * 論理時刻をインクリメント
   *
   * ローカルイベント発生時に呼び出す。
   * メッセージ送信前に呼び出すことで、メッセージに論理時刻を付与。
   *
   * @returns 新しい論理時刻
   *
   * 【Lamport Clock ルール】
   * 1. ローカルイベント発生時: C := C + 1
   * 2. メッセージ送信時: タイムスタンプ = C
   * 3. メッセージ受信時: C := max(C, received) + 1
   */
  incrementLogicalClock(): number {
    return this.lamportClock.increment();
  }

  /**
   * 受信した論理時刻でローカル時刻を更新
   *
   * メッセージ受信時に呼び出す。
   *
   * @param received - 受信したメッセージの論理時刻
   * @returns 更新後の論理時刻
   */
  updateLogicalClock(received: number): number {
    return this.lamportClock.update(received);
  }

  /**
   * 現在の論理時刻を取得
   *
   * @returns 現在の論理時刻
   */
  getLogicalClock(): number {
    return this.lamportClock.getValue();
  }

  // ============================================================
  // Vector Clock 操作
  // ============================================================

  /**
   * Vector Clockをインクリメント
   *
   * @returns 新しいVector Clock
   */
  incrementVectorClock(): VectorClock {
    return this.vectorClockManager.increment();
  }

  /**
   * 受信したVector Clockとマージ
   *
   * @param other - 受信したVector Clock
   * @returns マージ後のVector Clock
   */
  mergeVectorClock(other: VectorClock): VectorClock {
    return this.vectorClockManager.merge(other);
  }

  /**
   * Vector Clockを比較
   *
   * @param other - 比較対象のVector Clock
   * @returns -1（前）, 0（並行）, 1（後）
   */
  compareVectorClock(other: VectorClock): number {
    return this.vectorClockManager.compare(other);
  }

  /**
   * 現在のVector Clockを取得
   *
   * @returns 現在のVector Clock
   */
  getVectorClock(): VectorClock {
    return this.vectorClockManager.toJSON();
  }

  // ============================================================
  // RTT 推定
  // ============================================================

  /**
   * RTTサンプルを追加
   *
   * NTPスタイルの4つのタイムスタンプからRTTを計算し、
   * 内部のサンプルリストに追加する。
   *
   * @param t1 - クライアント送信時刻
   * @param t2 - サーバー受信時刻
   * @param t3 - サーバー送信時刻
   * @param t4 - クライアント受信時刻
   *
   * 【計算式】
   * RTT = (t4 - t1) - (t3 - t2)
   *     = 往復時間 - サーバー処理時間
   */
  addRttSample(t1: number, t2: number, t3: number, t4: number): void {
    this.rttEstimator.addSample(t1, t2, t3, t4);
  }

  /**
   * 推定RTTを取得
   *
   * 過去のサンプルから外れ値を除外し、
   * 中央値を返す（ロバストな推定）。
   *
   * @returns 推定RTT（ミリ秒）
   */
  getEstimatedRtt(): number {
    return this.rttEstimator.getEstimatedRTT();
  }

  /**
   * 片道遅延を取得
   *
   * @returns 推定片道遅延（ミリ秒）
   */
  getOneWayDelay(): number {
    return this.rttEstimator.getOneWayDelay();
  }

  /**
   * 時刻オフセットを計算
   *
   * NTPスタイルの計算で、クライアントとサーバーの
   * 時刻差（オフセット）を計算する。
   *
   * @param t1 - クライアント送信時刻
   * @param t2 - サーバー受信時刻
   * @param t3 - サーバー送信時刻
   * @param t4 - クライアント受信時刻
   * @returns 時刻オフセット（ミリ秒）
   *
   * 【計算式】
   * offset = ((t2 - t1) + (t3 - t4)) / 2
   *
   * 正の値: サーバーが進んでいる
   * 負の値: クライアントが進んでいる
   */
  calculateClockOffset(t1: number, t2: number, t3: number, t4: number): number {
    return this.rttEstimator.calculateClockOffset(t1, t2, t3, t4);
  }

  // ============================================================
  // エポック管理
  // ============================================================

  /**
   * 現在のエポックを取得
   *
   * エポックは状態のバージョン番号。
   * 状態変更時にインクリメントされる。
   *
   * @returns 現在のエポック
   */
  getEpoch(): number {
    return this.epoch;
  }

  /**
   * エポックをインクリメント
   *
   * 権限者が状態を変更したときに呼び出す。
   *
   * @returns 新しいエポック
   */
  incrementEpoch(): number {
    return ++this.epoch;
  }

  /**
   * 受信したエポックで更新
   *
   * より大きいエポックを受信した場合に更新。
   *
   * @param received - 受信したエポック
   */
  updateEpoch(received: number): void {
    this.epoch = Math.max(this.epoch, received);
  }

  // ============================================================
  // シーケンス番号管理
  // ============================================================

  /**
   * 次のシーケンス番号を取得
   *
   * メッセージ送信時に呼び出し、連番を付与。
   * パケットロス検出に使用。
   *
   * @returns 次のシーケンス番号
   */
  getNextSequenceNumber(): number {
    return ++this.sequenceNumber;
  }

  /**
   * 現在のシーケンス番号を取得
   *
   * @returns 現在のシーケンス番号
   */
  getCurrentSequenceNumber(): number {
    return this.sequenceNumber;
  }

  // ============================================================
  // View番号管理
  // ============================================================

  /**
   * 現在のView番号を取得
   *
   * View番号はAuthorityの世代番号。
   * Authorityが変更されるとインクリメントされる。
   *
   * @returns 現在のView番号
   */
  getViewNumber(): number {
    return this.viewNumber;
  }

  /**
   * View番号をインクリメント
   *
   * Authority変更時に呼び出す。
   *
   * @returns 新しいView番号
   */
  incrementViewNumber(): number {
    return ++this.viewNumber;
  }

  /**
   * 受信したView番号で更新
   *
   * @param received - 受信したView番号
   */
  updateViewNumber(received: number): void {
    this.viewNumber = Math.max(this.viewNumber, received);
  }

  // ============================================================
  // メッセージフィールド生成
  // ============================================================

  /**
   * メッセージ用の基本フィールドを生成
   *
   * 全てのメッセージに共通で必要なフィールドを一括生成。
   * 論理時刻、Vector Clock、シーケンス番号を自動でインクリメント。
   *
   * @returns メッセージの基本フィールド
   */
  createMessageFields(): {
    senderId: string;
    timestamp: number;
    logicalClock: number;
    vectorClock: VectorClock;
    sequenceNumber: number;
    viewNumber: number;
  } {
    return {
      senderId: this.localId,
      timestamp: Date.now(),
      logicalClock: this.incrementLogicalClock(),
      vectorClock: this.incrementVectorClock(),
      sequenceNumber: this.getNextSequenceNumber(),
      viewNumber: this.getViewNumber(),
    };
  }

  // ============================================================
  // リセット
  // ============================================================

  /**
   * 全ての状態をリセット
   *
   * 部屋を離れる時や再接続時に呼び出す。
   */
  reset(): void {
    this.lamportClock.reset();
    this.vectorClockManager.reset();
    this.rttEstimator.reset();
    this.epoch = 0;
    this.sequenceNumber = 0;
    this.viewNumber = 0;
  }
}
