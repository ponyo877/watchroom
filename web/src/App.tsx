import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useUIStore } from '@/stores/uiStore';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { LanguageWrapper } from '@/i18n/LanguageWrapper';
import HomePage from '@/pages/HomePage';
import RoomPage from '@/pages/RoomPage';
import AdminPage from '@/pages/AdminPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import NotFoundPage from '@/pages/NotFoundPage';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return <>{children}</>;
}

function App() {
  const initialize = useUserStore((state) => state.initialize);

  // Initialize viewport height for mobile browsers (URL bar handling)
  useViewportHeight();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Japanese (default) */}
          <Route path="/" element={<LanguageWrapper lang="ja"><HomePage /></LanguageWrapper>} />
          <Route path="/room/:roomId" element={<LanguageWrapper lang="ja"><RoomPage /></LanguageWrapper>} />
          <Route path="/r/:shortId" element={<LanguageWrapper lang="ja"><RoomPage /></LanguageWrapper>} />
          <Route path="/admin" element={<LanguageWrapper lang="ja"><AdminPage /></LanguageWrapper>} />
          <Route path="/terms" element={<LanguageWrapper lang="ja"><TermsPage /></LanguageWrapper>} />
          <Route path="/privacy" element={<LanguageWrapper lang="ja"><PrivacyPage /></LanguageWrapper>} />

          {/* English */}
          <Route path="/en" element={<LanguageWrapper lang="en"><HomePage /></LanguageWrapper>} />
          <Route path="/en/room/:roomId" element={<LanguageWrapper lang="en"><RoomPage /></LanguageWrapper>} />
          <Route path="/en/r/:shortId" element={<LanguageWrapper lang="en"><RoomPage /></LanguageWrapper>} />
          <Route path="/en/admin" element={<LanguageWrapper lang="en"><AdminPage /></LanguageWrapper>} />
          <Route path="/en/terms" element={<LanguageWrapper lang="en"><TermsPage /></LanguageWrapper>} />
          <Route path="/en/privacy" element={<LanguageWrapper lang="en"><PrivacyPage /></LanguageWrapper>} />

          <Route path="*" element={<LanguageWrapper lang="ja"><NotFoundPage /></LanguageWrapper>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
