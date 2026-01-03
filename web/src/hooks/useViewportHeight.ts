import { useEffect } from 'react';

/**
 * モバイルブラウザのビューポート高さを動的に計算するフック
 * URLバーの表示/非表示による高さ変化を考慮して--vh CSS変数を更新
 */
export function useViewportHeight() {
  useEffect(() => {
    const setVH = () => {
      // ビューポート高さの1%を計算
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 初期設定
    setVH();

    // リサイズと向き変更時に更新
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // iOS Safariでのスクロール時の高さ変化に対応
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setVH();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
}
