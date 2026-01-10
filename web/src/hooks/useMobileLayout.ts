import { useState, useEffect, useCallback, useRef } from 'react';

type Orientation = 'portrait' | 'landscape';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface MobileLayoutState {
  // デバイス情報
  isMobile: boolean;
  isTouch: boolean;

  // 向き
  orientation: Orientation;
  isLandscapeFullscreen: boolean;

  // キーボード
  isKeyboardVisible: boolean;
  keyboardHeight: number;

  // ビューポート
  viewportHeight: number;
  safeAreaInsets: SafeAreaInsets;

  // レイアウト制御
  showChat: boolean;
  toggleChat: () => void;
  closeChat: () => void;
}

// safe-area insetを取得
function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  // 一時的な要素を作成してenv()値を計算
  const testEl = document.createElement('div');
  testEl.style.cssText = `
    position: fixed;
    top: env(safe-area-inset-top, 0px);
    bottom: env(safe-area-inset-bottom, 0px);
    left: env(safe-area-inset-left, 0px);
    right: env(safe-area-inset-right, 0px);
    pointer-events: none;
    visibility: hidden;
  `;
  document.body.appendChild(testEl);

  const computed = getComputedStyle(testEl);
  const insets = {
    top: parseFloat(computed.top) || 0,
    bottom: parseFloat(computed.bottom) || 0,
    left: parseFloat(computed.left) || 0,
    right: parseFloat(computed.right) || 0,
  };

  document.body.removeChild(testEl);
  return insets;
}

// モバイル判定
function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
}

// タッチデバイス判定
function checkIsTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// 横持ちフルスクリーン判定（アスペクト比ベース）
function checkIsLandscapeFullscreen(): boolean {
  if (typeof window === 'undefined') return false;

  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  // アスペクト比ベースの判定（幅が高さの1.3倍以上）
  const isLandscapeAspect = window.innerWidth > window.innerHeight * 1.3;

  // 高さが画面の60%以下（横持ちモバイル特有の低い高さ）
  const screenHeight = window.screen?.height || window.innerHeight;
  const isSmallHeight = window.innerHeight <= screenHeight * 0.6;

  // フォールバック: 固定値での判定（screen.heightが取得できない場合）
  const isSmallHeightFallback = window.innerHeight <= 500;

  return isLandscape && isMobile && (isLandscapeAspect || isSmallHeight || isSmallHeightFallback);
}

/**
 * モバイルレイアウトを統合管理するフック
 *
 * 以下の機能を単一のフックに統合:
 * - デバイス検出（モバイル/タッチ）
 * - 画面向き検出（portrait/landscape）
 * - キーボード状態検出（表示/高さ）
 * - ビューポート・safe-area管理
 * - 横持ち時のチャット表示制御
 */
export function useMobileLayout(): MobileLayoutState {
  // 初期高さを保存（キーボード判定の基準）
  const initialHeightRef = useRef<number | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<Omit<MobileLayoutState, 'toggleChat' | 'closeChat'>>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTouch: false,
        orientation: 'portrait',
        isLandscapeFullscreen: false,
        isKeyboardVisible: false,
        keyboardHeight: 0,
        viewportHeight: 0,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        showChat: false,
      };
    }

    return {
      isMobile: checkIsMobile(),
      isTouch: checkIsTouch(),
      orientation: window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
      isLandscapeFullscreen: checkIsLandscapeFullscreen(),
      isKeyboardVisible: false,
      keyboardHeight: 0,
      viewportHeight: window.innerHeight,
      safeAreaInsets: getSafeAreaInsets(),
      showChat: false,
    };
  });

  // CSS変数を更新
  const updateCSSVariables = useCallback((newState: typeof state) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // ビューポート高さ
    root.style.setProperty('--vh', `${newState.viewportHeight * 0.01}px`);
    root.style.setProperty('--mobile-viewport-height', `${newState.viewportHeight}px`);

    // キーボード状態
    root.style.setProperty('--mobile-keyboard-visible', newState.isKeyboardVisible ? '1' : '0');
    root.style.setProperty('--mobile-keyboard-height', `${newState.keyboardHeight}px`);

    // チャット状態
    root.style.setProperty('--mobile-chat-visible', newState.showChat ? '1' : '0');

    // 向き
    root.style.setProperty('--mobile-orientation', newState.orientation);
    root.style.setProperty('--mobile-landscape-fullscreen', newState.isLandscapeFullscreen ? '1' : '0');

    // Safe area
    root.style.setProperty('--safe-area-inset-top', `${newState.safeAreaInsets.top}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${newState.safeAreaInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${newState.safeAreaInsets.left}px`);
    root.style.setProperty('--safe-area-inset-right', `${newState.safeAreaInsets.right}px`);
  }, []);

  // 状態を更新（デバウンス付き）
  const updateState = useCallback((updates: Partial<typeof state>, immediate = false) => {
    const doUpdate = () => {
      setState(prev => {
        const newState = { ...prev, ...updates };
        updateCSSVariables(newState);
        return newState;
      });
    };

    if (immediate) {
      doUpdate();
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(doUpdate, 100);
  }, [updateCSSVariables]);

  // メイン効果
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 初期高さを設定
    if (initialHeightRef.current === null) {
      initialHeightRef.current = window.innerHeight;
    }

    // キーボード判定を含むビューポート変更ハンドラ
    const handleViewportChange = () => {
      const visualViewport = window.visualViewport;
      const currentHeight = visualViewport?.height ?? window.innerHeight;
      const initialHeight = initialHeightRef.current ?? window.innerHeight;

      // 高さの差分でキーボード判定
      const heightDiff = initialHeight - currentHeight;
      const minKeyboardHeight = Math.max(100, Math.min(150, initialHeight * 0.15));
      const isKeyboardVisible = heightDiff > minKeyboardHeight;

      // 向きとフルスクリーン判定
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const orientation: Orientation = isLandscape ? 'landscape' : 'portrait';
      const isLandscapeFullscreen = checkIsLandscapeFullscreen();

      updateState({
        orientation,
        isLandscapeFullscreen,
        isKeyboardVisible,
        keyboardHeight: isKeyboardVisible ? heightDiff : 0,
        viewportHeight: currentHeight,
        isMobile: checkIsMobile(),
      });
    };

    // リサイズハンドラ
    const handleResize = () => {
      const currentHeight = window.innerHeight;

      // 現在の高さが初期高さより大きい場合、初期高さを更新
      if (currentHeight > (initialHeightRef.current ?? 0)) {
        initialHeightRef.current = currentHeight;
      }

      handleViewportChange();
    };

    // 向き変更ハンドラ
    const handleOrientationChange = () => {
      // 向き変更後に高さが安定するまで待つ
      setTimeout(() => {
        initialHeightRef.current = window.innerHeight;

        // safe-areaを再計算
        const newSafeArea = getSafeAreaInsets();

        updateState({
          safeAreaInsets: newSafeArea,
        }, true);

        handleViewportChange();
      }, 150);
    };

    // visualViewport APIがある場合はそれを使用
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);
    }

    // イベントリスナー登録
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // 初期状態を設定
    handleViewportChange();
    updateCSSVariables(state);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateState, updateCSSVariables]);

  // 縦持ちに戻ったらチャットを閉じる
  useEffect(() => {
    if (!state.isLandscapeFullscreen && state.showChat) {
      setState(prev => ({ ...prev, showChat: false }));
    }
  }, [state.isLandscapeFullscreen]);

  // チャット切り替え
  const toggleChat = useCallback(() => {
    if (state.isLandscapeFullscreen) {
      setState(prev => {
        const newState = { ...prev, showChat: !prev.showChat };
        updateCSSVariables(newState);
        return newState;
      });
    }
  }, [state.isLandscapeFullscreen, updateCSSVariables]);

  // チャットを閉じる
  const closeChat = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, showChat: false };
      updateCSSVariables(newState);
      return newState;
    });
  }, [updateCSSVariables]);

  return {
    ...state,
    toggleChat,
    closeChat,
  };
}

export type { MobileLayoutState, Orientation, SafeAreaInsets };
