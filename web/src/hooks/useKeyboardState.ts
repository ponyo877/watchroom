import { useState, useEffect, useRef } from 'react';

interface KeyboardState {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  visualViewportHeight: number;
}

/**
 * モバイル仮想キーボードの状態を検出するフック
 * visualViewport APIを使用してキーボードの表示/非表示と高さを検出
 */
export function useKeyboardState(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isKeyboardOpen: false,
    keyboardHeight: 0,
    visualViewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // 初期のビューポート高さを保存（キーボード表示前の基準値）
  const initialHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 初期高さを設定
    if (initialHeightRef.current === null) {
      initialHeightRef.current = window.innerHeight;
    }

    const handleViewportChange = () => {
      const visualViewport = window.visualViewport;
      const currentHeight = visualViewport?.height ?? window.innerHeight;
      const initialHeight = initialHeightRef.current ?? window.innerHeight;

      // 高さの差分を計算
      const heightDiff = initialHeight - currentHeight;

      // 画面比率ベースの閾値（最小150px、または初期高さの15%）
      // 小さい画面では比率ベース、大きい画面では固定値150pxを使用
      const minKeyboardHeight = Math.max(100, Math.min(150, initialHeight * 0.15));
      const isKeyboardOpen = heightDiff > minKeyboardHeight;

      setState({
        isKeyboardOpen,
        keyboardHeight: isKeyboardOpen ? heightDiff : 0,
        visualViewportHeight: currentHeight,
      });
    };

    // キーボードが閉じた場合に初期高さを更新
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      // 現在の高さが初期高さより大きい場合、初期高さを更新
      // （向き変更などで画面が大きくなった場合）
      if (currentHeight > (initialHeightRef.current ?? 0)) {
        initialHeightRef.current = currentHeight;
      }
      handleViewportChange();
    };

    // 向き変更時は初期高さをリセット
    const handleOrientationChange = () => {
      // 向き変更後に高さが安定するまで少し待つ
      setTimeout(() => {
        initialHeightRef.current = window.innerHeight;
        handleViewportChange();
      }, 100);
    };

    // visualViewport APIが利用可能な場合はそれを使用
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);
    }

    // フォールバックとしてwindowのresizeイベントも監視
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // 初期状態を設定
    handleViewportChange();

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return state;
}
