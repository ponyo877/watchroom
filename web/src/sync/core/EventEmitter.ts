/**
 * イベントエミッター基底クラス
 *
 * 【責務】
 * - イベント駆動のメッセージングパターンを提供
 * - 型安全なイベント定義をジェネリクスで実現
 * - リスナーの自動クリーンアップ機能を提供
 *
 * 【設計根拠】
 * - Node.jsのEventEmitterパターンを採用
 * - TypeScriptのジェネリクスで型安全性を確保
 * - unsubscribe関数を返すことでReact hookでの使用を容易に
 *
 * 【使用例】
 * ```typescript
 * type MyEvents = 'ready' | 'error';
 * interface MyEventData {
 *   ready: void;
 *   error: Error;
 * }
 *
 * class MyClass extends EventEmitter<MyEvents, MyEventData> {
 *   doSomething() {
 *     this.emit('ready');
 *     this.emit('error', new Error('Something went wrong'));
 *   }
 * }
 *
 * const instance = new MyClass();
 * const unsubscribe = instance.on('ready', () => console.log('Ready!'));
 * // Later: unsubscribe();
 * ```
 */

/**
 * イベントリスナーの型
 * @template T - イベントデータの型
 */
type Listener<T> = T extends void ? () => void : (data: T) => void;

/**
 * イベントエミッター基底クラス
 *
 * @template Events - イベント名のユニオン型
 * @template EventData - イベント名からデータ型へのマッピング
 */
export class EventEmitter<
  Events extends string,
  EventData extends Record<Events, unknown> = Record<Events, void>
> {
  /**
   * イベントリスナーのマップ
   * 各イベントに対してリスナーのSetを保持
   */
  private listeners: Map<Events, Set<Listener<unknown>>> = new Map();

  /**
   * イベントリスナーを登録
   *
   * @param event - イベント名
   * @param listener - コールバック関数
   * @returns unsubscribe関数（リスナー解除用）
   *
   * 【使用パターン】
   * ```typescript
   * // 通常の使用
   * emitter.on('ready', () => { ... });
   *
   * // React useEffectでの使用
   * useEffect(() => {
   *   const unsubscribe = emitter.on('ready', () => { ... });
   *   return unsubscribe; // クリーンアップ
   * }, []);
   * ```
   */
  on<E extends Events>(
    event: E,
    listener: Listener<EventData[E]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);

    // unsubscribe関数を返す
    return () => this.off(event, listener);
  }

  /**
   * イベントリスナーを解除
   *
   * @param event - イベント名
   * @param listener - 解除するコールバック関数
   */
  off<E extends Events>(
    event: E,
    listener: Listener<EventData[E]>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener as Listener<unknown>);
    }
  }

  /**
   * イベントを発火（リスナーにデータを通知）
   *
   * @param event - イベント名
   * @param data - イベントデータ（voidの場合は省略可能）
   *
   * 【シーケンス図: イベント発火】
   * ```
   * emit('ready')
   *     │
   *     ├─→ Listener 1: () => { ... }
   *     │
   *     ├─→ Listener 2: () => { ... }
   *     │
   *     └─→ Listener N: () => { ... }
   * ```
   */
  protected emit<E extends Events>(
    event: E,
    ...args: EventData[E] extends void ? [] : [EventData[E]]
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const data = args[0];
      listeners.forEach((listener) => {
        try {
          if (data === undefined) {
            (listener as () => void)();
          } else {
            (listener as (data: unknown) => void)(data);
          }
        } catch (error) {
          // リスナー内のエラーが他のリスナーに影響しないようにキャッチ
          console.error(`[EventEmitter] Error in listener for event "${event}":`, error);
        }
      });
    }
  }

  /**
   * 特定のイベントまたは全てのイベントリスナーを解除
   *
   * @param event - イベント名（省略時は全イベント）
   *
   * 【使用場面】
   * - コンポーネントのアンマウント時
   * - 状態リセット時
   */
  removeAllListeners(event?: Events): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 特定のイベントのリスナー数を取得
   * デバッグやテスト用
   *
   * @param event - イベント名
   * @returns リスナー数
   */
  listenerCount(event: Events): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
