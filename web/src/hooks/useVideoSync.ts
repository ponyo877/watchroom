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
  const hasInitialSyncRef = useRef(false);
  const isInitializingRef = useRef(false);

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
      // Don't send sync messages until initial sync is complete (prevents late joiners from resetting position)
      if (!hasInitialSyncRef.current || isSyncingRef.current || !hasControlPermission) return;

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
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      const ytPlayer = await createPlayer(elementId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0, // Disable native controls - use custom PlayerControls instead
          enablejsapi: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          disablekb: 1, // Disable keyboard controls
        },
        events: {
          onReady: () => {
            // Only set player after it's fully ready
            setPlayer(ytPlayer);
            setIsReady(true);
          },
          onStateChange: handleStateChange,
        },
      });
    } catch (e) {
      console.error('Failed to initialize player:', e);
      isInitializingRef.current = false;
    }
  }, [elementId, handleStateChange]);

  const syncToState = useCallback(
    (state: typeof playbackState, isInitialSync = false) => {
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
        // For initial sync (late joiners), mute to bypass browser autoplay policy
        if (isInitialSync) {
          player.mute();
        }
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

    if (player && isReady && typeof player.loadVideoById === 'function') {
      // Player exists and is ready, load the new video
      player.loadVideoById(videoId);
      // Note: Don't reset hasInitialSyncRef here to avoid race condition
    } else if (!player && !isInitializingRef.current) {
      // No player yet and not currently initializing, initialize it
      initializePlayer(videoId);
    }
    // If player exists but not ready, or currently initializing, wait for onReady callback
  }, [currentVideo?.videoId, player, isReady, initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player?.destroy();
      isInitializingRef.current = false;
    };
  }, [player]);

  // Initial sync when player becomes ready (for late joiners)
  useEffect(() => {
    if (isReady && player && !hasInitialSyncRef.current) {
      if (playbackState.lastUpdated > 0) {
        // Late joiner: sync to existing state
        hasInitialSyncRef.current = true;

        let retryCount = 0;
        const maxRetries = 50; // 5 seconds (100ms × 50)

        // Wait for video to finish loading before syncing
        const waitForVideoReady = () => {
          const playerState = player.getPlayerState();

          // Timeout: force sync after max retries
          if (retryCount >= maxRetries) {
            console.warn('[useVideoSync] Video ready timeout, forcing sync');
            syncToState(playbackState, true); // isInitialSync = true
            return;
          }

          // UNSTARTED(-1) or BUFFERING(3) means still loading
          if (playerState === -1 || playerState === 3) {
            retryCount++;
            setTimeout(waitForVideoReady, 100);
          } else {
            syncToState(playbackState, true); // isInitialSync = true
          }
        };
        setTimeout(waitForVideoReady, 100);
      } else {
        // First user (creator): no state to sync, allow sending sync messages immediately
        hasInitialSyncRef.current = true;
      }
    }
  }, [isReady, player, playbackState, syncToState]);

  // Sync to remote state changes
  useEffect(() => {
    if (hasInitialSyncRef.current && playbackState.lastUpdated > lastSyncRef.current) {
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
