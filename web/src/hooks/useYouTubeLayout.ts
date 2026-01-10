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
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const isSmallHeight = window.innerHeight <= 500;
    const isMobile = window.matchMedia('(max-width: 1024px)').matches;
    return isLandscape && isSmallHeight && isMobile;
  });

  const [showLandscapeChat, setShowLandscapeChat] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 画面向き変更の検出
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLayout = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isSmallHeight = window.innerHeight <= 500;
      const isMobile = window.matchMedia('(max-width: 1024px)').matches;
      const newIsLandscapeFullscreen = isLandscape && isSmallHeight && isMobile;
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
