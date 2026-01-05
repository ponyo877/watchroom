import { useCallback } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import type { ChatMessage } from '@/types/message';
import { createLegacyCompatibleFields } from '@/types/message';
import type { ChatMessageItem } from '@/types/room';
import { generateId } from '@/lib/utils';
import axiosInstance from '@/lib/api';

interface UseChatOptions {
  roomId: string;
  onSendMessage: (message: ChatMessage) => void;
}

export function useChat({ roomId, onSendMessage }: UseChatOptions) {
  const user = useUserStore();
  const { chatMessages, addChatMessage } = useRoomStore();

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const message: ChatMessage = {
        type: 'chat',
        payload: {
          messageId: generateId(),
          text: text.trim(),
          senderName: user.name,
          senderIconUrl: user.iconUrl,
        },
        ...createLegacyCompatibleFields(user.id),
      };

      // Add to local state immediately
      const chatItem: ChatMessageItem = {
        id: message.payload.messageId,
        text: message.payload.text,
        senderId: message.senderId,
        senderName: message.payload.senderName,
        senderIconUrl: message.payload.senderIconUrl,
        timestamp: message.timestamp,
      };
      addChatMessage(chatItem);

      // Send to other members
      onSendMessage(message);

      // Save to API (fire and forget)
      axiosInstance.post(`/api/rooms/${roomId}/messages`, {
        message_id: message.payload.messageId,
        sender_id: message.senderId,
        sender_name: message.payload.senderName,
        sender_icon_url: message.payload.senderIconUrl,
        text: message.payload.text,
      }).catch((err) => {
        console.error('Failed to save message:', err);
      });
    },
    [user, addChatMessage, onSendMessage, roomId]
  );

  const handleIncomingMessage = useCallback(
    (message: ChatMessage) => {
      // Don't add our own messages again
      if (message.senderId === user.id) return;

      const chatItem: ChatMessageItem = {
        id: message.payload.messageId,
        text: message.payload.text,
        senderId: message.senderId,
        senderName: message.payload.senderName,
        senderIconUrl: message.payload.senderIconUrl,
        timestamp: message.timestamp,
      };
      addChatMessage(chatItem);
    },
    [user.id, addChatMessage]
  );

  return {
    messages: chatMessages,
    sendMessage,
    handleIncomingMessage,
  };
}
