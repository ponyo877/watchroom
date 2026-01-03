import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, User, Search } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import ThemeToggle from './ThemeToggle';
import UserSettings from '@/components/user/UserSettings';
import { Input } from '@/components/ui/Input';

interface HeaderProps {
  onCreateRoom?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Header({ onCreateRoom, searchQuery, onSearchChange }: HeaderProps) {
  const userName = useUserStore((state) => state.name);
  const userIconUrl = useUserStore((state) => state.iconUrl);
  const [showUserSettings, setShowUserSettings] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl backdrop-saturate-150 border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link to="/" className="hover:opacity-80 transition-opacity duration-200 flex-shrink-0">
              <img src="/logo.svg" alt="WatchRoom" className="h-13" />
            </Link>

            {/* Search Bar - shown only when onSearchChange is provided */}
            {onSearchChange && (
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="部屋を検索..."
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                  data-testid="room-search-input"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setShowUserSettings(true)}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-lg transition-colors duration-200"
              title="ユーザー設定"
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

            {onCreateRoom && (
              <button
                onClick={onCreateRoom}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden md:inline">NewRoom</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <UserSettings
        open={showUserSettings}
        onClose={() => setShowUserSettings(false)}
      />
    </header>
  );
}
