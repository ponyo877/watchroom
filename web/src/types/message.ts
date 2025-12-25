export interface SyncMessage {
  type: 'sync';
  action: 'play' | 'pause' | 'seek' | 'rate' | 'video';
  payload: {
    currentTime?: number;
    playbackRate?: number;
    videoId?: string;
    title?: string;
    thumbnail?: string;
  };
  senderId: string;
  timestamp: number;
}

export interface ChatMessage {
  type: 'chat';
  payload: {
    messageId: string;
    text: string;
    senderName: string;
    senderIconUrl: string;
  };
  senderId: string;
  timestamp: number;
}

export interface ReactionMessage {
  type: 'reaction';
  payload: {
    emoji: string;
  };
  senderId: string;
  timestamp: number;
}

export interface PermissionMessage {
  type: 'permission';
  payload: {
    mode: 'creator' | 'specific' | 'all';
    allowedUserIds?: string[];
    targetUserId?: string;
    granted?: boolean;
  };
  senderId: string;
  timestamp: number;
}

export interface ModerationMessage {
  type: 'moderation';
  payload: {
    action: 'kick' | 'ban';
    targetUserId: string;
    reason?: string;
  };
  senderId: string;
  timestamp: number;
}

export type DataStreamMessage =
  | SyncMessage
  | ChatMessage
  | ReactionMessage
  | PermissionMessage
  | ModerationMessage;
