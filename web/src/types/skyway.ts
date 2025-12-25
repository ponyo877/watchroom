export interface RoomMetadata {
  name: string;
  creatorId: string;
  hasPassword: boolean;
  currentVideo: VideoInfo | null;
  playbackState: PlaybackState;
  permissionMode: 'creator' | 'specific' | 'all';
  allowedUserIds: string[];
  playHistory: VideoHistoryItem[];
}

export interface MemberMetadata {
  id: string;
  name: string;
  iconUrl: string;
  isCreator: boolean;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
}

export interface VideoHistoryItem extends VideoInfo {
  playedAt: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  lastUpdated: number;
}
