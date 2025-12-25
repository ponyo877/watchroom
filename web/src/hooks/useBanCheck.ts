import { useState, useCallback, useEffect } from 'react';

interface UseBanCheckOptions {
  userId: string;
  roomId?: string;
}

export function useBanCheck({ userId, roomId }: UseBanCheckOptions) {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkBanStatus = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const url = roomId
        ? `/api/bans/check/${userId}?room_id=${roomId}`
        : `/api/bans/check/${userId}`;

      const response = await fetch(url);
      const data = await response.json();

      setIsBanned(data.is_banned);
      setBanReason(data.reason || null);
    } catch {
      setIsBanned(false);
      setBanReason(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, roomId]);

  useEffect(() => {
    checkBanStatus();
  }, [checkBanStatus]);

  return {
    isBanned,
    banReason,
    isLoading,
    recheckBan: checkBanStatus,
  };
}
