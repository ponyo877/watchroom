import { useEffect, useRef } from 'react';

/**
 * モバイルブラウザのビューポート高さを動的に計算するフック
 * URLバーの表示/非表示による高さ変化を考慮して--vh CSS変数を更新
 *
 * 重要: キーボード表示時は--vhを更新しない
 * これにより動画などのレイアウトがキーボード表示時に縮小されるのを防ぐ
 */
export function useViewportHeight() {
  // 初期のビューポート高さを保存（キーボード表示前の基準値）
  const initialHeightRef = useRef<number | null>(null);

  useEffect(() => {
    const setVH = (forceUpdate = false) => {
      const currentHeight = window.innerHeight;

      // 初回は初期高さを記憶
      if (initialHeightRef.current === null) {
        initialHeightRef.current = currentHeight;
      }

      // キーボード表示の判定: 150px以上縮小した場合
      const heightDiff = initialHeightRef.current - currentHeight;
      const isLikelyKeyboard = heightDiff > 150;

      // キーボード表示時は--vhを更新しない（強制更新時を除く）
      if (isLikelyKeyboard && !forceUpdate) {
        return;
      }

      // キーボードが閉じた場合、初期高さを更新
      if (currentHeight > (initialHeightRef.current ?? 0)) {
        initialHeightRef.current = currentHeight;
      }

      // ビューポート高さの1%を計算
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 初期設定（強制更新）
    setVH(true);

    // リサイズ時（キーボード判定あり）
    const handleResize = () => setVH(false);

    // 向き変更時は初期高さをリセットして強制更新
    const handleOrientationChange = () => {
      initialHeightRef.current = null;
      // 向き変更後に高さが安定するまで少し待つ
      setTimeout(() => setVH(true), 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // iOS Safariでのスクロール時の高さ変化に対応
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setVH(false);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
}
