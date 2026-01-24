import { useState, useCallback, useEffect } from 'react';
import { t } from '@lingui/macro';

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
  username: string;
  password: string;
}

export function useAdmin({ username, password }: UseAdminOptions) {
  const [reports, setReports] = useState<Report[]>([]);
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeader = `Basic ${btoa(`${username}:${password}`)}`;

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/reports', {
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError(t`Authentication error: No admin privileges`);
          return;
        }
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch {
      setError(t`Failed to fetch reports`);
    } finally {
      setIsLoading(false);
    }
  }, [authHeader]);

  const fetchBans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bans', {
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError(t`Authentication error: No admin privileges`);
          return;
        }
        throw new Error('Failed to fetch bans');
      }

      const data = await response.json();
      setBans(data.bans || []);
    } catch {
      setError(t`Failed to fetch ban list`);
    } finally {
      setIsLoading(false);
    }
  }, [authHeader]);

  const updateReportStatus = useCallback(
    async (reportId: string, status: Report['status']): Promise<boolean> => {
      try {
        const response = await fetch(`/api/admin/reports/${reportId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
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
    [authHeader]
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
            Authorization: authHeader,
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
    [authHeader, fetchBans]
  );

  const unbanUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/admin/bans/${userId}`, {
          method: 'DELETE',
          headers: {
            Authorization: authHeader,
          },
        });

        if (!response.ok) return false;

        setBans((prev) => prev.filter((b) => b.userId !== userId));
        return true;
      } catch {
        return false;
      }
    },
    [authHeader]
  );

  useEffect(() => {
    if (username && password) {
      fetchReports();
      fetchBans();
    }
  }, [username, password, fetchReports, fetchBans]);

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
