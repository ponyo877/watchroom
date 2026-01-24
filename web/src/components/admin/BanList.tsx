import { useState } from 'react';
import { Ban, UserX, Globe, Home, Trash2, Plus } from 'lucide-react';
import { t } from '@lingui/macro';
import { formatRelativeTime } from '@/lib/utils';
import type { BannedUser } from '@/hooks/useAdmin';

interface BanListProps {
  bans: BannedUser[];
  onUnban: (banId: string) => Promise<boolean>;
  onBanUser: (
    userId: string,
    reason: string,
    options?: { isGlobal?: boolean; expiresAt?: string }
  ) => Promise<boolean>;
}

export default function BanList({ bans, onUnban, onBanUser }: BanListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBan, setNewBan] = useState({
    userId: '',
    reason: '',
    isGlobal: true,
    duration: 'permanent',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleUnban = async (banId: string) => {
    setActionLoading(banId);
    try {
      await onUnban(banId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddBan = async () => {
    if (!newBan.userId || !newBan.reason) return;

    setActionLoading('new');
    try {
      let expiresAt: string | undefined;
      if (newBan.duration !== 'permanent') {
        const now = new Date();
        if (newBan.duration === '1day') {
          now.setDate(now.getDate() + 1);
        } else if (newBan.duration === '1week') {
          now.setDate(now.getDate() + 7);
        } else if (newBan.duration === '1month') {
          now.setMonth(now.getMonth() + 1);
        }
        expiresAt = now.toISOString();
      }

      const success = await onBanUser(newBan.userId, newBan.reason, {
        isGlobal: newBan.isGlobal,
        expiresAt,
      });

      if (success) {
        setNewBan({ userId: '', reason: '', isGlobal: true, duration: 'permanent' });
        setShowAddForm(false);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h3 className="font-medium">{t`Ban List`} ({bans.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-destructive text-white rounded-md hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t`Ban user`}
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 bg-muted/50 border-b border-border">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t`User ID`} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={newBan.userId}
                onChange={(e) =>
                  setNewBan((prev) => ({ ...prev, userId: e.target.value }))
                }
                placeholder={t`Enter user ID`}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t`Reason`} <span className="text-destructive">*</span>
              </label>
              <textarea
                value={newBan.reason}
                onChange={(e) =>
                  setNewBan((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder={t`Enter ban reason`}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t`Type`}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNewBan((prev) => ({ ...prev, isGlobal: true }))
                    }
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border ${
                      newBan.isGlobal
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    {t`Global`}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewBan((prev) => ({ ...prev, isGlobal: false }))
                    }
                    className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border ${
                      !newBan.isGlobal
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border'
                    }`}
                  >
                    <Home className="h-4 w-4" />
                    {t`Room only`}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t`Duration`}</label>
                <select
                  value={newBan.duration}
                  onChange={(e) =>
                    setNewBan((prev) => ({ ...prev, duration: e.target.value }))
                  }
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="1day">{t`1 day`}</option>
                  <option value="1week">{t`1 week`}</option>
                  <option value="1month">{t`1 month`}</option>
                  <option value="permanent">{t`Permanent`}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddBan}
                disabled={!newBan.userId || !newBan.reason || actionLoading === 'new'}
                className="px-4 py-2 bg-destructive text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === 'new' ? t`Processing...` : t`Ban`}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                {t`Cancel`}
              </button>
            </div>
          </div>
        </div>
      )}

      {bans.length === 0 ? (
        <div className="p-8 text-center">
          <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t`No banned users`}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bans.map((ban) => (
            <div key={ban.id} className="p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <Ban className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{ban.userName}</span>
                    {ban.isGlobal ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                        <Globe className="h-3 w-3" />
                        {t`Global`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
                        <Home className="h-3 w-3" />
                        {t`Room only`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t`Reason`}: {ban.reason}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t`Banned`} {formatRelativeTime(new Date(ban.bannedAt))}
                    {ban.expiresAt && (
                      <> | {t`until`} {new Date(ban.expiresAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleUnban(ban.id)}
                disabled={actionLoading === ban.id}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                title={t`Remove ban`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
