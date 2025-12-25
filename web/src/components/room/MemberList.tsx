import { useState } from 'react';
import { Crown, User, MoreVertical, UserMinus, Ban, Shield } from 'lucide-react';
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
      <h3 className="font-semibold mb-3">メンバー ({members.length})</h3>
      <div className="space-y-2">
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          const hasPermission = allowedUserIds.includes(member.id);

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent group"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
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
              <div className="flex-1 min-w-0">
                <span className="truncate text-sm block">
                  {member.name}
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (あなた)
                    </span>
                  )}
                </span>
                {hasPermission && !member.isCreator && (
                  <span className="text-xs text-primary">操作権限あり</span>
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
                              操作権限を取消
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
                              操作権限を付与
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
                            キックする
                          </button>
                          <button
                            onClick={() => {
                              setBanDialogUserId(member.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                          >
                            <Ban className="h-4 w-4" />
                            BANする
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
              ユーザーをBANする
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                BAN理由 <span className="text-destructive">*</span>
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="BAN理由を入力してください"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBanDialogUserId(null)}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                キャンセル
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim()}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                BANする
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
