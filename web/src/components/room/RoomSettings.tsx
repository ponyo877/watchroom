import { Settings, X, Users, Crown, Lock, UserCheck, UserX } from 'lucide-react';
import type { MemberMetadata } from '@/types/skyway';

type PermissionMode = 'creator' | 'specific' | 'all';

interface RoomSettingsProps {
  open: boolean;
  onClose: () => void;
  isCreator: boolean;
  hasPassword: boolean;
  permissionMode: PermissionMode;
  allowedUserIds: string[];
  members: MemberMetadata[];
  currentUserId: string;
  onPermissionModeChange: (mode: PermissionMode) => void;
  onGrantPermission: (userId: string) => void;
  onRevokePermission: (userId: string) => void;
  onOpenPasswordSettings: () => void;
}

const PERMISSION_MODE_LABELS: Record<PermissionMode, { label: string; description: string }> = {
  creator: {
    label: '作成者のみ',
    description: '部屋の作成者だけが操作できます',
  },
  specific: {
    label: '指定メンバー',
    description: '選択したメンバーが操作できます',
  },
  all: {
    label: '全員',
    description: '全員が操作できます',
  },
};

export default function RoomSettings({
  open,
  onClose,
  isCreator,
  hasPassword,
  permissionMode,
  allowedUserIds,
  members,
  currentUserId,
  onPermissionModeChange,
  onGrantPermission,
  onRevokePermission,
  onOpenPasswordSettings,
}: RoomSettingsProps) {
  if (!open) return null;

  const nonCreatorMembers = members.filter((m) => !m.isCreator);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="font-semibold">部屋設定</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Password Section */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              パスワード
            </h3>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">
                {hasPassword ? 'パスワードが設定されています' : 'パスワードなし（公開）'}
              </span>
              {isCreator && (
                <button
                  onClick={onOpenPasswordSettings}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
                >
                  {hasPassword ? '変更' : '設定'}
                </button>
              )}
            </div>
          </section>

          {/* Permission Mode Section */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              操作権限
            </h3>
            <div className="space-y-2">
              {(Object.entries(PERMISSION_MODE_LABELS) as [PermissionMode, { label: string; description: string }][]).map(
                ([mode, { label, description }]) => (
                  <button
                    key={mode}
                    onClick={() => isCreator && onPermissionModeChange(mode)}
                    disabled={!isCreator}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      permissionMode === mode
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted hover:bg-accent'
                    } ${!isCreator ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </button>
                )
              )}
            </div>
          </section>

          {/* Member Permissions (when specific mode) */}
          {permissionMode === 'specific' && (
            <section>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                メンバー権限
              </h3>
              {nonCreatorMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  他のメンバーがいません
                </p>
              ) : (
                <div className="space-y-2">
                  {nonCreatorMembers.map((member) => {
                    const hasPermission = allowedUserIds.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                            {member.iconUrl ? (
                              <img
                                src={member.iconUrl}
                                alt={member.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium">
                            {member.name}
                            {member.id === currentUserId && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (あなた)
                              </span>
                            )}
                          </span>
                        </div>
                        {isCreator && (
                          <button
                            onClick={() =>
                              hasPermission
                                ? onRevokePermission(member.id)
                                : onGrantPermission(member.id)
                            }
                            className={`p-2 rounded-md ${
                              hasPermission
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20'
                            }`}
                          >
                            {hasPermission ? (
                              <UserCheck className="h-4 w-4" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-muted rounded-md hover:bg-accent"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
