import { Settings, Users, Crown, Lock, UserCheck, UserX } from 'lucide-react';
import { Trans, t } from '@lingui/macro';
import type { MemberMetadata } from '@/types/skyway';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';

type PermissionMode = 'creator' | 'specific' | 'all';

interface RoomSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function getPermissionModeLabels(): Record<PermissionMode, { label: string; description: string }> {
  return {
    creator: {
      label: t`Creator only`,
      description: t`Only the room creator can control`,
    },
    specific: {
      label: t`Specific members`,
      description: t`Selected members can control`,
    },
    all: {
      label: t`Everyone`,
      description: t`Everyone can control`,
    },
  };
}

export default function RoomSettings({
  open,
  onOpenChange,
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
  const nonCreatorMembers = members.filter((m) => !m.isCreator);
  const permissionModeLabels = getPermissionModeLabels();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader icon={<Settings className="h-5 w-5 text-muted-foreground" />}>
          <DialogTitle><Trans>Room Settings</Trans></DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 -mx-6 px-6">
          {/* Password Section */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <Trans>Password</Trans>
            </h3>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <span className="text-sm">
                {hasPassword ? <Trans>Password is set</Trans> : <Trans>No password (public)</Trans>}
              </span>
              {isCreator && (
                <button
                  onClick={onOpenPasswordSettings}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  {hasPassword ? <Trans>Change</Trans> : <Trans>Set</Trans>}
                </button>
              )}
            </div>
          </section>

          {/* Permission Mode Section */}
          <section>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <Trans>Control Permissions</Trans>
            </h3>
            <div className="space-y-2">
              {(Object.entries(permissionModeLabels) as [PermissionMode, { label: string; description: string }][]).map(
                ([mode, { label, description }]) => (
                  <button
                    key={mode}
                    onClick={() => isCreator && onPermissionModeChange(mode)}
                    disabled={!isCreator}
                    className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                      permissionMode === mode
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/50 hover:bg-accent/50 border-2 border-transparent'
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
                <Trans>Member Permissions</Trans>
              </h3>
              {nonCreatorMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  <Trans>No other members</Trans>
                </p>
              ) : (
                <div className="space-y-2">
                  {nonCreatorMembers.map((member) => {
                    const hasPermission = allowedUserIds.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
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
                                <Trans>(you)</Trans>
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
                            className={`p-2 rounded-lg transition-colors ${
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

        <DialogFooter className="mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Trans>Close</Trans>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
