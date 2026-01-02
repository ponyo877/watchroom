import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/lib/utils';
import { getRandomChampionName } from '@/lib/champions';

interface UserState {
  id: string;
  name: string;
  iconUrl: string;
  setName: (name: string) => void;
  setIconUrl: (url: string) => void;
  initialize: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      id: '',
      name: '',
      iconUrl: '',
      setName: (name) => set({ name }),
      setIconUrl: (url) => set({ iconUrl: url }),
      initialize: () => {
        const state = get();
        if (!state.id) {
          const id = generateId();
          set({
            id,
            name: getRandomChampionName(),
          });
        }
      },
    }),
    {
      name: 'user-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initialize();
        }
      },
    }
  )
);
