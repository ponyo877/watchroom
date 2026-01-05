import { useCallback, useEffect, useRef } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import type { ReactionMessage } from '@/types/message';
import { createLegacyCompatibleFields } from '@/types/message';
import type { ReactionItem } from '@/types/room';
import { generateId } from '@/lib/utils';

const REACTION_DURATION = 3000; // 3 seconds

interface UseReactionOptions {
  onSendReaction: (message: ReactionMessage) => void;
}

export function useReaction({ onSendReaction }: UseReactionOptions) {
  const userId = useUserStore((state) => state.id);
  const { reactions, addReaction, removeReaction } = useRoomStore();

  // Use ref to avoid interval reset on every reaction change
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;

  const sendReaction = useCallback(
    (emoji: string) => {
      const message: ReactionMessage = {
        type: 'reaction',
        payload: { emoji },
        ...createLegacyCompatibleFields(userId),
      };

      // Add to local state
      const reactionItem: ReactionItem = {
        id: generateId(),
        emoji,
        senderId: userId,
        timestamp: Date.now(),
      };
      addReaction(reactionItem);

      // Send to other members
      onSendReaction(message);

      // Remove after duration
      setTimeout(() => {
        removeReaction(reactionItem.id);
      }, REACTION_DURATION);
    },
    [userId, addReaction, removeReaction, onSendReaction]
  );

  const handleIncomingReaction = useCallback(
    (message: ReactionMessage) => {
      if (message.senderId === userId) return;

      const reactionItem: ReactionItem = {
        id: generateId(),
        emoji: message.payload.emoji,
        senderId: message.senderId,
        timestamp: message.timestamp,
      };
      addReaction(reactionItem);

      // Remove after duration
      setTimeout(() => {
        removeReaction(reactionItem.id);
      }, REACTION_DURATION);
    },
    [userId, addReaction, removeReaction]
  );

  // Cleanup old reactions (use ref to avoid interval reset on every change)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      reactionsRef.current
        .filter((r) => now - r.timestamp > REACTION_DURATION)
        .forEach((r) => removeReaction(r.id));
    }, 1000);

    return () => clearInterval(interval);
  }, [removeReaction]);

  return {
    reactions,
    sendReaction,
    handleIncomingReaction,
  };
}
