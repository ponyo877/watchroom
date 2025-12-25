import { useCallback } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import type { ChatMessage } from '@/types/message';
import type { ChatMessageItem } from '@/types/room';
import { generateId } from '@/lib/utils';

interface UseChatOptions {
  onSendMessage: (message: ChatMessage) => void;
}

export function useChat({ onSendMessage }: UseChatOptions) {
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
        senderId: user.id,
        timestamp: Date.now(),
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
    },
    [user, addChatMessage, onSendMessage]
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
