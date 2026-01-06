/**
 * ビデオ同期フック
 *
 * 【責務】
 * - SyncEngineとReactの橋渡し
 * - 最小限のuseEffect（3つのみ）
 * - useSyncExternalStoreで状態を購読
 *
 * 【設計方針】
 * - useEffectは以下の3つのみ:
 *   1. SyncEngine初期化とクリーンアップ
 *   2. hasControlPermission変更時のハートビート開始/停止
 *   3. playbackState変更時の外部状態同期
 * - イベントハンドラはuseCallbackでメモ化
 * - 状態はuseSyncExternalStoreで購読（追加のuseEffect不要）
 *
 * 【既存コードとの互換性】
 * 旧useVideoSyncと同じインターフェースを提供し、
 * 段階的な移行を可能にする。
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { SyncEngine } from '../core/SyncEngine';
import { useUserStore } from '@/stores/userStore';
import { useMessageFieldsStore } from '@/stores/messageFieldsStore';
import { useRoomStore } from '@/stores/roomStore';
import type { YouTubePlayer } from '@/types/youtube';
import type {
  StateRequestMessage,
  StateResponseMessage,
  HeartbeatMessage,
} from '@/types/message';
import type {
  UseVideoSyncOptions,
  UseVideoSyncReturn,
  SyncSnapshot,
} from '../types';
import { DEFAULT_SYNC_SNAPSHOT } from '../types';

/**
 * ビデオ同期フック
 *
 * YouTubeプレイヤーの初期化と再生同期を管理。
 * SyncEngineをラップして、Reactコンポーネントで使いやすいインターフェースを提供。
 *
 * @param options - フックオプション
 * @returns プレイヤー制御とメッセージハンドラ
 *
 * 【使用例】
 * ```typescript
 * const {
 *   player,
 *   isReady,
 *   isInitialSyncComplete,
 *   play,
 *   pause,
 *   seek,
 *   handleStateRequest,
 *   handleStateResponse,
 *   handleHeartbeat,
 * } = useVideoSync({
 *   elementId: 'youtube-player',
 *   videoId: currentVideo?.videoId ?? null,
 *   playbackState,
 *   hasControlPermission,
 *   sendMessage,
 *   createMessageFields,
 *   onMutedChange: setIsMuted,
 * });
 * ```
 */
export function useVideoSync({
  elementId,
  videoId,
  playbackState,
  hasControlPermission,
  sendMessage,
  createMessageFields: externalCreateMessageFields,
  onMutedChange,
}: UseVideoSyncOptions): UseVideoSyncReturn {
  // ストアからユーザー情報を取得
  const userId = useUserStore((state) => state.id);
  const storeCreateMessageFields = useMessageFieldsStore((state) => state.createMessageFields);

  // メッセージフィールド生成関数（外部指定があればそれを使用、なければストアを使用）
  const createMessageFields = useMemo(
    () => externalCreateMessageFields ?? storeCreateMessageFields,
    [externalCreateMessageFields, storeCreateMessageFields]
  );

  // SyncEngineインスタンスへの参照
  const engineRef = useRef<SyncEngine | null>(null);

  // 前回のplaybackState（変更検出用）
  const lastSyncRef = useRef<number>(0);

  // エンジン作成時の再レンダリング用（useSyncExternalStoreの再購読をトリガー）
  const [engineVersion, setEngineVersion] = useState(0);

  // ============================================================
  // useEffect 1: SyncEngine初期化とクリーンアップ
  // ============================================================

  useEffect(() => {
    // ビデオIDがない場合は初期化しない
    if (!videoId) return;

    console.log('[useVideoSync] Initializing SyncEngine for video:', videoId);

    // SyncEngineを作成
    const engine = new SyncEngine({
      elementId,
      videoId,
      userId,
      sendMessage,
      createMessageFields,
      onMutedChange,
    });

    engineRef.current = engine;

    // 再レンダリングをトリガーしてuseSyncExternalStoreを再購読
    setEngineVersion((v) => v + 1);

    // 初期化を実行
    engine.initialize(videoId).then(() => {
      // 初期同期を開始（Late Joiner対応）
      // playbackStateはuseEffect実行時点ではstale closureの可能性があるため、
      // ストアから直接最新値を取得する
      const currentPlaybackState = useRoomStore.getState().playbackState;
      console.log('[useVideoSync] Starting initial sync with playbackState:', currentPlaybackState);
      engine.startInitialSync(currentPlaybackState);
    });

    // クリーンアップ
    return () => {
      console.log('[useVideoSync] Disposing SyncEngine');
      engine.dispose();
      engineRef.current = null;
    };
  }, [videoId, elementId, userId]); // sendMessage, createMessageFieldsは依存から除外（安定した参照を前提）

  // ============================================================
  // useEffect 2: hasControlPermission変更時のハートビート管理
  // ============================================================

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // 権限変更をエンジンに通知
    engine.setControlPermission(hasControlPermission);
  }, [hasControlPermission]);

  // ============================================================
  // useEffect 3: playbackState変更時の外部状態同期
  // ============================================================

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // 初期同期完了後、かつ状態が更新された場合のみ同期
    if (engine.isInitialSyncComplete() && playbackState.lastUpdated > lastSyncRef.current) {
      engine.syncToPlaybackState(playbackState);
      lastSyncRef.current = playbackState.lastUpdated;
    }
  }, [playbackState]);

  // ============================================================
  // useSyncExternalStoreで状態を購読
  // ============================================================

  // subscribe関数（engineVersionが変わると再作成され、useSyncExternalStoreが再購読）
  const subscribe = useCallback((callback: () => void) => {
    const engine = engineRef.current;
    if (engine) {
      return engine.subscribe(callback);
    }
    // エンジンがない場合はダミーのunsubscribe
    return () => {};
  }, [engineVersion]);

  // getSnapshot関数
  const getSnapshot = useCallback((): SyncSnapshot => {
    const engine = engineRef.current;
    if (engine) {
      return engine.getSnapshot();
    }
    return DEFAULT_SYNC_SNAPSHOT;
  }, []);

  // サーバーサイドレンダリング用
  const getServerSnapshot = useCallback((): SyncSnapshot => {
    return DEFAULT_SYNC_SNAPSHOT;
  }, []);

  // 状態を購読
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // ============================================================
  // プレイヤー操作（useCallbackでメモ化）
  // ============================================================

  const play = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    engineRef.current?.seek(time);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    engineRef.current?.setPlaybackRate(rate);
  }, []);

  const loadVideo = useCallback((id: string, title?: string, thumbnail?: string) => {
    engineRef.current?.loadVideo(id, title, thumbnail);
  }, []);

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
  const setUserInteraction = useCallback(() => {
    engineRef.current?.setUserInteraction();
  }, []);

  // ============================================================
  // メッセージハンドラ（既存コードとの互換性）
  // ============================================================

  /**
   * State Requestメッセージを処理
   *
   * 他のユーザーからのState Requestに応答するために、
   * NetworkManagerに転送。
   */
  const handleStateRequest = useCallback((message: StateRequestMessage) => {
    const engine = engineRef.current;
    if (engine) {
      engine.handleMessage(message);
    }
  }, []);

  /**
   * State Responseメッセージを処理
   *
   * Late Joiner同期のためにStateRequestProtocolに転送。
   */
  const handleStateResponse = useCallback((message: StateResponseMessage) => {
    const engine = engineRef.current;
    if (engine) {
      engine.handleMessage(message);
    }
  }, []);

  /**
   * Heartbeatメッセージを処理
   *
   * 継続的な同期のためにHeartbeatProtocolに転送。
   */
  const handleHeartbeat = useCallback((message: HeartbeatMessage) => {
    const engine = engineRef.current;
    if (engine) {
      engine.handleMessage(message);
    }
  }, []);

  // ============================================================
  // 戻り値
  // ============================================================

  // プレイヤーインスタンスを取得
  const player: YouTubePlayer | null = engineRef.current?.getPlayer() ?? null;

  // 準備完了状態
  const isReady = snapshot.isPlayerReady;

  // 初期同期完了状態
  const isInitialSyncComplete = snapshot.hasInitialSync;

  // エポック
  const epoch = engineRef.current?.getEpoch() ?? 0;

  return {
    player,
    isReady,
    isInitialSyncComplete,
    epoch,
    snapshot,
    play,
    pause,
    seek,
    setPlaybackRate,
    loadVideo,
    handleStateRequest,
    handleStateResponse,
    handleHeartbeat,
    setUserInteraction,
  };
}
