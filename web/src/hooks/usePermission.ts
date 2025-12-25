import { useCallback, useEffect, useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import type { PermissionMessage } from '@/types/message';

type PermissionMode = 'creator' | 'specific' | 'all';

interface UsePermissionOptions {
  onSendPermission: (message: PermissionMessage) => void;
}

export function usePermission({ onSendPermission }: UsePermissionOptions) {
  const userId = useUserStore((state) => state.id);
  const {
    isCreator,
    hasControlPermission,
    setHasControlPermission,
    members,
  } = useRoomStore();

  const [permissionMode, setPermissionMode] = useState<PermissionMode>('creator');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);

  // Update permission based on mode changes
  useEffect(() => {
    if (isCreator) {
      setHasControlPermission(true);
      return;
    }

    switch (permissionMode) {
      case 'creator':
        setHasControlPermission(false);
        break;
      case 'specific':
        setHasControlPermission(allowedUserIds.includes(userId));
        break;
      case 'all':
        setHasControlPermission(true);
        break;
    }
  }, [permissionMode, allowedUserIds, userId, isCreator, setHasControlPermission]);

  const changePermissionMode = useCallback(
    (mode: PermissionMode) => {
      if (!isCreator) return;

      setPermissionMode(mode);

      const message: PermissionMessage = {
        type: 'permission',
        payload: {
          mode,
          allowedUserIds: mode === 'specific' ? allowedUserIds : undefined,
        },
        senderId: userId,
        timestamp: Date.now(),
      };
      onSendPermission(message);
    },
    [isCreator, userId, allowedUserIds, onSendPermission]
  );

  const grantPermission = useCallback(
    (targetUserId: string) => {
      if (!isCreator) return;

      const newAllowedIds = [...new Set([...allowedUserIds, targetUserId])];
      setAllowedUserIds(newAllowedIds);

      const message: PermissionMessage = {
        type: 'permission',
        payload: {
          mode: 'specific',
          targetUserId,
          granted: true,
          allowedUserIds: newAllowedIds,
        },
        senderId: userId,
        timestamp: Date.now(),
      };
      onSendPermission(message);
    },
    [isCreator, userId, allowedUserIds, onSendPermission]
  );

  const revokePermission = useCallback(
    (targetUserId: string) => {
      if (!isCreator) return;

      const newAllowedIds = allowedUserIds.filter((id) => id !== targetUserId);
      setAllowedUserIds(newAllowedIds);

      const message: PermissionMessage = {
        type: 'permission',
        payload: {
          mode: 'specific',
          targetUserId,
          granted: false,
          allowedUserIds: newAllowedIds,
        },
        senderId: userId,
        timestamp: Date.now(),
      };
      onSendPermission(message);
    },
    [isCreator, userId, allowedUserIds, onSendPermission]
  );

  const handleIncomingPermission = useCallback(
    (message: PermissionMessage) => {
      const { payload } = message;

      if (payload.mode) {
        setPermissionMode(payload.mode);
      }

      if (payload.allowedUserIds) {
        setAllowedUserIds(payload.allowedUserIds);
      }

      // Update own permission
      if (payload.targetUserId === userId && payload.granted !== undefined) {
        setHasControlPermission(payload.granted);
      }
    },
    [userId, setHasControlPermission]
  );

  const getMemberPermission = useCallback(
    (memberId: string): boolean => {
      if (members.find((m) => m.id === memberId)?.isCreator) {
        return true;
      }

      switch (permissionMode) {
        case 'creator':
          return false;
        case 'specific':
          return allowedUserIds.includes(memberId);
        case 'all':
          return true;
        default:
          return false;
      }
    },
    [members, permissionMode, allowedUserIds]
  );

  return {
    permissionMode,
    allowedUserIds,
    hasControlPermission,
    isCreator,
    changePermissionMode,
    grantPermission,
    revokePermission,
    handleIncomingPermission,
    getMemberPermission,
  };
}
