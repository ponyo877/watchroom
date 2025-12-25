import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
          setError('部屋が見つかりません');
        } else {
          setError('エラーが発生しました');
        }
        return;
      }

      const data = await response.json();
      setRoomInfo({
        roomId: data.room_id,
        hasPassword: data.has_password,
      });
    } catch (err) {
      setError('エラーが発生しました');
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
