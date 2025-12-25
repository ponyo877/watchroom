import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from './roomStore';

describe('roomStore', () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
  });

  it('should have correct initial state', () => {
    const state = useRoomStore.getState();
    expect(state.room).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.currentVideo).toBeNull();
    expect(state.chatMessages).toEqual([]);
    expect(state.reactions).toEqual([]);
    expect(state.isConnected).toBe(false);
    expect(state.isCreator).toBe(false);
    expect(state.hasControlPermission).toBe(false);
  });

  it('should set room', () => {
    const room = { id: 'room-1', name: 'Test Room', hasPassword: false };
    useRoomStore.getState().setRoom(room);
    expect(useRoomStore.getState().room).toEqual(room);
  });

  it('should add and remove members', () => {
    const member = {
      id: 'user-1',
      name: 'TestUser',
      iconUrl: '',
      isCreator: false,
    };

    useRoomStore.getState().addMember(member);
    expect(useRoomStore.getState().members).toHaveLength(1);
    expect(useRoomStore.getState().members[0]).toEqual(member);

    useRoomStore.getState().removeMember('user-1');
    expect(useRoomStore.getState().members).toHaveLength(0);
  });

  it('should not duplicate members with same id', () => {
    const member = {
      id: 'user-1',
      name: 'TestUser',
      iconUrl: '',
      isCreator: false,
    };

    useRoomStore.getState().addMember(member);
    useRoomStore.getState().addMember({ ...member, name: 'UpdatedName' });
    expect(useRoomStore.getState().members).toHaveLength(1);
    expect(useRoomStore.getState().members[0].name).toBe('UpdatedName');
  });

  it('should add chat messages with limit', () => {
    const store = useRoomStore.getState();

    for (let i = 0; i < 105; i++) {
      store.addChatMessage({
        id: `msg-${i}`,
        senderId: 'user-1',
        senderName: 'Test',
        text: `Message ${i}`,
        timestamp: Date.now(),
      });
    }

    expect(useRoomStore.getState().chatMessages).toHaveLength(100);
  });

  it('should set playback state', () => {
    useRoomStore.getState().setPlaybackState({
      isPlaying: true,
      currentTime: 120,
    });

    const state = useRoomStore.getState();
    expect(state.playbackState.isPlaying).toBe(true);
    expect(state.playbackState.currentTime).toBe(120);
    expect(state.playbackState.playbackRate).toBe(1); // unchanged
  });

  it('should add and remove reactions', () => {
    const reaction = {
      id: 'reaction-1',
      userId: 'user-1',
      emoji: '👍',
      x: 50,
      y: 50,
    };

    useRoomStore.getState().addReaction(reaction);
    expect(useRoomStore.getState().reactions).toHaveLength(1);

    useRoomStore.getState().removeReaction('reaction-1');
    expect(useRoomStore.getState().reactions).toHaveLength(0);
  });

  it('should reset to initial state', () => {
    useRoomStore.getState().setRoom({ id: '1', name: 'Test', hasPassword: false });
    useRoomStore.getState().setIsConnected(true);
    useRoomStore.getState().setIsCreator(true);

    useRoomStore.getState().reset();

    const state = useRoomStore.getState();
    expect(state.room).toBeNull();
    expect(state.isConnected).toBe(false);
    expect(state.isCreator).toBe(false);
  });
});
