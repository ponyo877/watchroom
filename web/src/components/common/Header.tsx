import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, User } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import ThemeToggle from './ThemeToggle';
import UserSettings from '@/components/user/UserSettings';

interface HeaderProps {
  onCreateRoom?: () => void;
}

export default function Header({ onCreateRoom }: HeaderProps) {
  const userName = useUserStore((state) => state.name);
  const userIconUrl = useUserStore((state) => state.iconUrl);
  const [showUserSettings, setShowUserSettings] = useState(false);

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">
            WatchRoom
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setShowUserSettings(true)}
              className="flex items-center gap-2 p-1 hover:bg-accent rounded-md"
              title="ユーザー設定"
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
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">部屋を作成</span>
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
