import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import type { YouTubePlayer, YouTubePlayerEvent } from '@/types/youtube';
import type {
  SyncMessage,
  StateRequestMessage,
  StateResponseMessage,
  HeartbeatMessage,
} from '@/types/message';
import { createPlayer, isPlaying } from '@/lib/youtube';

interface UseVideoSyncOptions {
  elementId: string;
  onSendSync: (message: SyncMessage) => void;
  onSendStateRequest: (message: StateRequestMessage) => void;
  onSendStateResponse: (message: StateResponseMessage) => void;
  onSendHeartbeat: (message: HeartbeatMessage) => void;
}

const SYNC_THRESHOLD = 2; // seconds - only sync if difference > 2 seconds
const HEARTBEAT_INTERVAL = 5000; // 5 seconds between heartbeats
const STATE_RESPONSE_TIMEOUT = 1000; // Wait 1 second for state responses
const MAX_VIDEO_READY_RETRIES = 50; // 5 seconds (100ms × 50)

export function useVideoSync({
  elementId,
  onSendSync,
  onSendStateRequest,
  onSendStateResponse,
  onSendHeartbeat,
}: UseVideoSyncOptions) {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef(false);
  const hasInitialSyncRef = useRef(false);
  const isInitializingRef = useRef(false);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // State Request Protocol
  const pendingStateRequestRef = useRef<string | null>(null);
  const stateResponsesRef = useRef<StateResponseMessage[]>([]);
  const stateResponseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to hold latest callback versions (to avoid stale closures in setTimeout)
  const processBestStateResponseRef = useRef<() => void>(() => {});
  const syncToStateRef = useRef<(state: typeof playbackState, isInitialSync?: boolean) => void>(() => {});

  // Track user interaction for autoplay policy
  const hasUserInteractionRef = useRef(false);

  const userId = useUserStore((state) => state.id);
  const { currentVideo, playbackState, hasControlPermission } = useRoomStore();

  // Track user interaction (click/touch anywhere on page)
  useEffect(() => {
    const handleInteraction = () => {
      hasUserInteractionRef.current = true;
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

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

  // Generate unique request ID
  const generateRequestId = useCallback(() => {
    return `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, [userId]);

  // Send state request for late joiner sync
  const sendStateRequest = useCallback(() => {
    const requestId = generateRequestId();
    pendingStateRequestRef.current = requestId;
    stateResponsesRef.current = [];

    const message: StateRequestMessage = {
      type: 'state_request',
      payload: { requestId },
      senderId: userId,
      timestamp: Date.now(),
    };
    onSendStateRequest(message);

    // Set timeout to process responses
    if (stateResponseTimeoutRef.current) {
      clearTimeout(stateResponseTimeoutRef.current);
    }
    stateResponseTimeoutRef.current = setTimeout(() => {
      // Use ref to get the latest version of the callback (avoids stale closure)
      processBestStateResponseRef.current();
    }, STATE_RESPONSE_TIMEOUT);
  }, [userId, onSendStateRequest, generateRequestId]);

  // Process the best state response (most recent responderTime)
  const processBestStateResponse = useCallback(() => {
    const responses = stateResponsesRef.current;
    if (responses.length === 0) {
      console.log('[useVideoSync] No state responses received, using room metadata');
      // Fall back to room metadata sync (existing behavior)
      if (player && isReady && playbackState.lastUpdated > 0) {
        // Use ref to get latest syncToState (avoids stale closure)
        syncToStateRef.current(playbackState, true);
      }
      hasInitialSyncRef.current = true;
      pendingStateRequestRef.current = null;
      return;
    }

    // Find the response with the most recent responderTime
    const bestResponse = responses.reduce((best, current) =>
      current.payload.responderTime > best.payload.responderTime ? current : best
    );

    console.log('[useVideoSync] Processing best state response:', bestResponse);

    // Calculate adjusted time based on network latency
    const networkLatency = (Date.now() - bestResponse.timestamp) / 1000;
    let adjustedTime = bestResponse.payload.currentTime;
    if (bestResponse.payload.isPlaying) {
      adjustedTime += networkLatency * bestResponse.payload.playbackRate;
    }

    // Apply the state
    if (player && isReady) {
      const state = {
        currentTime: adjustedTime,
        isPlaying: bestResponse.payload.isPlaying,
        playbackRate: bestResponse.payload.playbackRate,
        lastUpdated: Date.now(),
      };
      // Use ref to get latest syncToState (avoids stale closure)
      syncToStateRef.current(state, true);
    }

    hasInitialSyncRef.current = true;
    pendingStateRequestRef.current = null;
    stateResponsesRef.current = [];
  }, [player, isReady, playbackState]);

  // Handle incoming state request - respond with current player state
  const handleStateRequest = useCallback(
    (message: StateRequestMessage) => {
      // Only respond if we have a player and video
      if (!player || !isReady || !currentVideo?.videoId) return;
      // Don't respond to our own requests
      if (message.senderId === userId) return;

      const currentTime = player.getCurrentTime();
      const currentIsPlaying = isPlaying(player);
      const currentRate = player.getPlaybackRate();

      const response: StateResponseMessage = {
        type: 'state_response',
        payload: {
          requestId: message.payload.requestId,
          videoId: currentVideo.videoId,
          title: currentVideo.title,
          thumbnail: currentVideo.thumbnail,
          currentTime,
          isPlaying: currentIsPlaying,
          playbackRate: currentRate,
          responderId: userId,
          responderTime: Date.now(),
        },
        senderId: userId,
        timestamp: Date.now(),
      };

      onSendStateResponse(response);
    },
    [player, isReady, currentVideo, userId, onSendStateResponse]
  );

  // Handle incoming state response
  const handleStateResponse = useCallback((message: StateResponseMessage) => {
    // Only process if this is a response to our pending request
    if (
      !pendingStateRequestRef.current ||
      message.payload.requestId !== pendingStateRequestRef.current
    ) {
      return;
    }

    // Collect the response
    stateResponsesRef.current.push(message);
    console.log('[useVideoSync] Received state response:', message);
  }, []);

  // Handle heartbeat messages
  const handleHeartbeat = useCallback(
    (message: HeartbeatMessage) => {
      // Ignore our own heartbeats
      if (message.senderId === userId) return;
      // Only process if initial sync is done
      if (!hasInitialSyncRef.current) return;
      // Don't process if we have control permission (we're the authority)
      if (hasControlPermission) return;

      const networkLatency = (Date.now() - message.timestamp) / 1000;
      let adjustedTime = message.payload.currentTime;
      if (message.payload.isPlaying) {
        adjustedTime += networkLatency * message.payload.playbackRate;
      }

      // Only sync if difference is significant
      if (player && isReady) {
        const currentTime = player.getCurrentTime();
        const diff = Math.abs(currentTime - adjustedTime);
        if (diff > SYNC_THRESHOLD) {
          console.log(`[useVideoSync] Heartbeat sync: diff=${diff.toFixed(2)}s`);
          // Use ref to get latest syncToState (avoids stale closure)
          syncToStateRef.current({
            currentTime: adjustedTime,
            isPlaying: message.payload.isPlaying,
            playbackRate: message.payload.playbackRate,
            lastUpdated: Date.now(),
          });
        }
      }
    },
    [userId, hasControlPermission, player, isReady]
  );

  // Send heartbeat if we have control permission
  const sendHeartbeat = useCallback(() => {
    if (!player || !isReady || !hasControlPermission || !currentVideo?.videoId) return;

    const message: HeartbeatMessage = {
      type: 'heartbeat',
      payload: {
        videoId: currentVideo.videoId,
        currentTime: player.getCurrentTime(),
        isPlaying: isPlaying(player),
        playbackRate: player.getPlaybackRate(),
      },
      senderId: userId,
      timestamp: Date.now(),
    };

    onSendHeartbeat(message);
  }, [player, isReady, hasControlPermission, currentVideo, userId, onSendHeartbeat]);

  // Start/stop heartbeat interval based on control permission
  useEffect(() => {
    if (hasControlPermission && isReady && player) {
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    } else if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [hasControlPermission, isReady, player, sendHeartbeat]);

  const handleStateChange = useCallback(
    (event: YouTubePlayerEvent) => {
      // Don't send sync messages until initial sync is complete
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

  const initializePlayer = useCallback(
    async (videoId: string) => {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;

      try {
        const ytPlayer = await createPlayer(elementId, {
          height: '100%',
          width: '100%',
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            enablejsapi: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            disablekb: 1,
          },
          events: {
            onReady: () => {
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
    },
    [elementId, handleStateChange]
  );

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
        // For initial sync (late joiners)
        if (isInitialSync) {
          // Try to play with sound first if user has interacted
          if (hasUserInteractionRef.current) {
            player.playVideo();
          } else {
            // Fall back to muted play for autoplay policy
            player.mute();
            player.playVideo();
          }
        } else {
          player.playVideo();
        }
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

  // Keep refs updated to avoid stale closures in setTimeout callbacks
  useEffect(() => {
    syncToStateRef.current = syncToState;
  }, [syncToState]);

  useEffect(() => {
    processBestStateResponseRef.current = processBestStateResponse;
  }, [processBestStateResponse]);

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
      player.loadVideoById(videoId);
    } else if (!player && !isInitializingRef.current) {
      initializePlayer(videoId);
    }
  }, [currentVideo?.videoId, player, isReady, initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player?.destroy();
      isInitializingRef.current = false;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (stateResponseTimeoutRef.current) {
        clearTimeout(stateResponseTimeoutRef.current);
      }
    };
  }, [player]);

  // Initial sync when player becomes ready (for late joiners)
  useEffect(() => {
    if (isReady && player && !hasInitialSyncRef.current) {
      if (playbackState.lastUpdated > 0) {
        // Late joiner: use State Request Protocol
        console.log('[useVideoSync] Late joiner detected, sending state request');

        let retryCount = 0;
        const waitForVideoReady = () => {
          const playerState = player.getPlayerState();

          if (retryCount >= MAX_VIDEO_READY_RETRIES) {
            console.warn('[useVideoSync] Video ready timeout, sending state request');
            sendStateRequest();
            return;
          }

          // UNSTARTED(-1) or BUFFERING(3) means still loading
          if (playerState === -1 || playerState === 3) {
            retryCount++;
            setTimeout(waitForVideoReady, 100);
          } else {
            // Video is ready, send state request
            sendStateRequest();
          }
        };
        setTimeout(waitForVideoReady, 100);
      } else {
        // First user (creator): no state to sync
        hasInitialSyncRef.current = true;
      }
    }
  }, [isReady, player, playbackState.lastUpdated, sendStateRequest]);

  // Sync to remote state changes (for ongoing sync after initial)
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
    handleStateRequest,
    handleStateResponse,
    handleHeartbeat,
  };
}
