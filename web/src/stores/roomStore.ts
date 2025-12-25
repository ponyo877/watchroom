import { create } from 'zustand';
import type { Room, ChatMessageItem, ReactionItem } from '@/types/room';
import type { MemberMetadata, VideoInfo, PlaybackState } from '@/types/skyway';

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

  setRoom: (room) => set({ room }),
  setMembers: (members) => set({ members }),
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
    set((state) => ({
      chatMessages: [...state.chatMessages, message].slice(-100),
    })),
  addReaction: (reaction) =>
    set((state) => ({
      reactions: [...state.reactions, reaction],
    })),
  removeReaction: (reactionId) =>
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== reactionId),
    })),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsCreator: (isCreator) => set({ isCreator }),
  setHasControlPermission: (hasPermission) =>
    set({ hasControlPermission: hasPermission }),
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
    }),
}));
