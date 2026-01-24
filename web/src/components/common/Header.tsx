import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, User, Search, X } from 'lucide-react';
import { t } from '@lingui/macro';
import { useUserStore } from '@/stores/userStore';
import { useLanguage } from '@/i18n/useLanguage';
import ThemeToggle from './ThemeToggle';
import UserSettings from '@/components/user/UserSettings';
import { Input } from '@/components/ui/Input';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  onCreateRoom?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Header({ onCreateRoom, searchQuery, onSearchChange }: HeaderProps) {
  const userName = useUserStore((state) => state.name);
  const userIconUrl = useUserStore((state) => state.iconUrl);
  const { getHomePath } = useLanguage();
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl backdrop-saturate-150 border-b border-border/50 shadow-sm pt-safe">
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex h-14 md:h-16 items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <Link to={getHomePath()} className="md:hover:opacity-80 transition-opacity duration-200 flex-shrink-0 touch-feedback">
              <img src="/logo.svg" alt="WatchRoom" className="h-8 md:h-13 logo-light" />
              <img src="/logo-dark.svg" alt="WatchRoom" className="h-8 md:h-13 logo-dark" />
            </Link>

            {/* Desktop Search Bar */}
            {onSearchChange && (
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t`Search rooms...`}
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                  data-testid="room-search-input"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Mobile Search Toggle */}
            {onSearchChange && (
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="p-2 rounded-lg sm:hidden active:scale-95 md:hover:bg-accent touch-feedback"
                aria-label={t`Search`}
              >
                {showMobileSearch ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            )}

            <button
              onClick={() => setShowUserSettings(true)}
              className="flex items-center gap-2 p-1.5 md:px-2 md:py-1.5 rounded-lg transition-colors duration-200 active:scale-95 md:hover:bg-accent touch-feedback"
              title={t`User settings`}
              data-testid="account-button"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {userIconUrl ? (
                  <img
                    src={userIconUrl}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground hidden md:inline">
                {userName}
              </span>
            </button>

            <ThemeToggle />
            <LanguageSwitcher />

            {onCreateRoom && (
              <button
                onClick={onCreateRoom}
                className="flex items-center gap-2 px-2.5 md:px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg shadow-primary/25 md:hover:shadow-xl md:hover:shadow-primary/30 md:hover:scale-105 active:scale-95 transition-all duration-200 touch-feedback"
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden md:inline">NewRoom</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Expanded */}
        {showMobileSearch && onSearchChange && (
          <div className="pb-3 sm:hidden animate-fade-in-down">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder={t`Search rooms...`}
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-full"
                autoFocus
                data-testid="room-search-input-mobile"
              />
            </div>
          </div>
        )}
      </div>

      <UserSettings
        open={showUserSettings}
        onClose={() => setShowUserSettings(false)}
      />
    </header>
  );
}
