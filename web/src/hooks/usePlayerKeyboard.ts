import { useEffect, useCallback } from 'react';
import type { YouTubePlayer } from '@/types/youtube';

interface UsePlayerKeyboardOptions {
  player: YouTubePlayer | null;
  isReady: boolean;
  hasControlPermission: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

export function usePlayerKeyboard({
  player,
  isReady,
  hasControlPermission,
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
}: UsePlayerKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if no player or not ready
      if (!player || !isReady) return;

      switch (e.key.toLowerCase()) {
        // Play/Pause: Space or K
        case ' ':
        case 'k':
          e.preventDefault();
          if (hasControlPermission) {
            if (isPlaying) {
              onPause();
            } else {
              onPlay();
            }
          }
          break;

        // Seek backward 10s: J
        case 'j':
          e.preventDefault();
          if (hasControlPermission) {
            const newTime = Math.max(0, currentTime - 10);
            onSeek(newTime);
          }
          break;

        // Seek forward 10s: L
        case 'l':
          e.preventDefault();
          if (hasControlPermission) {
            const newTime = Math.min(duration, currentTime + 10);
            onSeek(newTime);
          }
          break;

        // Seek backward 5s: ArrowLeft
        case 'arrowleft':
          e.preventDefault();
          if (hasControlPermission) {
            const newTime = Math.max(0, currentTime - 5);
            onSeek(newTime);
          }
          break;

        // Seek forward 5s: ArrowRight
        case 'arrowright':
          e.preventDefault();
          if (hasControlPermission) {
            const newTime = Math.min(duration, currentTime + 5);
            onSeek(newTime);
          }
          break;

        // Volume up: ArrowUp (local only)
        case 'arrowup':
          e.preventDefault();
          const newVolumeUp = Math.min(100, volume + 10);
          onVolumeChange(newVolumeUp);
          break;

        // Volume down: ArrowDown (local only)
        case 'arrowdown':
          e.preventDefault();
          const newVolumeDown = Math.max(0, volume - 10);
          onVolumeChange(newVolumeDown);
          break;

        // Mute toggle: M (local only)
        case 'm':
          e.preventDefault();
          onMuteToggle();
          break;
      }
    },
    [
      player,
      isReady,
      hasControlPermission,
      isPlaying,
      currentTime,
      duration,
      volume,
      onPlay,
      onPause,
      onSeek,
      onVolumeChange,
      onMuteToggle,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
