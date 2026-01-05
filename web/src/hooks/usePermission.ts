import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useUserStore } from '@/stores/userStore';
import { useMessageFieldsStore } from '@/stores/messageFieldsStore';
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
  const createMessageFields = useMessageFieldsStore((state) => state.createMessageFields);
  const updateOnReceive = useMessageFieldsStore((state) => state.updateOnReceive);

  const [permissionMode, setPermissionMode] = useState<PermissionMode>('creator');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);

  // Compute permission during render (not in Effect)
  const computedPermission = useMemo(() => {
    if (isCreator) return true;
    switch (permissionMode) {
      case 'creator':
        return false;
      case 'specific':
        return allowedUserIds.includes(userId);
      case 'all':
        return true;
      default:
        return false;
    }
  }, [permissionMode, isCreator, allowedUserIds, userId]);

  // Sync computed value to store (external system sync)
  useEffect(() => {
    setHasControlPermission(computedPermission);
  }, [computedPermission, setHasControlPermission]);

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
        ...createMessageFields(userId),
      };
      onSendPermission(message);
    },
    [isCreator, userId, allowedUserIds, onSendPermission, createMessageFields]
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
        ...createMessageFields(userId),
      };
      onSendPermission(message);
    },
    [isCreator, userId, allowedUserIds, onSendPermission, createMessageFields]
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
        ...createMessageFields(userId),
      };
      onSendPermission(message);
    },
    [isCreator, userId, allowedUserIds, onSendPermission, createMessageFields]
  );

  const handleIncomingPermission = useCallback(
    (message: PermissionMessage) => {
      const { payload } = message;

      // Update distributed system clocks
      updateOnReceive(message.logicalClock, message.vectorClock);

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
    [userId, setHasControlPermission, updateOnReceive]
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
