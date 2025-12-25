import { useCallback } from 'react';

interface UseModerationOptions {
  roomId: string;
  onKickSuccess?: (userId: string) => void;
  onBanSuccess?: (userId: string) => void;
}

export function useModeration({
  roomId,
  onKickSuccess,
  onBanSuccess,
}: UseModerationOptions) {
  const kickUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/kick`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        });

        if (!response.ok) return false;

        onKickSuccess?.(userId);
        return true;
      } catch {
        return false;
      }
    },
    [roomId, onKickSuccess]
  );

  const banUser = useCallback(
    async (userId: string, reason: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/ban`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            reason,
          }),
        });

        if (!response.ok) return false;

        onBanSuccess?.(userId);
        return true;
      } catch {
        return false;
      }
    },
    [roomId, onBanSuccess]
  );

  return {
    kickUser,
    banUser,
  };
}
