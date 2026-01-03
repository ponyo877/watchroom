import { useState, useEffect } from 'react';

/**
 * デバイスが横向き（ランドスケープ）モードかを検出するフック
 * モバイルデバイスでの横向きフルスクリーン表示に使用
 */
export function useLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: landscape)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsLandscape(e.matches);
    };

    // 初期値を設定
    setIsLandscape(mediaQuery.matches);

    // イベントリスナーを追加
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isLandscape;
}

/**
 * モバイルデバイスかどうかを検出するフック
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}

/**
 * タッチデバイスかどうかを検出
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouchDevice;
}

/**
 * モバイル横向きフルスクリーンモードかを判定
 * モバイル + 横向き + 高さが小さい（500px以下）の場合にtrue
 */
export function useMobileLandscapeFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isSmallHeight = window.innerHeight <= 500;
      const isMobile = window.matchMedia('(max-width: 1024px)').matches;
      setIsFullscreen(isLandscape && isSmallHeight && isMobile);
    };

    checkFullscreen();
    window.addEventListener('resize', checkFullscreen);
    window.addEventListener('orientationchange', checkFullscreen);

    return () => {
      window.removeEventListener('resize', checkFullscreen);
      window.removeEventListener('orientationchange', checkFullscreen);
    };
  }, []);

  return isFullscreen;
}
