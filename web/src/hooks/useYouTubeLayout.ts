import { useState, useEffect, useCallback, useRef } from 'react';
import { useKeyboardState } from './useKeyboardState';

type LayoutMode = 'portrait' | 'landscape';

interface YouTubeLayoutState {
  mode: LayoutMode;
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  showLandscapeChat: boolean;
  isLandscapeFullscreen: boolean;
}

interface UseYouTubeLayoutReturn extends YouTubeLayoutState {
  toggleLandscapeChat: () => void;
  closeLandscapeChat: () => void;
  // CSSクラス用のヘルパー
  containerClass: string;
  playerClass: string;
  chatClass: string;
  chatInputClass: string;
}

/**
 * YouTube風レイアウトを管理するフック
 * 画面向き、キーボード状態、横持ち時のチャット表示を統合管理
 */
export function useYouTubeLayout(): UseYouTubeLayoutReturn {
  const { isKeyboardOpen, keyboardHeight } = useKeyboardState();

  const [mode, setMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
  });

  const [isLandscapeFullscreen, setIsLandscapeFullscreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return checkIsLandscapeFullscreen();
  });

  // 横持ちフルスクリーン判定（アスペクト比ベース）
  function checkIsLandscapeFullscreen(): boolean {
    if (typeof window === 'undefined') return false;

    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const isMobile = window.matchMedia('(max-width: 1024px)').matches;

    // アスペクト比ベースの判定（幅が高さの1.3倍以上）
    const isLandscapeAspect = window.innerWidth > window.innerHeight * 1.3;

    // 高さが画面の60%以下（横持ちモバイル特有の低い高さ）
    // screen.heightはデバイスの物理的な画面高さ
    const screenHeight = window.screen?.height || window.innerHeight;
    const isSmallHeight = window.innerHeight <= screenHeight * 0.6;

    // フォールバック: 固定値での判定（screen.heightが取得できない場合）
    const isSmallHeightFallback = window.innerHeight <= 500;

    return isLandscape && isMobile && (isLandscapeAspect || isSmallHeight || isSmallHeightFallback);
  }

  const [showLandscapeChat, setShowLandscapeChat] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 画面向き変更の検出
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLayout = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const newIsLandscapeFullscreen = checkIsLandscapeFullscreen();
      const newMode: LayoutMode = isLandscape ? 'landscape' : 'portrait';

      // デバウンスで状態更新（向き変更アニメーション中のフリッカー防止）
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setMode(newMode);
        setIsLandscapeFullscreen(newIsLandscapeFullscreen);

        // 縦持ちに戻ったらチャットを閉じる
        if (!newIsLandscapeFullscreen) {
          setShowLandscapeChat(false);
        }
      }, 150);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
    };
  }, []);

  const toggleLandscapeChat = useCallback(() => {
    if (isLandscapeFullscreen) {
      setShowLandscapeChat(prev => !prev);
    }
  }, [isLandscapeFullscreen]);

  const closeLandscapeChat = useCallback(() => {
    setShowLandscapeChat(false);
  }, []);

  // CSSクラスの計算
  const containerClass = (() => {
    let cls = 'yt-container';
    if (isLandscapeFullscreen && showLandscapeChat) {
      cls += ' yt-container--landscape-chat';
    }
    return cls;
  })();

  const playerClass = (() => {
    if (isLandscapeFullscreen) {
      return showLandscapeChat ? 'yt-player yt-player--landscape-split' : 'yt-player yt-player--landscape-full';
    }
    // 縦持ち
    return isKeyboardOpen ? 'yt-player yt-player--portrait-kb' : 'yt-player yt-player--portrait';
  })();

  const chatClass = (() => {
    if (isLandscapeFullscreen) {
      return 'yt-chat yt-chat--landscape';
    }
    return 'yt-chat';
  })();

  const chatInputClass = (() => {
    if (isLandscapeFullscreen && isKeyboardOpen) {
      return 'yt-chat-input yt-chat-input--landscape-kb';
    }
    if (!isLandscapeFullscreen) {
      return 'yt-chat-input yt-chat-input--portrait';
    }
    return 'yt-chat-input';
  })();

  return {
    mode,
    isKeyboardOpen,
    keyboardHeight,
    showLandscapeChat,
    isLandscapeFullscreen,
    toggleLandscapeChat,
    closeLandscapeChat,
    containerClass,
    playerClass,
    chatClass,
    chatInputClass,
  };
}
