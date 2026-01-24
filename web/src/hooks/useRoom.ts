import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import { useLanguage } from '@/i18n/useLanguage';
import { useSkyWay } from './useSkyWay';
import { useChat } from './useChat';
import { useReaction } from './useReaction';
import type {
  DataStreamMessage,
  SyncMessage,
  ChatMessage,
  ReactionMessage,
  StateRequestMessage,
  StateResponseMessage,
  HeartbeatMessage,
} from '@/types/message';

interface UseRoomOptions {
  roomId: string;
  onStateRequest?: (message: StateRequestMessage) => void;
  onStateResponse?: (message: StateResponseMessage) => void;
  onHeartbeat?: (message: HeartbeatMessage) => void;
}

export function useRoom({
  roomId,
  onStateRequest,
  onStateResponse,
  onHeartbeat,
}: UseRoomOptions) {
  const { navigateHome } = useLanguage();
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const userId = useUserStore((state) => state.id);
  // Get store actions without subscribing to state changes
  const roomStoreActions = useRef(useRoomStore.getState()).current;

  // Message handler refs to avoid stale closures
  const handleSyncMessageRef = useRef<(message: SyncMessage) => void>(() => {});
  const handleChatMessageRef = useRef<(message: ChatMessage) => void>(() => {});
  const handleReactionMessageRef = useRef<(message: ReactionMessage) => void>(() => {});
  const handleStateRequestRef = useRef<(message: StateRequestMessage) => void>(() => {});
  const handleStateResponseRef = useRef<(message: StateResponseMessage) => void>(() => {});
  const handleHeartbeatRef = useRef<(message: HeartbeatMessage) => void>(() => {});

  // Main message handler that uses refs
  const handleMessage = useCallback((message: DataStreamMessage) => {
    console.log('[useRoom] handleMessage:', message.type, message.senderId);
    switch (message.type) {
      case 'sync':
        handleSyncMessageRef.current(message as SyncMessage);
        break;
      case 'chat':
        handleChatMessageRef.current(message as ChatMessage);
        break;
      case 'reaction':
        handleReactionMessageRef.current(message as ReactionMessage);
        break;
      case 'state_request':
        handleStateRequestRef.current(message as StateRequestMessage);
        break;
      case 'state_response':
        handleStateResponseRef.current(message as StateResponseMessage);
        break;
      case 'heartbeat':
        handleHeartbeatRef.current(message as HeartbeatMessage);
        break;
    }
  }, []);

  const {
    isConnected,
    isDataStreamReady,
    error: skyWayError,
    sendMessage,
    updateRoomMetadata,
  } = useSkyWay({
    roomName: roomId,
    token,
    onMessage: handleMessage,
  });

  const { messages, sendMessage: sendChatMessage, handleIncomingMessage: handleChatMessage } = useChat({
    roomId,
    onSendMessage: (msg) => sendMessage(msg),
  });

  const { reactions, sendReaction, handleIncomingReaction: handleReactionMessage } = useReaction({
    onSendReaction: (msg) => sendMessage(msg),
  });

  // Update chat message handler ref
  useEffect(() => {
    handleChatMessageRef.current = handleChatMessage;
  }, [handleChatMessage]);

  // Update reaction message handler ref
  useEffect(() => {
    handleReactionMessageRef.current = handleReactionMessage;
  }, [handleReactionMessage]);

  // Update state request handler ref
  useEffect(() => {
    if (onStateRequest) {
      handleStateRequestRef.current = onStateRequest;
    }
  }, [onStateRequest]);

  // Update state response handler ref
  // Also extract video info and playback state from state response for late joiners
  useEffect(() => {
    handleStateResponseRef.current = (message: StateResponseMessage) => {
      // Extract video info for late joiners who don't have current video set
      const currentVideo = useRoomStore.getState().currentVideo;
      if (!currentVideo && message.payload.videoId) {
        roomStoreActions.setCurrentVideo({
          videoId: message.payload.videoId,
          title: message.payload.title ?? '',
          thumbnail: message.payload.thumbnail ?? '',
        });
      }

      // Also extract playback state for late joiners
      const playbackState = useRoomStore.getState().playbackState;
      if (playbackState.lastUpdated === 0 && message.payload.videoId) {
        roomStoreActions.setPlaybackState({
          currentTime: message.payload.currentTime,
          isPlaying: message.payload.isPlaying,
          playbackRate: message.payload.playbackRate,
          lastUpdated: message.timestamp,
        });
      }

      // Also call the external handler if provided
      onStateResponse?.(message);
    };
  }, [onStateResponse, roomStoreActions]);

  // Update heartbeat handler ref
  // Also extract video info and playback state from heartbeat for late joiners
  useEffect(() => {
    handleHeartbeatRef.current = (message: HeartbeatMessage) => {
      // Extract video info for late joiners who don't have current video set
      const currentVideo = useRoomStore.getState().currentVideo;
      if (!currentVideo && message.payload.videoId) {
        roomStoreActions.setCurrentVideo({
          videoId: message.payload.videoId,
          title: '', // Heartbeat doesn't include title/thumbnail
          thumbnail: '',
        });
      }

      // Also extract playback state for late joiners
      const playbackState = useRoomStore.getState().playbackState;
      if (playbackState.lastUpdated === 0 && message.payload.videoId) {
        roomStoreActions.setPlaybackState({
          currentTime: message.payload.currentTime,
          isPlaying: message.payload.isPlaying,
          playbackRate: message.payload.playbackRate,
          lastUpdated: message.timestamp,
        });
      }

      // Also call the external handler if provided
      onHeartbeat?.(message);
    };
  }, [onHeartbeat, roomStoreActions]);

  // Sync message handler
  const handleSyncMessage = useCallback(
    (message: SyncMessage) => {
      if (message.senderId === userId) return;

      const { action, payload } = message;

      switch (action) {
        case 'play':
          roomStoreActions.setPlaybackState({
            isPlaying: true,
            currentTime: payload.currentTime ?? 0,
            lastUpdated: message.timestamp,
          });
          break;
        case 'pause':
          roomStoreActions.setPlaybackState({
            isPlaying: false,
            currentTime: payload.currentTime ?? 0,
            lastUpdated: message.timestamp,
          });
          break;
        case 'seek':
          roomStoreActions.setPlaybackState({
            currentTime: payload.currentTime ?? 0,
            lastUpdated: message.timestamp,
          });
          break;
        case 'rate':
          roomStoreActions.setPlaybackState({
            playbackRate: payload.playbackRate ?? 1,
            lastUpdated: message.timestamp,
          });
          break;
        case 'video':
          if (payload.videoId) {
            roomStoreActions.setCurrentVideo({
              videoId: payload.videoId,
              title: payload.title ?? '',
              thumbnail: payload.thumbnail ?? '',
            });
          }
          break;
      }
    },
    [userId, roomStoreActions]
  );

  // Update sync message handler ref
  useEffect(() => {
    handleSyncMessageRef.current = handleSyncMessage;
  }, [handleSyncMessage]);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setTokenError(null);

      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          room_name: roomId,
        }),
      });

      if (!response.ok) {
        // Try to parse error response
        try {
          const errorData = await response.json();
          if (errorData.message) {
            throw new Error(errorData.message);
          }
        } catch {
          // If parsing fails, use generic error
        }
        throw new Error('Failed to get token');
      }

      const data = await response.json();
      setToken(data.token);

      // Fetch past messages
      try {
        const messagesResponse = await fetch(`/api/rooms/${roomId}/messages?limit=50`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          const pastMessages = messagesData.messages || [];
          pastMessages.forEach((msg: { message_id: string; text: string; sender_id: string; sender_name: string; sender_icon_url?: string; timestamp: number }) => {
            roomStoreActions.addChatMessage({
              id: msg.message_id,
              type: 'message',
              text: msg.text,
              senderId: msg.sender_id,
              senderName: msg.sender_name,
              senderIconUrl: msg.sender_icon_url || '',
              timestamp: msg.timestamp,
            });
          });
        }
      } catch (err) {
        console.error('Failed to fetch past messages:', err);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setTokenError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, roomId, roomStoreActions]);

  const leaveRoom = useCallback(() => {
    roomStoreActions.reset();
    navigateHome();
  }, [roomStoreActions, navigateHome]);

  useEffect(() => {
    if (userId && roomId) {
      fetchToken();
    }
  }, [userId, roomId, fetchToken]);

  // Derive combined error during rendering (not via Effect)
  const error = tokenError ?? skyWayError?.message ?? null;

  return {
    isLoading,
    isConnected,
    isDataStreamReady,
    error,
    messages,
    reactions,
    sendChatMessage,
    sendReaction,
    sendMessage,
    updateRoomMetadata,
    leaveRoom,
  };
}
