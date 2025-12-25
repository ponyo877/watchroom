import type { VideoInfo, MemberMetadata, PlaybackState } from './skyway';

export interface Room {
  roomId: string;
  name: string;
  creatorId: string;
  creatorName: string;
  creatorIconUrl?: string;
  hasPassword: boolean;
  memberCount: number;
  maxMembers: number;
  currentVideo?: VideoInfo;
  shortId?: string;
}

export interface RoomState {
  room: Room | null;
  members: MemberMetadata[];
  currentVideo: VideoInfo | null;
  playbackState: PlaybackState;
  isConnected: boolean;
  isCreator: boolean;
  hasControlPermission: boolean;
}

export interface ChatMessageItem {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderIconUrl: string;
  timestamp: number;
}

export interface ReactionItem {
  id: string;
  emoji: string;
  senderId: string;
  timestamp: number;
}
