import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  isChatOpen: boolean;
  isMemberListOpen: boolean;
  isSettingsOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleChat: () => void;
  toggleMemberList: () => void;
  toggleSettings: () => void;
  setIsChatOpen: (open: boolean) => void;
  setIsMemberListOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      isChatOpen: true,
      isMemberListOpen: false,
      isSettingsOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
      toggleMemberList: () =>
        set((state) => ({ isMemberListOpen: !state.isMemberListOpen })),
      toggleSettings: () =>
        set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      setIsChatOpen: (open) => set({ isChatOpen: open }),
      setIsMemberListOpen: (open) => set({ isMemberListOpen: open }),
      setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
