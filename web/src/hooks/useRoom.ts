import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import { useSkyWay } from './useSkyWay';
import { useChat } from './useChat';
import { useReaction } from './useReaction';
import type { DataStreamMessage, SyncMessage, ChatMessage, ReactionMessage } from '@/types/message';

interface UseRoomOptions {
  roomId: string;
}

export function useRoom({ roomId }: UseRoomOptions) {
  const navigate = useNavigate();
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

  // Main message handler that uses refs
  const handleMessage = useCallback((message: DataStreamMessage) => {
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
    }
  }, []);

  const {
    isConnected,
    error: skyWayError,
    sendMessage,
    updateRoomMetadata,
  } = useSkyWay({
    roomName: roomId,
    token,
    onMessage: handleMessage,
  });

  const { messages, sendMessage: sendChatMessage, handleIncomingMessage: handleChatMessage } = useChat({
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
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setTokenError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, roomId]);

  const leaveRoom = useCallback(() => {
    roomStoreActions.reset();
    navigate('/');
  }, [roomStoreActions, navigate]);

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
