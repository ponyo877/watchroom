import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@lingui/macro';

interface ShortUrlInfo {
  roomId: string;
  hasPassword: boolean;
}

export function useShortUrl(shortId: string | undefined) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<ShortUrlInfo | null>(null);

  const resolveShortUrl = useCallback(async () => {
    if (!shortId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/r/${shortId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError(t`Room not found`);
        } else {
          setError(t`An error occurred`);
        }
        return;
      }

      const data = await response.json();
      setRoomInfo({
        roomId: data.room_id,
        hasPassword: data.has_password,
      });
    } catch (err) {
      setError(t`An error occurred`);
    } finally {
      setIsLoading(false);
    }
  }, [shortId]);

  const redirectToRoom = useCallback(() => {
    if (roomInfo) {
      navigate(`/room/${roomInfo.roomId}`, { replace: true });
    }
  }, [roomInfo, navigate]);

  useEffect(() => {
    if (shortId) {
      resolveShortUrl();
    }
  }, [shortId, resolveShortUrl]);

  return {
    isLoading,
    error,
    roomInfo,
    redirectToRoom,
  };
}
