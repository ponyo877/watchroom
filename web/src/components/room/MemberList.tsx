import { useState } from 'react';
import { Crown, User, MoreVertical, UserMinus, Ban, Shield } from 'lucide-react';
import { Trans, t, plural } from '@lingui/macro';
import type { MemberMetadata } from '@/types/skyway';

interface MemberListProps {
  members: MemberMetadata[];
  currentUserId: string;
  isCreator?: boolean;
  onKick?: (userId: string) => void;
  onBan?: (userId: string, reason: string) => void;
  onGrantPermission?: (userId: string) => void;
  onRevokePermission?: (userId: string) => void;
  allowedUserIds?: string[];
}

export default function MemberList({
  members,
  currentUserId,
  isCreator = false,
  onKick,
  onBan,
  onGrantPermission,
  onRevokePermission,
  allowedUserIds = [],
}: MemberListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [banDialogUserId, setBanDialogUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');

  const handleBan = () => {
    if (banDialogUserId && banReason && onBan) {
      onBan(banDialogUserId, banReason);
      setBanDialogUserId(null);
      setBanReason('');
    }
  };

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-3">
        {plural(members.length, {
          one: '# Member',
          other: '# Members',
        })}
      </h3>
      <div className="space-y-2">
        {members.map((member, index) => {
          const isCurrentUser = member.id === currentUserId;
          const hasPermission = allowedUserIds.includes(member.id);

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 group transition-all duration-200 animate-fade-in opacity-0"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="relative">
                <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ${member.isCreator ? 'ring-yellow-500/50' : 'ring-border/50'} transition-all duration-200 group-hover:ring-primary/50`}>
                  {member.iconUrl ? (
                    <img
                      src={member.iconUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {/* Online status indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="truncate text-sm block">
                  {member.name}
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground ml-1">
                      <Trans>(you)</Trans>
                    </span>
                  )}
                </span>
                {hasPermission && !member.isCreator && (
                  <span className="text-xs text-primary"><Trans>Has control permission</Trans></span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {member.isCreator && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}

                {isCreator && !isCurrentUser && !member.isCreator && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === member.id ? null : member.id)
                      }
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {openMenuId === member.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg z-50 py-1 min-w-40">
                          {hasPermission ? (
                            <button
                              onClick={() => {
                                onRevokePermission?.(member.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                            >
                              <Shield className="h-4 w-4" />
                              <Trans>Revoke permission</Trans>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onGrantPermission?.(member.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                            >
                              <Shield className="h-4 w-4" />
                              <Trans>Grant permission</Trans>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onKick?.(member.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-accent"
                          >
                            <UserMinus className="h-4 w-4" />
                            <Trans>Kick</Trans>
                          </button>
                          <button
                            onClick={() => {
                              setBanDialogUserId(member.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                          >
                            <Ban className="h-4 w-4" />
                            <Trans>Ban</Trans>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {banDialogUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setBanDialogUserId(null)}
          />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              <Trans>Ban User</Trans>
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                <Trans>Ban Reason</Trans> <span className="text-destructive">*</span>
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t`Enter ban reason`}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBanDialogUserId(null)}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                <Trans>Cancel</Trans>
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim()}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                <Trans>Ban</Trans>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
