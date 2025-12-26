import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import type { YouTubePlayer, YouTubePlayerEvent } from '@/types/youtube';
import type { SyncMessage } from '@/types/message';
import { createPlayer, isPlaying } from '@/lib/youtube';

interface UseVideoSyncOptions {
  elementId: string;
  onSendSync: (message: SyncMessage) => void;
}

const SYNC_THRESHOLD = 2; // seconds

export function useVideoSync({ elementId, onSendSync }: UseVideoSyncOptions) {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  const userId = useUserStore((state) => state.id);
  const { currentVideo, playbackState, hasControlPermission } = useRoomStore();

  const sendSyncMessage = useCallback(
    (action: SyncMessage['action'], payload: SyncMessage['payload']) => {
      if (!hasControlPermission) return;

      const message: SyncMessage = {
        type: 'sync',
        action,
        payload,
        senderId: userId,
        timestamp: Date.now(),
      };
      onSendSync(message);
    },
    [userId, hasControlPermission, onSendSync]
  );

  const handleStateChange = useCallback(
    (event: YouTubePlayerEvent) => {
      if (isSyncingRef.current || !hasControlPermission) return;

      const state = event.data;
      const player = event.target;

      if (state === window.YT.PlayerState.PLAYING) {
        sendSyncMessage('play', { currentTime: player.getCurrentTime() });
      } else if (state === window.YT.PlayerState.PAUSED) {
        sendSyncMessage('pause', { currentTime: player.getCurrentTime() });
      }
    },
    [hasControlPermission, sendSyncMessage]
  );

  const initializePlayer = useCallback(async (videoId: string) => {
    try {
      const ytPlayer = await createPlayer(elementId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          enablejsapi: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            setIsReady(true);
          },
          onStateChange: handleStateChange,
        },
      });
      setPlayer(ytPlayer);
    } catch (e) {
      console.error('Failed to initialize player:', e);
    }
  }, [elementId, handleStateChange]);

  const syncToState = useCallback(
    (state: typeof playbackState) => {
      if (!player || !isReady) return;

      isSyncingRef.current = true;

      const currentTime = player.getCurrentTime();
      const diff = Math.abs(currentTime - state.currentTime);

      // Sync position if difference is significant
      if (diff > SYNC_THRESHOLD) {
        player.seekTo(state.currentTime, true);
      }

      // Sync playback state
      if (state.isPlaying && !isPlaying(player)) {
        player.playVideo();
      } else if (!state.isPlaying && isPlaying(player)) {
        player.pauseVideo();
      }

      // Sync playback rate
      if (player.getPlaybackRate() !== state.playbackRate) {
        player.setPlaybackRate(state.playbackRate);
      }

      lastSyncRef.current = Date.now();

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    },
    [player, isReady]
  );

  const play = useCallback(() => {
    if (!player || !hasControlPermission) return;
    player.playVideo();
    sendSyncMessage('play', { currentTime: player.getCurrentTime() });
  }, [player, hasControlPermission, sendSyncMessage]);

  const pause = useCallback(() => {
    if (!player || !hasControlPermission) return;
    player.pauseVideo();
    sendSyncMessage('pause', { currentTime: player.getCurrentTime() });
  }, [player, hasControlPermission, sendSyncMessage]);

  const seek = useCallback(
    (time: number) => {
      if (!player || !hasControlPermission) return;
      player.seekTo(time, true);
      sendSyncMessage('seek', { currentTime: time });
    },
    [player, hasControlPermission, sendSyncMessage]
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (!player || !hasControlPermission) return;
      player.setPlaybackRate(rate);
      sendSyncMessage('rate', { playbackRate: rate });
    },
    [player, hasControlPermission, sendSyncMessage]
  );

  const loadVideo = useCallback(
    (videoId: string, title?: string, thumbnail?: string) => {
      if (!player || !isReady || !hasControlPermission) return;
      player.loadVideoById(videoId);
      sendSyncMessage('video', { videoId, title, thumbnail });
    },
    [player, isReady, hasControlPermission, sendSyncMessage]
  );

  // Initialize or update player when video changes
  useEffect(() => {
    const videoId = currentVideo?.videoId;
    if (!videoId) return;

    if (player && isReady) {
      // Player exists and is ready, load the new video
      player.loadVideoById(videoId);
    } else if (!player) {
      // No player yet, initialize it
      initializePlayer(videoId);
    }
    // If player exists but not ready, wait for onReady callback
  }, [currentVideo?.videoId, player, isReady, initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player?.destroy();
    };
  }, [player]);

  // Sync to remote state
  useEffect(() => {
    if (playbackState.lastUpdated > lastSyncRef.current) {
      syncToState(playbackState);
    }
  }, [playbackState, syncToState]);

  return {
    player,
    isReady,
    play,
    pause,
    seek,
    setPlaybackRate,
    loadVideo,
  };
}
