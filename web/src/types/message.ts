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

// State Request Protocol - for late joiners to request current playback state
export interface StateRequestMessage {
  type: 'state_request';
  payload: {
    requestId: string;
  };
  senderId: string;
  timestamp: number;
}

export interface StateResponseMessage {
  type: 'state_response';
  payload: {
    requestId: string;
    videoId: string | null;
    title?: string;
    thumbnail?: string;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    responderId: string;
    responderTime: number; // timestamp when this response was created
  };
  senderId: string;
  timestamp: number;
}

// Heartbeat - periodic state broadcast from controller
export interface HeartbeatMessage {
  type: 'heartbeat';
  payload: {
    videoId: string | null;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
  };
  senderId: string;
  timestamp: number;
}

export type DataStreamMessage =
  | SyncMessage
  | ChatMessage
  | ReactionMessage
  | PermissionMessage
  | ModerationMessage
  | StateRequestMessage
  | StateResponseMessage
  | HeartbeatMessage;
