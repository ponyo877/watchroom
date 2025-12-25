import { useCallback, useEffect, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const userId = useUserStore((state) => state.id);
  const roomStore = useRoomStore();

  const handleMessage = useCallback((message: DataStreamMessage) => {
    switch (message.type) {
      case 'sync':
        handleSyncMessage(message);
        break;
      case 'chat':
        handleChatMessage(message);
        break;
      case 'reaction':
        handleReactionMessage(message);
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

  const handleSyncMessage = useCallback(
    (message: SyncMessage) => {
      if (message.senderId === userId) return;

      const { action, payload } = message;

      switch (action) {
        case 'play':
          roomStore.setPlaybackState({
            isPlaying: true,
            currentTime: payload.currentTime ?? 0,
            lastUpdated: message.timestamp,
          });
          break;
        case 'pause':
          roomStore.setPlaybackState({
            isPlaying: false,
            currentTime: payload.currentTime ?? 0,
            lastUpdated: message.timestamp,
          });
          break;
        case 'seek':
          roomStore.setPlaybackState({
            currentTime: payload.currentTime ?? 0,
            lastUpdated: message.timestamp,
          });
          break;
        case 'rate':
          roomStore.setPlaybackState({
            playbackRate: payload.playbackRate ?? 1,
            lastUpdated: message.timestamp,
          });
          break;
        case 'video':
          if (payload.videoId) {
            roomStore.setCurrentVideo({
              videoId: payload.videoId,
              title: payload.title ?? '',
              thumbnail: payload.thumbnail ?? '',
            });
          }
          break;
      }
    },
    [userId, roomStore]
  );

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
        throw new Error('Failed to get token');
      }

      const data = await response.json();
      setToken(data.token);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, roomId]);

  const leaveRoom = useCallback(() => {
    roomStore.reset();
    navigate('/');
  }, [roomStore, navigate]);

  useEffect(() => {
    if (userId) {
      fetchToken();
    }
  }, [userId, fetchToken]);

  useEffect(() => {
    if (skyWayError) {
      setError(skyWayError.message);
    }
  }, [skyWayError]);

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
