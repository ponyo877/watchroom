import { create } from 'zustand';
import type { Room, ChatMessageItem, ReactionItem } from '@/types/room';
import type { MemberMetadata, VideoInfo, PlaybackState, VideoHistoryItem } from '@/types/skyway';

interface RoomState {
  room: Room | null;
  members: MemberMetadata[];
  currentVideo: VideoInfo | null;
  playbackState: PlaybackState;
  chatMessages: ChatMessageItem[];
  reactions: ReactionItem[];
  isConnected: boolean;
  isCreator: boolean;
  hasControlPermission: boolean;
  permissionMode: 'creator' | 'specific' | 'all';
  allowedUserIds: string[];
  playHistory: VideoHistoryItem[];

  setRoom: (room: Room | null) => void;
  setMembers: (members: MemberMetadata[]) => void;
  addMember: (member: MemberMetadata) => void;
  removeMember: (memberId: string) => void;
  setCurrentVideo: (video: VideoInfo | null) => void;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  addChatMessage: (message: ChatMessageItem) => void;
  addReaction: (reaction: ReactionItem) => void;
  removeReaction: (reactionId: string) => void;
  setIsConnected: (connected: boolean) => void;
  setIsCreator: (isCreator: boolean) => void;
  setHasControlPermission: (hasPermission: boolean) => void;
  setPermissionMode: (mode: 'creator' | 'specific' | 'all') => void;
  setAllowedUserIds: (ids: string[]) => void;
  addAllowedUserId: (id: string) => void;
  removeAllowedUserId: (id: string) => void;
  setPlayHistory: (history: VideoHistoryItem[]) => void;
  addToPlayHistory: (video: VideoHistoryItem) => void;
  removeFromPlayHistory: (videoId: string) => void;
  clearPlayHistory: () => void;
  reset: () => void;
}

const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  lastUpdated: 0,
};

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  members: [],
  currentVideo: null,
  playbackState: initialPlaybackState,
  chatMessages: [],
  reactions: [],
  isConnected: false,
  isCreator: false,
  hasControlPermission: false,
  permissionMode: 'creator',
  allowedUserIds: [],
  playHistory: [],

  setRoom: (room) => set({ room }),
  setMembers: (members) =>
    set({
      members: members.filter(
        (member, index, self) => self.findIndex((m) => m.id === member.id) === index
      ),
    }),
  addMember: (member) =>
    set((state) => ({
      members: [...state.members.filter((m) => m.id !== member.id), member],
    })),
  removeMember: (memberId) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== memberId),
    })),
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setPlaybackState: (newState) =>
    set((state) => ({
      playbackState: { ...state.playbackState, ...newState },
    })),
  addChatMessage: (message) =>
    set((state) => {
      if (state.chatMessages.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        chatMessages: [...state.chatMessages, message].slice(-100),
      };
    }),
  addReaction: (reaction) =>
    set((state) => {
      if (state.reactions.some((r) => r.id === reaction.id)) {
        return state;
      }
      return {
        reactions: [...state.reactions, reaction],
      };
    }),
  removeReaction: (reactionId) =>
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== reactionId),
    })),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsCreator: (isCreator) => set({ isCreator }),
  setHasControlPermission: (hasPermission) =>
    set({ hasControlPermission: hasPermission }),
  setPermissionMode: (mode) => set({ permissionMode: mode }),
  setAllowedUserIds: (ids) => set({ allowedUserIds: ids }),
  addAllowedUserId: (id) =>
    set((state) => ({
      allowedUserIds: [...state.allowedUserIds.filter((i) => i !== id), id],
    })),
  removeAllowedUserId: (id) =>
    set((state) => ({
      allowedUserIds: state.allowedUserIds.filter((i) => i !== id),
    })),
  setPlayHistory: (history) => set({ playHistory: history }),
  addToPlayHistory: (video) =>
    set((state) => ({
      // Remove duplicate if exists, then add to front, limit to 50 items
      playHistory: [
        video,
        ...state.playHistory.filter((v) => v.videoId !== video.videoId),
      ].slice(0, 50),
    })),
  removeFromPlayHistory: (videoId) =>
    set((state) => ({
      playHistory: state.playHistory.filter((v) => v.videoId !== videoId),
    })),
  clearPlayHistory: () => set({ playHistory: [] }),
  reset: () =>
    set({
      room: null,
      members: [],
      currentVideo: null,
      playbackState: initialPlaybackState,
      chatMessages: [],
      reactions: [],
      isConnected: false,
      isCreator: false,
      hasControlPermission: false,
      permissionMode: 'creator',
      allowedUserIds: [],
      playHistory: [],
    }),
}));
