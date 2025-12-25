import { useState, useCallback, useEffect } from 'react';

export interface Report {
  id: string;
  roomId: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetName: string;
  messageText: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: string;
}

export interface BannedUser {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  expiresAt: string | null;
  isGlobal: boolean;
  roomId?: string;
}

interface UseAdminOptions {
  adminSecret: string;
}

export function useAdmin({ adminSecret }: UseAdminOptions) {
  const [reports, setReports] = useState<Report[]>([]);
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/reports', {
        headers: {
          'X-Admin-Secret': adminSecret,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('認証エラー: 管理者権限がありません');
          return;
        }
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch {
      setError('通報一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [adminSecret]);

  const fetchBans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bans', {
        headers: {
          'X-Admin-Secret': adminSecret,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('認証エラー: 管理者権限がありません');
          return;
        }
        throw new Error('Failed to fetch bans');
      }

      const data = await response.json();
      setBans(data.bans || []);
    } catch {
      setError('BAN一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [adminSecret]);

  const updateReportStatus = useCallback(
    async (reportId: string, status: Report['status']): Promise<boolean> => {
      try {
        const response = await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Secret': adminSecret,
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) return false;

        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status } : r))
        );
        return true;
      } catch {
        return false;
      }
    },
    [adminSecret]
  );

  const banUser = useCallback(
    async (
      userId: string,
      reason: string,
      options: { isGlobal?: boolean; roomId?: string; expiresAt?: string } = {}
    ): Promise<boolean> => {
      try {
        const response = await fetch('/api/admin/bans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Secret': adminSecret,
          },
          body: JSON.stringify({
            user_id: userId,
            reason,
            is_global: options.isGlobal ?? true,
            room_id: options.roomId,
            expires_at: options.expiresAt,
          }),
        });

        if (!response.ok) return false;

        await fetchBans();
        return true;
      } catch {
        return false;
      }
    },
    [adminSecret, fetchBans]
  );

  const unbanUser = useCallback(
    async (banId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/admin/bans/${banId}`, {
          method: 'DELETE',
          headers: {
            'X-Admin-Secret': adminSecret,
          },
        });

        if (!response.ok) return false;

        setBans((prev) => prev.filter((b) => b.id !== banId));
        return true;
      } catch {
        return false;
      }
    },
    [adminSecret]
  );

  useEffect(() => {
    if (adminSecret) {
      fetchReports();
      fetchBans();
    }
  }, [adminSecret, fetchReports, fetchBans]);

  return {
    reports,
    bans,
    isLoading,
    error,
    fetchReports,
    fetchBans,
    updateReportStatus,
    banUser,
    unbanUser,
  };
}
