import { Link } from 'react-router-dom';
import { Plus, Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';

interface HeaderProps {
  onCreateRoom?: () => void;
}

export default function Header({ onCreateRoom }: HeaderProps) {
  const { theme, setTheme } = useUIStore();
  const userName = useUserStore((state) => state.name);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">
            WatchRoom
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userName}</span>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {onCreateRoom && (
              <button
                onClick={onCreateRoom}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                部屋を作成
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
