import { useCallback, useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import type { ChatMessageItem } from '@/types/room';

interface UseReportOptions {
  roomId: string;
}

export function useReport({ roomId }: UseReportOptions) {
  const userId = useUserStore((state) => state.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = useCallback(
    async (message: ChatMessageItem, reason: string): Promise<boolean> => {
      if (!roomId || !message) return false;

      setIsSubmitting(true);

      try {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          body: JSON.stringify({
            room_id: roomId,
            target_id: message.senderId,
            message_text: message.text,
            reason,
          }),
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        return !!data.id;
      } catch {
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [roomId, userId]
  );

  return {
    submitReport,
    isSubmitting,
  };
}
