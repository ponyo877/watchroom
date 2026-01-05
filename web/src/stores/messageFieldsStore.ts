import { create } from 'zustand';
import { LamportClock, VectorClockManager, type BaseMessageFields } from '@/types/message';

interface MessageFieldsState {
  // Distributed system state
  lamportClock: LamportClock;
  vectorClock: VectorClockManager | null;
  sequenceNumber: number;
  viewNumber: number;

  // Actions
  initialize: (userId: string) => void;
  createMessageFields: (senderId: string) => BaseMessageFields;
  updateOnReceive: (receivedLogicalClock: number, receivedVectorClock: Record<string, number>) => void;
  incrementSequence: () => number;
  setViewNumber: (viewNumber: number) => void;
  reset: () => void;
}

export const useMessageFieldsStore = create<MessageFieldsState>()((set, get) => ({
  lamportClock: new LamportClock(),
  vectorClock: null,
  sequenceNumber: 0,
  viewNumber: 0,

  initialize: (userId: string) => {
    const state = get();
    if (!state.vectorClock) {
      set({
        vectorClock: new VectorClockManager(userId),
        sequenceNumber: 0,
        viewNumber: 0,
      });
    }
  },

  createMessageFields: (senderId: string): BaseMessageFields => {
    const state = get();
    const newSequence = state.sequenceNumber + 1;
    set({ sequenceNumber: newSequence });

    return {
      senderId,
      timestamp: Date.now(),
      logicalClock: state.lamportClock.increment(),
      vectorClock: state.vectorClock?.increment() ?? {},
      sequenceNumber: newSequence,
      viewNumber: state.viewNumber,
    };
  },

  updateOnReceive: (receivedLogicalClock: number, receivedVectorClock: Record<string, number>) => {
    const state = get();
    state.lamportClock.update(receivedLogicalClock);
    state.vectorClock?.merge(receivedVectorClock);
  },

  incrementSequence: () => {
    const state = get();
    const newSequence = state.sequenceNumber + 1;
    set({ sequenceNumber: newSequence });
    return newSequence;
  },

  setViewNumber: (viewNumber: number) => {
    set({ viewNumber });
  },

  reset: () => {
    set({
      lamportClock: new LamportClock(),
      vectorClock: null,
      sequenceNumber: 0,
      viewNumber: 0,
    });
  },
}));
