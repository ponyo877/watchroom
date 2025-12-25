import { useCallback, useState } from 'react';
import type { VideoHistoryItem, VideoInfo } from '@/types/skyway';

const MAX_HISTORY_SIZE = 20;

interface UsePlayHistoryOptions {
  onUpdateRoomMetadata?: (history: VideoHistoryItem[]) => void;
}

export function usePlayHistory({ onUpdateRoomMetadata }: UsePlayHistoryOptions = {}) {
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);

  const addToHistory = useCallback(
    (video: VideoInfo) => {
      setHistory((prev) => {
        // Remove duplicate if exists
        const filtered = prev.filter((v) => v.videoId !== video.videoId);

        // Add to front
        const newHistory: VideoHistoryItem[] = [
          { ...video, playedAt: Date.now() },
          ...filtered,
        ].slice(0, MAX_HISTORY_SIZE);

        // Update room metadata
        onUpdateRoomMetadata?.(newHistory);

        return newHistory;
      });
    },
    [onUpdateRoomMetadata]
  );

  const removeFromHistory = useCallback(
    (videoId: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter((v) => v.videoId !== videoId);
        onUpdateRoomMetadata?.(newHistory);
        return newHistory;
      });
    },
    [onUpdateRoomMetadata]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    onUpdateRoomMetadata?.([]);
  }, [onUpdateRoomMetadata]);

  const syncHistory = useCallback((remoteHistory: VideoHistoryItem[]) => {
    setHistory(remoteHistory);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    syncHistory,
  };
}
